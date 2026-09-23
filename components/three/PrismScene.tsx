"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { color, spectrum } from "@/lib/tokens";
import { OcclusionField, type Segment } from "@/lib/beam-occlusion";
import { equilateral, traceDispersion, type Vec2 } from "@/lib/prism-optics";
import type { PrismVariation } from "@/lib/session-seed";

const SIDE = 2.4;
const DEPTH = 1.3;
// The light is drawn a little in front of the prism's centre plane, so that seen from the front it
// enters and leaves at the faces the eye reads as the glass surface.
const BEAM_Z = DEPTH * 0.32;
const PRISM_POSITION = new THREE.Vector3(-0.35, 0.05, 0);
// Short enough that the beam begins, faintly, inside the frame rather than being cut by its edge.
const INCOMING_LENGTH = 4.6;
const DEFAULT_EXIT_LENGTH = 12;
// On wide screens the prism's size follows the viewport height exactly as the original 70svh stage
// (clamped 320–736px, framing 5.63 scene units) did, even though the stage itself is now shorter.
const pxPerUnit = () => Math.min(736, Math.max(320, window.innerHeight * 0.7)) / 5.63;
const MIN_VISIBLE_WIDTH_NARROW = 6.8;
const BAND_COLORS = Object.values(spectrum);

// Raw sRGB triplets: the beam shaders skip colour management so tokens land on screen unchanged.
function srgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const beamVertex = /* glsl */ `
  uniform float uSpread;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.y *= mix(1.0, uSpread, uv.x);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uPhase;
  uniform float uFadeIn;
  uniform float uFadeOut;
  uniform float uSoftness;
  uniform float uOccAt;
  uniform float uOccAmount;
  uniform float uOccSoft;
  uniform float uUpstream;
  uniform float uReveal;
  varying vec2 vUv;
  void main() {
    float across = abs(vUv.y - 0.5) * 2.0;
    float profile = exp(-across * across * uSoftness);
    float along = smoothstep(0.0, uFadeIn, vUv.x) * (1.0 - smoothstep(1.0 - uFadeOut, 1.0, vUv.x));
    float shimmer = 1.0 + 0.045 * sin(uTime * 0.8 + uPhase + vUv.x * 5.0)
                        + 0.025 * sin(uTime * 1.9 + uPhase * 2.3 - vUv.x * 11.0);
    // Past the obstruction the beam is shadowed; at its edge a little light scatters.
    float past = smoothstep(uOccAt - uOccSoft, uOccAt + uOccSoft, vUv.x);
    float edge = exp(-pow((vUv.x - uOccAt) / max(uOccSoft, 1e-4), 2.0));
    // Intro: the light's leading edge travels along the beam.
    float shown = 1.0 - smoothstep(uReveal - 0.035, uReveal, vUv.x);
    float lit = (1.0 - uUpstream) * (1.0 - uOccAmount * past) * shown;
    float scatter = max(uOccAmount, 0.0) * 0.35 * edge * (1.0 - uUpstream) * shown;
    gl_FragColor = vec4(uColor, profile * along * uOpacity * shimmer * lit + profile * scatter * uOpacity);
  }
`;

type BeamSpec = {
  from: Vec2;
  to: Vec2;
  width: number;
  color: THREE.Vector3;
  opacity: number;
  spread?: number;
  fadeIn?: number;
  fadeOut?: number;
  softness?: number;
  phase: number;
  // Index into the occlusion field's segments.
  seg: number;
};

function Beam({
  spec,
  geometry,
  materials,
}: {
  spec: BeamSpec;
  geometry: THREE.BufferGeometry;
  materials: Map<THREE.ShaderMaterial, number>;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uColor: { value: spec.color },
          uOpacity: { value: spec.opacity },
          uTime: { value: 0 },
          uPhase: { value: spec.phase },
          uFadeIn: { value: spec.fadeIn ?? 0.001 },
          uFadeOut: { value: spec.fadeOut ?? 0.001 },
          uSpread: { value: spec.spread ?? 1 },
          uSoftness: { value: spec.softness ?? 4 },
          uOccAt: { value: 0.5 },
          uOccAmount: { value: 0 },
          uOccSoft: { value: 0.01 },
          uUpstream: { value: 0 },
          uReveal: { value: 1.1 },
        },
      }),
    [spec],
  );

  useEffect(() => {
    materials.set(material, spec.seg);
    return () => {
      materials.delete(material);
      material.dispose();
    };
  }, [material, materials, spec.seg]);

  const dx = spec.to[0] - spec.from[0];
  const dy = spec.to[1] - spec.from[1];
  return (
    <mesh
      geometry={geometry}
      material={material}
      renderOrder={2}
      position={[(spec.from[0] + spec.to[0]) / 2, (spec.from[1] + spec.to[1]) / 2, BEAM_Z]}
      rotation={[0, 0, Math.atan2(dy, dx)]}
      scale={[Math.hypot(dx, dy), spec.width, 1]}
    />
  );
}

const dustVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uDrift;
  uniform float uPixelRatio;
  uniform vec2 uBeamA;
  uniform vec2 uBeamB;
  attribute float aSeed;
  varying float vLit;
  void main() {
    vec3 p = position;
    float t = uTime * 0.12 * uSpeed;
    p.x += sin(t * (0.6 + aSeed) + aSeed * 40.0) * 0.22 + uDrift * sin(t * 0.21 + aSeed * 7.0) * 0.35;
    p.y += cos(t * (0.5 + aSeed * 0.7) + aSeed * 23.0) * 0.16 - 0.05 * sin(t * 0.13 + aSeed * 3.0);
    p.z += sin(t * 0.4 + aSeed * 11.0) * 0.1;
    vec2 ab = uBeamB - uBeamA;
    float h = clamp(dot(p.xy - uBeamA, ab) / dot(ab, ab), 0.0, 1.0);
    vLit = smoothstep(0.4, 0.0, length(p.xy - uBeamA - ab * h));
    gl_PointSize = (1.3 + aSeed * 1.8) * uPixelRatio * (1.0 + vLit * 0.9);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const dustFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vLit;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * (0.16 + vLit * 0.5);
    gl_FragColor = vec4(uColor, a);
  }
`;

function Dust({
  count,
  variation,
  beam,
  materials,
}: {
  count: number;
  variation: PrismVariation;
  beam: [Vec2, Vec2];
  materials: Map<THREE.ShaderMaterial, number>;
}) {
  const dpr = useThree((s) => s.viewport.dpr);
  const { geometry, material } = useMemo(() => {
    let a = (variation.phase * 1e6) >>> 0;
    const rand = () => {
      a = (a * 1664525 + 1013904223) >>> 0;
      return a / 4294967296;
    };
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = -7 + rand() * 14;
      positions[i * 3 + 1] = -3 + rand() * 5.5;
      positions[i * 3 + 2] = -1.5 + rand() * 2.5;
      seeds[i] = rand();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: variation.dustSpeed },
        uDrift: { value: variation.dustDrift },
        uPixelRatio: { value: 1 },
        uBeamA: { value: new THREE.Vector2(...beam[0]) },
        uBeamB: { value: new THREE.Vector2(...beam[1]) },
        uColor: { value: srgb(color.espressoTint2) },
      },
    });
    return { geometry, material };
  }, [count, variation, beam]);

  useEffect(() => {
    material.uniforms.uPixelRatio.value = dpr;
  }, [material, dpr]);

  useEffect(() => {
    materials.set(material, -1);
    return () => {
      materials.delete(material);
      material.dispose();
      geometry.dispose();
    };
  }, [geometry, material, materials]);

  return <points geometry={geometry} material={material} renderOrder={3} />;
}

function prismGeometries(jitter: number[]) {
  const tri = equilateral(SIDE, jitter);
  const shape = new THREE.Shape([
    new THREE.Vector2(...tri.apex),
    new THREE.Vector2(...tri.left),
    new THREE.Vector2(...tri.right),
  ]);
  // Rounded edges catch highlights the way ground glass does; there are no drawn outlines.
  const bevel = 0.075;
  const glass = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 6,
    curveSegments: 1,
  });
  glass.translate(0, 0, -DEPTH / 2 + bevel);
  return { tri, glass };
}

const paperVertex = /* glsl */ `
  varying vec2 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xy;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const paperFragment = /* glsl */ `
  uniform vec3 uPaper;
  uniform vec3 uInk;
  uniform vec3 uWarm;
  uniform vec2 uA;
  uniform vec2 uB;
  uniform vec2 uC;
  uniform vec2 uCenter;
  uniform vec2 uCaustic;
  varying vec2 vWorld;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), u.x), u.y);
  }

  // Signed distance to a triangle (Inigo Quilez).
  float sdTriangle(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
    vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
    vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
    vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
    vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
    vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
    float s = sign(e0.x * e2.y - e0.y * e2.x);
    vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                     vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                     vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
    return -sqrt(d.x) * sign(d.y);
  }

  void main() {
    vec2 p = vWorld;
    // Paper grain, strongest near the prism so the glass has something to bend, fading to the flat page.
    float near = 1.0 - smoothstep(2.0, 6.5, length(p - uCenter));
    float grain = (hash(floor(p * 150.0)) - 0.5) * 0.03 + (noise(p * 2.5) - 0.5) * 0.025 + (noise(p * 18.0) - 0.5) * 0.012;
    vec3 col = uPaper * (1.0 + grain * near);
    // Soft contact shadow, cast down and to the right.
    float d = sdTriangle(p, uA, uB, uC);
    col = mix(col, uInk, (1.0 - smoothstep(-0.3, 0.45, d)) * 0.16);
    // Light focused by the glass: a faint warm caustic inside the shadow.
    vec2 q = p - uCaustic;
    col += uWarm * exp(-dot(q, q) / 0.06) * 0.02;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

// The paper the prism stands in front of. Opaque on purpose: the glass's transmission pass only sees
// opaque objects, so this is what refracts through it. It outputs exactly the page colour away from the
// prism, and goes through three's colour management so it matches whether seen directly or through glass.
function Paper({
  tri,
  variation,
}: {
  tri: ReturnType<typeof equilateral>;
  variation: PrismVariation;
}) {
  const { geometry, material } = useMemo(() => {
    const world = groupMatrix(variation);
    const at = (v: Vec2, dx = 0, dy = 0) => {
      const w = new THREE.Vector3(v[0] * 1.05, v[1] * 1.05, 0).applyMatrix4(world);
      return new THREE.Vector2(w.x + dx, w.y + dy);
    };
    const shadow = { dx: 0.3, dy: -0.34 };
    const centroid = at([
      (tri.apex[0] + tri.left[0] + tri.right[0]) / 3,
      (tri.apex[1] + tri.left[1] + tri.right[1]) / 3,
    ]);
    const material = new THREE.ShaderMaterial({
      vertexShader: paperVertex,
      fragmentShader: paperFragment,
      uniforms: {
        uPaper: { value: new THREE.Color(color.seaSand) },
        uInk: { value: new THREE.Color(color.espresso) },
        uWarm: { value: new THREE.Color(color.seaSandShade2) },
        uA: { value: at(tri.apex, shadow.dx, shadow.dy) },
        uB: { value: at(tri.left, shadow.dx, shadow.dy) },
        uC: { value: at(tri.right, shadow.dx, shadow.dy) },
        uCenter: { value: centroid },
        uCaustic: { value: new THREE.Vector2(centroid.x + 0.45, centroid.y - 0.45) },
      },
    });
    return { geometry: new THREE.PlaneGeometry(80, 50), material };
  }, [tri, variation]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <mesh geometry={geometry} material={material} position={[0, 0, -2.2]} renderOrder={0} />;
}

export type PrismSceneProps = {
  variation: PrismVariation;
  tier: "high" | "low";
  animate: boolean;
  interactive: boolean;
  // Play the light's arrival (white beam → glass → spectrum) on the first rendered frame.
  intro: boolean;
  onIntroStart: () => void;
  frameloop: "always" | "demand" | "never";
  labelX: number | null;
  onBandsLaid: (ys: number[]) => void;
  onContextLost: () => void;
};

const FOV = 30;

function cameraPose(width: number, height: number, variation: PrismVariation) {
  const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const aspect = width / height;
  const distance =
    aspect < 1
      ? Math.max(8, MIN_VISIBLE_WIDTH_NARROW / (2 * halfTan * aspect))
      : height / pxPerUnit() / (2 * halfTan);
  const [cx, cy, cz] = variation.camera;
  return {
    position: new THREE.Vector3(cx, cy, distance + cz),
    target: new THREE.Vector3(cx * 0.3, cy * 0.3, 0),
  };
}

// The white beam travels in at a steady speed, crosses the glass, then the spectrum fans out and slows.
const INTRO = [
  { start: 0.2, duration: 1.0, ease: (x: number) => x },
  { start: 1.2, duration: 0.3, ease: (x: number) => x },
  { start: 1.45, duration: 1.2, ease: (x: number) => 1 - (1 - x) ** 3 },
];

function reveal(depth: number, since: number) {
  const step = INTRO[Math.min(depth, INTRO.length - 1)];
  const x = Math.min(1, Math.max(0, (since - step.start) / step.duration));
  return step.ease(x) * 1.1;
}

function groupMatrix(variation: PrismVariation) {
  return new THREE.Matrix4().compose(
    PRISM_POSITION,
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler(variation.tiltX, variation.tiltY, variation.rotZ),
    ),
    new THREE.Vector3(1, 1, 1),
  );
}

// Where each band crosses the labels' x (in canvas px), and how long each exit beam must be to get there.
function layoutBands(
  trace: ReturnType<typeof traceDispersion>,
  variation: PrismVariation,
  width: number,
  height: number,
  labelX: number,
) {
  const pose = cameraPose(width, height, variation);
  const cam = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 100);
  cam.position.copy(pose.position);
  cam.lookAt(pose.target);
  cam.updateMatrixWorld();
  const world = groupMatrix(variation);
  const toScreen = (p: Vec2) => {
    const v = new THREE.Vector3(p[0], p[1], BEAM_Z).applyMatrix4(world).project(cam);
    return [((v.x + 1) / 2) * width, ((1 - v.y) / 2) * height] as const;
  };
  const along = (b: (typeof trace.bands)[number], t: number): Vec2 => [
    b.internalEnd[0] + b.exitDir[0] * t,
    b.internalEnd[1] + b.exitDir[1] * t,
  ];
  const lengths: number[] = [];
  const ys: number[] = [];
  for (const band of trace.bands) {
    let lo = 0;
    let hi = 30;
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2;
      if (toScreen(along(band, mid))[0] < labelX) lo = mid;
      else hi = mid;
    }
    lengths.push(lo);
    ys.push(toScreen(along(band, lo))[1]);
  }
  return { lengths, ys };
}

function Scene({
  variation,
  tier,
  animate,
  interactive,
  intro,
  onIntroStart,
  labelX,
  onBandsLaid,
}: Omit<PrismSceneProps, "frameloop" | "onContextLost">) {
  const { gl, scene, camera, size } = useThree();
  const materials = useMemo(() => new Map<THREE.ShaderMaterial, number>(), []);

  const { tri, glass } = useMemo(() => prismGeometries(variation.vertexJitter), [variation]);
  const trace = useMemo(
    () => traceDispersion(tri, variation.lightAngle, variation.entryT, variation.dispersion),
    [tri, variation],
  );
  const beamGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const bandLayout = useMemo(
    () => (labelX === null ? null : layoutBands(trace, variation, size.width, size.height, labelX)),
    [trace, variation, size.width, size.height, labelX],
  );
  const exitLengths = bandLayout?.lengths ?? null;

  useEffect(
    () => () => {
      glass.dispose();
    },
    [glass],
  );
  useEffect(() => () => beamGeometry.dispose(), [beamGeometry]);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.85;
    scene.background = new THREE.Color(color.seaSand);
    gl.transmissionResolutionScale = tier === "low" ? 0.5 : 1;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
      room.dispose();
    };
  }, [gl, scene, tier]);

  useLayoutEffect(() => {
    const pose = cameraPose(size.width, size.height, variation);
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    camera.updateMatrixWorld();
  }, [camera, size.width, size.height, variation]);

  useEffect(() => {
    if (bandLayout) onBandsLaid(bandLayout.ys);
  }, [bandLayout, onBandsLaid]);

  // Render specs, plus the physical segments the cursor can obstruct. Each spec points at its segment;
  // a segment's parent is the light that feeds it, so a blocked white beam dims every band downstream.
  const { beams, segments } = useMemo(() => {
    const white = srgb("#FFFFFF");
    const specs: BeamSpec[] = [];
    const segs: Segment[] = [];
    const { entry, incomingDir } = trace;
    const start: Vec2 = [
      entry[0] - incomingDir[0] * INCOMING_LENGTH,
      entry[1] - incomingDir[1] * INCOMING_LENGTH,
    ];
    const incoming =
      segs.push({ from: start, to: entry, halfWidth: 0.045, spread: 1, parent: -1 }) - 1;
    specs.push({
      from: start,
      to: entry,
      width: 0.34,
      color: srgb(color.espressoTint3),
      opacity: 0.16,
      fadeIn: 0.8,
      softness: 3,
      phase: variation.phase,
      seg: incoming,
    });
    specs.push({
      from: start,
      to: entry,
      width: 0.085,
      color: white,
      opacity: 0.95,
      fadeIn: 0.8,
      softness: 2.5,
      phase: variation.phase,
      seg: incoming,
    });
    // Inside the glass the light is still mostly white; the colours separate only toward the exit face.
    const mid = trace.bands[Math.floor(trace.bands.length / 2)].internalEnd;
    const inside =
      segs.push({ from: entry, to: mid, halfWidth: 0.04, spread: 1, parent: incoming }) - 1;
    specs.push({
      from: entry,
      to: mid,
      width: 0.08,
      color: white,
      opacity: 0.85,
      fadeOut: 0.5,
      softness: 2.5,
      phase: variation.phase,
      seg: inside,
    });
    for (const band of trace.bands) {
      const c = srgb(BAND_COLORS[band.index]);
      const phase = variation.phase + band.index * 0.7;
      const internal =
        segs.push({
          from: entry,
          to: band.internalEnd,
          halfWidth: 0.025,
          spread: 1,
          parent: incoming,
        }) - 1;
      specs.push({
        from: entry,
        to: band.internalEnd,
        width: 0.045,
        color: c,
        opacity: 0.22,
        fadeIn: 0.35,
        phase,
        seg: internal,
      });
      const length = (exitLengths?.[band.index] ?? DEFAULT_EXIT_LENGTH) * (exitLengths ? 1.04 : 1);
      const to: Vec2 = [
        band.internalEnd[0] + band.exitDir[0] * length,
        band.internalEnd[1] + band.exitDir[1] * length,
      ];
      const width = 0.11 * variation.bandWidthJitter[band.index];
      const exit =
        segs.push({
          from: band.internalEnd,
          to,
          halfWidth: width * 0.4,
          spread: 1.7,
          parent: internal,
        }) - 1;
      specs.push({
        from: band.internalEnd,
        to,
        width,
        spread: 1.7,
        color: c,
        opacity: 0.78,
        fadeIn: 0.015,
        fadeOut: exitLengths ? 0.18 : 0.3,
        softness: 3.2,
        phase,
        seg: exit,
      });
    }
    return { beams: specs, segments: segs };
  }, [trace, exitLengths, variation]);

  const field = useMemo(() => new OcclusionField(segments), [segments]);
  const segmentLengths = useMemo(
    () => segments.map((sg) => Math.hypot(sg.to[0] - sg.from[0], sg.to[1] - sg.from[1])),
    [segments],
  );
  const toLocal = useMemo(
    () => new THREE.Matrix4().copy(groupMatrix(variation)).invert(),
    [variation],
  );
  const lightPlane = useMemo(() => {
    const m = groupMatrix(variation);
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(m);
    return new THREE.Plane().setFromNormalAndCoplanarPoint(
      normal,
      new THREE.Vector3(0, 0, BEAM_Z).applyMatrix4(m),
    );
  }, [variation]);
  const pointer = useRef<{ ndc: THREE.Vector2; active: boolean }>({
    ndc: new THREE.Vector2(),
    active: false,
  });
  const scratch = useMemo(() => ({ ray: new THREE.Raycaster(), hit: new THREE.Vector3() }), []);

  // Native listeners rather than R3F's pointer state, which keeps the last position after the
  // cursor leaves. Touch: press and drag across a beam; vertical drags still scroll the page.
  useEffect(() => {
    if (!interactive) return;
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.current.ndc.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
      pointer.current.active =
        e.pointerType !== "touch" || e.buttons > 0 || e.type === "pointerdown";
    };
    const leave = () => {
      pointer.current.active = false;
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerdown", move);
    el.addEventListener("pointerup", leave);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointercancel", leave);
    window.addEventListener("blur", leave);
    return () => {
      leave();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", move);
      el.removeEventListener("pointerup", leave);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointercancel", leave);
      window.removeEventListener("blur", leave);
    };
  }, [gl, interactive]);

  const dustBeam = useMemo<[Vec2, Vec2]>(
    () => [
      [
        trace.entry[0] - trace.incomingDir[0] * INCOMING_LENGTH,
        trace.entry[1] - trace.incomingDir[1] * INCOMING_LENGTH,
      ],
      trace.entry,
    ],
    [trace],
  );

  // Intro timing by depth in the light's path: [start, duration] in seconds.
  const depths = useMemo(
    () =>
      segments.map((sg) => {
        let d = 0;
        for (let p = sg.parent; p >= 0; p = segments[p].parent) d++;
        return d;
      }),
    [segments],
  );
  const introStart = useRef<number | null>(intro ? null : -Infinity);

  useFrame(({ clock, camera: cam }, delta) => {
    const t = animate ? clock.elapsedTime : 0;
    if (introStart.current === null) {
      introStart.current = clock.elapsedTime;
      onIntroStart();
    }
    const since = clock.elapsedTime - introStart.current;
    let local: Vec2 | null = null;
    if (interactive && pointer.current.active) {
      scratch.ray.setFromCamera(pointer.current.ndc, cam);
      if (scratch.ray.ray.intersectPlane(lightPlane, scratch.hit)) {
        scratch.hit.applyMatrix4(toLocal);
        local = [scratch.hit.x, scratch.hit.y];
      }
    }
    field.step(local, delta);
    for (const [m, seg] of materials) {
      m.uniforms.uTime.value = t;
      if (seg < 0) continue;
      m.uniforms.uOccAmount.value = field.amount[seg].x;
      m.uniforms.uOccAt.value = field.at[seg];
      m.uniforms.uOccSoft.value = 0.12 / segmentLengths[seg];
      m.uniforms.uUpstream.value = field.upstream[seg];
      m.uniforms.uReveal.value = reveal(depths[seg], since);
    }
  });

  return (
    <>
      <Paper tri={tri} variation={variation} />
      <group
        position={PRISM_POSITION}
        rotation={[variation.tiltX, variation.tiltY, variation.rotZ]}
      >
        <mesh geometry={glass} renderOrder={1}>
          {/* Clear, untinted glass: what shows is the paper refracted through it (with dispersion at
            the edges), the rounded rims catching the room, and the shadow it casts. */}
          <meshPhysicalMaterial
            color="#ffffff"
            transmission={1}
            thickness={DEPTH}
            ior={1.52}
            dispersion={0.35}
            roughness={variation.roughness * 0.6}
            metalness={0}
            clearcoat={0.6}
            clearcoatRoughness={0.04}
            specularIntensity={1}
            envMapIntensity={1.35}
          />
        </mesh>
        {beams.map((spec, i) => (
          <Beam key={i} spec={spec} geometry={beamGeometry} materials={materials} />
        ))}
        <Dust
          count={tier === "low" ? 90 : 220}
          variation={variation}
          beam={dustBeam}
          materials={materials}
        />
      </group>
    </>
  );
}

// In Chrome, R3F's teardown leaves the old <canvas> pinned by a native handle (reproducible with a
// bare R3F canvas). A pinned canvas also pins its detached ancestors, i.e. the whole previous page;
// detaching it on unmount limits the leftover to the canvas itself. See DECISIONS.md, Prompt 03.
// Calling gl.dispose() here was measured to make retention worse, so it is deliberately omitted.
function Lifecycle({ onContextLost }: { onContextLost: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onContextLost);
    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.remove();
    };
  }, [gl, onContextLost]);
  return null;
}

export default function PrismScene({ frameloop, tier, onContextLost, ...rest }: PrismSceneProps) {
  return (
    <Canvas
      flat
      frameloop={frameloop}
      dpr={tier === "low" ? [1, 1.5] : [1, 2.5]}
      camera={{ fov: FOV, near: 0.1, far: 100, position: [0, 0, 11] }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    >
      <Lifecycle onContextLost={onContextLost} />
      <Scene tier={tier} {...rest} />
    </Canvas>
  );
}
