// Step-by-step scenes for the SGEMM kernels, drawn by KernelAnimation.
// Every matrix is a 16 x 16 toy; tile and warp sizes are scaled down with it so the shapes stay
// readable. The counters are a simplified model, not profiler output.

export const SIZE = 16;

export type Where = "A" | "B" | "C" | "As" | "Bs" | "reg";

// read: touched this step. tile: staged or owned for a while. acc: an output being accumulated.
// done: an output that has been written. warp: a warp's share of the block tile.
export type Tone = "read" | "tile" | "acc" | "done" | "warp";

export type Mark = { at: Where; r: number; c: number; h: number; w: number; tone: Tone };

export type Step = { marks: Mark[]; note: string; count: number };

export type Scene = {
  title: string;
  counter: string;
  smem?: { a: [number, number]; b: [number, number]; aLabel?: string };
  reg?: number;
  steps: Step[];
};

const m = (at: Where, r: number, c: number, h: number, w: number, tone: Tone): Mark => ({
  at,
  r,
  c,
  h,
  w,
  tone,
});

// Contiguous runs of one row cost one transaction; that is the whole memory model here.
function naive(): Scene {
  const steps: Step[] = [];
  const WARP = 8;
  let count = 0;
  const done: Mark[] = [];
  for (let col = 0; col < 2; col++) {
    for (let k = 0; k < SIZE; k++) {
      count += WARP + 1;
      steps.push({
        marks: [
          ...done,
          m("C", 0, col, WARP, 1, "acc"),
          m("A", 0, k, WARP, 1, "read"),
          m("B", k, col, 1, 1, "read"),
        ],
        note: `k = ${k}: the warp's threads sit down one column of C, so A is read in ${WARP} different rows.`,
        count,
      });
    }
    done.push(m("C", 0, col, WARP, 1, "done"));
    steps.push({
      marks: [...done],
      note: "Each thread writes its one element of C, and the next warp starts over from k = 0.",
      count,
    });
  }
  return { title: "Naive", counter: "global transactions", steps };
}

function coalesced(): Scene {
  const steps: Step[] = [];
  const WARP = 8;
  let count = 0;
  const done: Mark[] = [];
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < SIZE; k++) {
      count += 2;
      steps.push({
        marks: [
          ...done,
          m("C", row, 0, 1, WARP, "acc"),
          m("A", row, k, 1, 1, "read"),
          m("B", k, 0, 1, WARP, "read"),
        ],
        note: `k = ${k}: the warp runs along a row of C. One A value is broadcast and ${WARP} neighbouring B values arrive together.`,
        count,
      });
    }
    done.push(m("C", row, 0, 1, WARP, "done"));
    steps.push({
      marks: [...done],
      note: "Same arithmetic as the naive kernel, a fraction of the memory transactions.",
      count,
    });
  }
  return { title: "Global memory coalescing", counter: "global transactions", steps };
}

function shared(): Scene {
  const BS = 4;
  const steps: Step[] = [];
  let count = 0;
  const done: Mark[] = [];
  for (let block = 0; block < 2; block++) {
    const c0 = block * BS;
    const own = m("C", 0, c0, BS, BS, "tile");
    for (let kb = 0; kb < SIZE; kb += BS) {
      count += 2 * BS;
      steps.push({
        marks: [
          ...done,
          own,
          m("A", 0, kb, BS, BS, "read"),
          m("B", kb, c0, BS, BS, "read"),
          m("As", 0, 0, BS, BS, "tile"),
          m("Bs", 0, 0, BS, BS, "tile"),
        ],
        note: `Every thread copies one value of A and one of B into shared memory, then waits at __syncthreads().`,
        count,
      });
      for (let d = 0; d < BS; d++) {
        steps.push({
          marks: [
            ...done,
            m("C", 0, c0, BS, BS, "acc"),
            m("A", 0, kb, BS, BS, "tile"),
            m("B", kb, c0, BS, BS, "tile"),
            m("As", 0, 0, BS, BS, "tile"),
            m("Bs", 0, 0, BS, BS, "tile"),
            m("As", 0, d, BS, 1, "read"),
            m("Bs", d, 0, 1, BS, "read"),
          ],
          note: `dotIdx = ${d}: the whole tile of C is updated from shared memory, no trip to global memory.`,
          count,
        });
      }
    }
    done.push(m("C", 0, c0, BS, BS, "done"));
    steps.push({
      marks: [...done],
      note: "The block writes its tile of C and the next block begins.",
      count,
    });
  }
  return {
    title: "Shared memory cache-blocking",
    counter: "global transactions",
    smem: { a: [BS, BS], b: [BS, BS] },
    steps,
  };
}

