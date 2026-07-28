// Client-side "keep the largest object" filter + paper/pad stripper.
//
// Two-stage cleanup applied AFTER RMBG-1.4 background removal:
//
//   1. Paper/pad stripper: RMBG frequently keeps the white photo backdrop or
//      product pad as part of the foreground when the subject sits ON it (a
//      glasses case, a sheet of paper under jewelry, a sneaker on a light
//      surface). We flood from the image border THROUGH kept pixels that are
//      "paper-like" (bright, low chroma, close to the sampled backdrop color)
//      and force their alpha to 0. Real product pixels — colored frames,
//      lenses, dark rims, saturated logos — are never crossed.
//
//   2. Connected-component pass: after the pad is gone the remaining blobs
//      are labeled and every blob smaller than 5% of the largest is dropped,
//      so a side-object (case, box, secondary prop) can't end up glued to the
//      model's face.

const ALPHA_THRESHOLD = 24; // treat <=24 as transparent
const MIN_KEEP_RATIO = 0.18; // drop side props/cases unless they are clearly part of the product

// Paper/pad detection tuning. These are intentionally conservative: we only
// strip pixels that are (a) very bright OR (b) very close to the sampled
// backdrop color AND low-saturation. Product pixels are protected by a hard
// chroma gate — anything with meaningful color saturation is never crossed.
const PAPER_LUMA_MIN = 205;         // >=205 luma is treated as "paper bright"
const PAPER_CHROMA_MAX = 22;        // max(R,G,B)-min(R,G,B); >22 = real color, protect
const PAPER_COLOR_DIST_MAX = 42;    // RGB distance to sampled backdrop
const BORDER_SAMPLE_INSET = 2;      // sample ring N px inside the frame
const MIN_INTERIOR_PAPER_ISLAND = 900; // remove big inner white cards/screenshots, not tiny highlights
const MIN_INTERIOR_ISLAND_AREA_RATIO = 0.004;

type RGB = [number, number, number];
type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
type ComponentStats = Bounds & {
  label: number;
  size: number;
  neutralPaper: number;
  meaningful: number;
};

function chroma(r: number, g: number, b: number) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function luma(r: number, g: number, b: number) {
  // Rec. 709-ish luma; good enough to identify bright paper
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sqDist(r: number, g: number, b: number, ref: RGB) {
  const dr = r - ref[0];
  const dg = g - ref[1];
  const db = b - ref[2];
  return dr * dr + dg * dg + db * db;
}

function countVisibleAlpha(data: Uint8ClampedArray) {
  let visible = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > ALPHA_THRESHOLD) visible++;
  }
  return visible;
}

function findForegroundBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= ALPHA_THRESHOLD) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

/** Sample the dominant "backdrop" color from kept pixels along the frame. */
function sampleBackdrop(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bounds: Bounds,
): RGB | null {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const inset = BORDER_SAMPLE_INSET;
  const addIfPaper = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    if (data[i + 3] <= ALPHA_THRESHOLD) return;
    const rr = data[i];
    const gg = data[i + 1];
    const bb = data[i + 2];
    // Only average bright, low-chroma pixels — that's the paper/pad.
    if (luma(rr, gg, bb) < PAPER_LUMA_MIN) return;
    if (chroma(rr, gg, bb) > PAPER_CHROMA_MAX) return;
    r += rr;
    g += gg;
    b += bb;
    n++;
  };
  const consider = (x: number, y: number) => {
    addIfPaper(x, y);
  };

  // First try the actual image frame.
  for (let x = 0; x < width; x++) {
    consider(x, inset);
    consider(x, height - 1 - inset);
  }
  for (let y = 0; y < height; y++) {
    consider(inset, y);
    consider(width - 1 - inset, y);
  }

  // RMBG often outputs the white sheet as an opaque island surrounded by
  // transparency. In that failure mode the canvas border has no alpha at all,
  // so sample the visible foreground bounding-box perimeter as the "local edge".
  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    addIfPaper(x, bounds.minY);
    addIfPaper(x, bounds.maxY);
  }
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    addIfPaper(bounds.minX, y);
    addIfPaper(bounds.maxX, y);
  }

  if (n < 20) return null; // no meaningful backdrop leak → nothing to strip
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

