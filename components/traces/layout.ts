// Editorial rhythm for the gallery: a wide feature, then a mismatched pair, then a single image offset
// right with its caption beside it. Panoramas always get the full width. Pure, so it can run on the server.
export type Slot = { col: string; drop: number; captionSide?: boolean };

type Dims = { width: number; height: number };

const ratio = (p: Dims) => p.width / p.height;

export function arrange<T extends Dims>(photos: T[]): Slot[] {
  const slots: Slot[] = [];
  let beat = 0;
  for (let i = 0; i < photos.length;) {
    const p = photos[i];
    if (ratio(p) >= 1.9) {
      slots.push({ col: "1 / -1", drop: 0 });
      i += 1;
      continue;
    }
    const kind = beat % 3;
    beat += 1;
    if (kind === 0) {
      slots.push(
        ratio(p) >= 1
          ? { col: "2 / span 10", drop: 0 }
          : { col: "4 / span 5", drop: 0, captionSide: true },
      );
      i += 1;
    } else if (kind === 1 && i + 1 < photos.length && ratio(photos[i + 1]) < 1.9) {
      const a = ratio(p) >= 1 ? 7 : 5;
      slots.push({ col: `1 / span ${a}`, drop: 0 });
      slots.push({ col: `${a + 2} / -1`, drop: ratio(photos[i + 1]) >= 1 ? 6 : 3 });
      i += 2;
    } else {
      slots.push({ col: ratio(p) >= 1 ? "5 / -1" : "7 / span 5", drop: 0, captionSide: true });
      i += 1;
    }
  }
  return slots;
}