// Shared by the 1D and 2D blocktiling scenes: a block tile of C, a strip of A and B staged BK at a time.
function blocktiled(opts: {
  title: string;
  BM: number;
  BN: number;
  BK: number;
  TM: number;
  TN: number;
  thread: [number, number];
  vector?: boolean;
}): Scene {
  const { BM, BN, BK, TM, TN, thread, vector } = opts;
  const [tr, tc] = thread;
  const r0 = tr * TM;
  const c0 = tc * TN;
  const steps: Step[] = [];
  let count = 0;
  const staged = [
    m("As", 0, 0, vector ? BK : BM, vector ? BM : BK, "tile"),
    m("Bs", 0, 0, BK, BN, "tile"),
  ];
  for (let kb = 0; kb < SIZE; kb += BK) {
    // Scalar loads cost one per element; float4 loads cost one per four.
    count += vector ? (BM * BK + BK * BN) / 4 : BM * BK + BK * BN;
    steps.push({
      marks: [
        m("C", 0, 0, BM, BN, "tile"),
        m("A", 0, kb, BM, BK, "read"),
        m("B", kb, 0, BK, BN, "read"),
        ...staged,
      ],
      note: vector
        ? "The block loads with float4: four values per instruction, and A is stored transposed in shared memory."
        : `The block stages a ${BM} x ${BK} strip of A and a ${BK} x ${BN} strip of B.`,
      count,
    });
    for (let d = 0; d < BK; d++) {
      const asRead = vector ? m("As", d, r0, 1, TM, "read") : m("As", r0, d, TM, 1, "read");
      steps.push({
        marks: [
          m("C", 0, 0, BM, BN, "tile"),
          m("A", 0, kb, BM, BK, "tile"),
          m("B", kb, 0, BK, BN, "tile"),
          ...staged,
          asRead,
          m("Bs", d, c0, 1, TN, "read"),
          m("reg", 0, 0, 1, TM, "read"),
          m("reg", 0, TM, 1, TN, "read"),
          m("C", r0, c0, TM, TN, "acc"),
        ],
        note:
          TN === 1
            ? `dotIdx = ${d}: one Bs value goes into a register and is reused for all ${TM} results this thread owns.`
            : `dotIdx = ${d}: ${TM} values of As and ${TN} of Bs go into registers; their outer product gives ${TM * TN} results.`,
        count,
      });
    }
  }
  steps.push({
    marks: [m("C", 0, 0, BM, BN, "done")],
    note: "Each thread writes its results, and the whole block tile of C is finished.",
    count,
  });
  return {
    title: opts.title,
    counter: vector ? "global load instructions" : "global loads",
    smem: {
      a: vector ? [BK, BM] : [BM, BK],
      b: [BK, BN],
      aLabel: vector ? "As, transposed" : undefined,
    },
    reg: TM + TN,
    steps,
  };
}

function warptiling(): Scene {
  const BM = 8;
  const BN = 8;
  const BK = 2;
  const WM = 4;
  const WN = 4;
  // One warp owns a 4 x 4 tile; a thread owns four cells spread across it, two apart.
  const warp: [number, number] = [0, 1];
  const wr = warp[0] * WM;
  const wc = warp[1] * WN;
  const cells = [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ].map(([r, c]) => [wr + r, wc + c]);
  const warps = [0, 1].flatMap((i) => [0, 1].map((j) => m("C", i * WM, j * WN, WM, WN, "warp")));
  const steps: Step[] = [];
  let count = 0;
  const staged = [m("As", 0, 0, BM, BK, "tile"), m("Bs", 0, 0, BK, BN, "tile")];
  for (let kb = 0; kb < SIZE; kb += BK) {
    count += (BM * BK + BK * BN) / 4;
    steps.push({
      marks: [
        m("C", 0, 0, BM, BN, "tile"),
        ...warps,
        m("A", 0, kb, BM, BK, "read"),
        m("B", kb, 0, BK, BN, "read"),
        ...staged,
      ],
      note: "The block stages its strips of A and B; each of the four warps then works on its own quarter of C.",
      count,
    });
    for (let d = 0; d < BK; d++) {
      steps.push({
        marks: [
          m("C", 0, 0, BM, BN, "tile"),
          ...warps,
          m("A", 0, kb, BM, BK, "tile"),
          m("B", kb, 0, BK, BN, "tile"),
          ...staged,
          m("As", wr, d, 1, 1, "read"),
          m("As", wr + 2, d, 1, 1, "read"),
          m("Bs", d, wc, 1, 1, "read"),
          m("Bs", d, wc + 2, 1, 1, "read"),
          m("reg", 0, 0, 1, 2, "read"),
          m("reg", 0, 2, 1, 2, "read"),
          ...cells.map(([r, c]) => m("C", r, c, 1, 1, "acc")),
        ],
        note: `dotIdx = ${d}: one thread of the highlighted warp works on four cells spread across the warp's tile.`,
        count,
      });
    }
  }
  steps.push({
    marks: [m("C", 0, 0, BM, BN, "done")],
    note: "All four warps write back, and the block tile of C is done.",
    count,
  });
  return {
    title: "Warptiling",
    counter: "global load instructions",
    smem: { a: [BM, BK], b: [BK, BN] },
    reg: 4,
    steps,
  };
}

export const KERNELS = {
  naive,
  coalesced,
  shared,
  blocktiling1d: () =>
    blocktiled({ title: "1D blocktiling", BM: 8, BN: 4, BK: 2, TM: 4, TN: 1, thread: [1, 2] }),
  blocktiling2d: () =>
    blocktiled({ title: "2D blocktiling", BM: 8, BN: 8, BK: 2, TM: 2, TN: 2, thread: [1, 2] }),
  vectorized: () =>
    blocktiled({
      title: "Vectorized loads",
      BM: 8,
      BN: 8,
      BK: 4,
      TM: 2,
      TN: 2,
      thread: [1, 2],
      vector: true,
    }),
  warptiling,
} satisfies Record<string, () => Scene>;

export type KernelName = keyof typeof KERNELS;