function isPaperPixel(
  data: Uint8ClampedArray,
  idx4: number,
  backdrop: RGB,
): boolean {
  const r = data[idx4];
  const g = data[idx4 + 1];
  const b = data[idx4 + 2];
  // Hard chroma gate — real product color, never strip.
  if (chroma(r, g, b) > PAPER_CHROMA_MAX) return false;
  // Very bright neutrals are paper regardless of distance.
  if (luma(r, g, b) >= PAPER_LUMA_MIN) return true;
  // Otherwise must be close to the sampled backdrop color.
  return sqDist(r, g, b, backdrop) <= PAPER_COLOR_DIST_MAX * PAPER_COLOR_DIST_MAX;
}

function isNeutralPaperPixel(data: Uint8ClampedArray, idx4: number): boolean {
  if (data[idx4 + 3] <= ALPHA_THRESHOLD) return false;
  const r = data[idx4];
  const g = data[idx4 + 1];
  const b = data[idx4 + 2];
  return luma(r, g, b) >= PAPER_LUMA_MIN && chroma(r, g, b) <= PAPER_CHROMA_MAX;
}

function isMeaningfulProductPixel(data: Uint8ClampedArray, idx4: number): boolean {
  if (data[idx4 + 3] <= ALPHA_THRESHOLD) return false;
  const r = data[idx4];
  const g = data[idx4 + 1];
  const b = data[idx4 + 2];
  // Colored/dark/detail pixels are the product signal. Bright, flat neutral
  // pixels are treated as paper/backdrop unless component geometry proves
  // otherwise later.
  return chroma(r, g, b) > PAPER_CHROMA_MAX + 6 || luma(r, g, b) < PAPER_LUMA_MIN - 22;
}

function componentBoxArea(c: Bounds) {
  return Math.max(1, (c.maxX - c.minX + 1) * (c.maxY - c.minY + 1));
}

function isBackdropPanelComponent(c: ComponentStats, width: number, height: number) {
  const boxW = c.maxX - c.minX + 1;
  const boxH = c.maxY - c.minY + 1;
  const fillRatio = c.size / componentBoxArea(c);
  const neutralRatio = c.neutralPaper / Math.max(1, c.size);
  const meaningfulRatio = c.meaningful / Math.max(1, c.size);
  const largeFlatBox = boxW > width * 0.16 && boxH > height * 0.1;
  const denseRectangle = fillRatio > 0.38;
  const paperDominant = neutralRatio > 0.72;
  const weakProductSignal = meaningfulRatio < 0.22;
  return largeFlatBox && denseRectangle && paperDominant && weakProductSignal;
}

function componentProductScore(c: ComponentStats) {
  const nonPaper = Math.max(0, c.size - c.neutralPaper);
  const fillRatio = c.size / componentBoxArea(c);
  const rectangularPenalty = fillRatio > 0.62 ? 0.55 : 1;
  return (c.meaningful * 2.4 + nonPaper + c.size * 0.025) * rectangularPenalty;
}

/**
 * Remove large paper-like islands that are not reachable from the global alpha
 * border. This catches uploaded comparison screenshots where a white "After"
 * card remains inside the product layer and gets pasted onto the model.
 */
function stripInteriorPaperIslands(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): boolean {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const component = new Int32Array(total);
  const minSize = Math.max(MIN_INTERIOR_PAPER_ISLAND, Math.round(total * MIN_INTERIOR_ISLAND_AREA_RATIO));
  let changed = false;

  for (let start = 0; start < total; start++) {
    if (visited[start]) continue;
    if (!isNeutralPaperPixel(data, start * 4)) continue;

    let head = 0;
    let tail = 0;
    let componentSize = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    visited[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
      const p = queue[head++];
      component[componentSize++] = p;
      const x = p % width;
      const y = (p - x) / width;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      const enqueue = (n: number) => {
        if (visited[n]) return;
        if (!isNeutralPaperPixel(data, n * 4)) return;
        visited[n] = 1;
        queue[tail++] = n;
      };
      if (x > 0) enqueue(p - 1);
      if (x < width - 1) enqueue(p + 1);
      if (y > 0) enqueue(p - width);
      if (y < height - 1) enqueue(p + width);
    }

    if (componentSize < minSize) continue;

    const panelStats: ComponentStats = {
      label: 0,
      size: componentSize,
      neutralPaper: componentSize,
      meaningful: 0,
      minX,
      minY,
      maxX,
      maxY,
    };
    if (!isBackdropPanelComponent(panelStats, width, height)) continue;

    for (let i = 0; i < componentSize; i++) {
      data[component[i] * 4 + 3] = 0;
    }
    changed = true;
  }

  return changed;
}

/** Strip paper/pad by flood-filling from the border through paper-like kept pixels. */
function stripPaperPad(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): boolean {
  const bounds = findForegroundBounds(data, width, height);
  if (!bounds) return false;

  const backdrop = sampleBackdrop(data, width, height, bounds);
  if (!backdrop) return false;

  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const tryEnqueue = (p: number) => {
    if (visited[p]) return;
    const i4 = p * 4;
    if (data[i4 + 3] <= ALPHA_THRESHOLD) {
      visited[p] = 1;
      return; // already transparent, but mark so we can seed neighbors
    }
    if (!isPaperPixel(data, i4, backdrop)) return;
    visited[p] = 1;
    queue[tail++] = p;
  };

  // Seed from the border ring.
  for (let x = 0; x < width; x++) {
    tryEnqueue(x);
    tryEnqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    tryEnqueue(y * width);
    tryEnqueue(y * width + width - 1);
  }

  // Also seed from the alpha bounding-box ring. This is the critical fix for
  // the "big white rectangle pasted on the model" bug: the paper block is often
  // not connected to the canvas border after RMBG, but it *is* the visible
  // foreground boundary.
  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    tryEnqueue(bounds.minY * width + x);
    tryEnqueue(bounds.maxY * width + x);
  }
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    tryEnqueue(y * width + bounds.minX);
    tryEnqueue(y * width + bounds.maxX);
  }

  let stripped = 0;
  while (head < tail) {
    const p = queue[head++];
    const i4 = p * 4;
    // Erase the paper pixel.
    data[i4 + 3] = 0;
    stripped++;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) tryEnqueue(p - 1);
    if (x < width - 1) tryEnqueue(p + 1);
    if (y > 0) tryEnqueue(p - width);
    if (y < height - 1) tryEnqueue(p + width);
  }

  // Soft-feather one pixel inward so we don't leave a hard cliff where the
  // stripped pad met the real product edge.
  if (stripped > 0) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = y * width + x;
        const i4 = p * 4;
        if (data[i4 + 3] === 0) continue;
        // If this kept pixel touches a stripped neighbor AND is paper-ish,
        // pull its alpha down to avoid a white halo.
        const touchesStripped =
          data[(p - 1) * 4 + 3] === 0 ||
          data[(p + 1) * 4 + 3] === 0 ||
          data[(p - width) * 4 + 3] === 0 ||
          data[(p + width) * 4 + 3] === 0;
        if (!touchesStripped) continue;
        const r = data[i4];
        const g = data[i4 + 1];
        const b = data[i4 + 2];
        if (chroma(r, g, b) > PAPER_CHROMA_MAX) continue;
        if (luma(r, g, b) < 190) continue;
        data[i4 + 3] = Math.min(data[i4 + 3], 120);
      }
    }
  }

  return stripped > 0;
}

export async function isolateMainSubject(input: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(input);
  const width = bitmap.width;
  const height = bitmap.height;
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement("canvas"), { width, height });
  const ctx = (canvas as HTMLCanvasElement).getContext("2d", { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) return input;
  ctx.drawImage(bitmap, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height);
  const data = pixels.data;
  const total = width * height;

  // Stage 1 — strip any paper/pad the RMBG mask left behind.
  const beforePaperStrip = new Uint8ClampedArray(data);
  const beforeVisible = countVisibleAlpha(data);
  if (stripPaperPad(data, width, height)) {
    const afterVisible = countVisibleAlpha(data);
    // Safety valve: if a bright/white real product would be almost fully erased,
    // revert the stripper and continue with component cleanup only.
    if (beforeVisible > 0 && afterVisible < Math.max(24, beforeVisible * 0.006)) {
      data.set(beforePaperStrip);
    }
  }
  stripInteriorPaperIslands(data, width, height);

  // Stage 2 — keep the strongest product component(s), not the largest white
  // rectangle. This is the critical guard against pasted paper/cards/boxes:
  // a neutral backdrop panel may be physically larger than a watch/glasses item,
  // so selection is based on product signal and panel geometry instead of area.
  const beforeComponentFilter = new Uint8ClampedArray(data);
  const labels = new Int32Array(total);
  const queue = new Int32Array(total);
  const components: ComponentStats[] = [];
  let nextLabel = 1;

  for (let p = 0; p < total; p++) {
    if (labels[p] !== 0) continue;
    if (data[p * 4 + 3] <= ALPHA_THRESHOLD) continue;
    const label = nextLabel++;
    let size = 0;
    let neutralPaper = 0;
    let meaningful = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let head = 0;
    let tail = 0;
    labels[p] = label;
    queue[tail++] = p;
    while (head < tail) {
      const cur = queue[head++];
      size++;
      const x = cur % width;
      const y = (cur - x) / width;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const cur4 = cur * 4;
      if (isNeutralPaperPixel(data, cur4)) neutralPaper++;
      if (isMeaningfulProductPixel(data, cur4)) meaningful++;
      if (x > 0) {
        const n = cur - 1;
        if (labels[n] === 0 && data[n * 4 + 3] > ALPHA_THRESHOLD) {
          labels[n] = label;
          queue[tail++] = n;
        }
      }
      if (x < width - 1) {
        const n = cur + 1;
        if (labels[n] === 0 && data[n * 4 + 3] > ALPHA_THRESHOLD) {
          labels[n] = label;
          queue[tail++] = n;
        }
      }
      if (y > 0) {
        const n = cur - width;
        if (labels[n] === 0 && data[n * 4 + 3] > ALPHA_THRESHOLD) {
          labels[n] = label;
          queue[tail++] = n;
        }
      }
      if (y < height - 1) {
        const n = cur + width;
        if (labels[n] === 0 && data[n * 4 + 3] > ALPHA_THRESHOLD) {
          labels[n] = label;
          queue[tail++] = n;
        }
      }
    }
    components.push({ label, size, neutralPaper, meaningful, minX, minY, maxX, maxY });
  }

  if (components.length > 1) {
    const candidates = components.filter((c) => !isBackdropPanelComponent(c, width, height));
    const pool = candidates.length > 0 ? candidates : components;
    let best = pool[0];
    if (!best) return input;
    let bestScore = best ? componentProductScore(best) : 0;
    for (const component of pool) {
      const score = componentProductScore(component);
      if (score > bestScore) {
        best = component;
        bestScore = score;
      }
    }
    const keepLabels = new Set<number>();
    if (best) {
      keepLabels.add(best.label);
      const scoreThreshold = Math.max(18, bestScore * MIN_KEEP_RATIO);
      const meaningfulThreshold = Math.max(10, best.meaningful * MIN_KEEP_RATIO);
      for (const component of pool) {
        if (component.label === best.label) continue;
        const score = componentProductScore(component);
        if (score >= scoreThreshold || component.meaningful >= meaningfulThreshold) {
          keepLabels.add(component.label);
        }
      }
    }
    if (keepLabels.size > 0) {
      for (let p = 0; p < total; p++) {
        const label = labels[p];
        if (label === 0) continue;
        if (keepLabels.has(label)) continue;
        data[p * 4 + 3] = 0;
      }
      const afterVisible = countVisibleAlpha(data);
      const beforeFilterVisible = countVisibleAlpha(beforeComponentFilter);
      if (beforeFilterVisible > 0 && afterVisible < Math.max(24, beforeFilterVisible * 0.02)) {
        data.set(beforeComponentFilter);
      }
    }
  }

  ctx.putImageData(pixels, 0, 0);

  if (typeof (canvas as OffscreenCanvas).convertToBlob === "function") {
    return await (canvas as OffscreenCanvas).convertToBlob({ type: "image/png" });
  }
  return await new Promise<Blob>((resolve) =>
    (canvas as HTMLCanvasElement).toBlob((b) => resolve(b ?? input), "image/png"),
  );
}
