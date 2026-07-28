// Shared alpha-mask cleanup for the local RMBG pipeline (worker + inline).
// -----------------------------------------------------------------------------
// Why this exists: the previous cleanup used a morphological "fill pinholes"
// pass that promoted any weak pixel with >= 6 solid neighbours to fully opaque,
// three times in a row. On photos with a bright background touching the product
// (car body on white studio floor) that dilation snowballed and kept whole
// rectangular chunks of background -> the "white blocks" bug.
//
// The replacement is non-dilating and deterministic:
//   1. binarize the soft mask
//   2. keep only meaningful connected foreground components (drops ghost blobs)
//   3. fill genuine interior holes via border flood-fill (never grows outward)
//   4. feather 1px for clean edges
// No pass ever expands the silhouette outwards, so leftover background can only
// shrink, never grow.

export function binarize(alpha: Uint8ClampedArray, threshold = 128) {
  const out = new Uint8Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) out[i] = alpha[i] >= threshold ? 1 : 0;
  return out;
}

/** Label 4-connected components of `mask` (value 1) and drop insignificant ones. */
export function keepMainComponents(mask: Uint8Array, w: number, h: number) {
  const labels = new Int32Array(mask.length).fill(-1);
  const sizes: number[] = [];
  const stack = new Int32Array(mask.length);

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] !== 1 || labels[start] !== -1) continue;
    const label = sizes.length;
    let size = 0;
    let sp = 0;
    stack[sp++] = start;
    labels[start] = label;
    while (sp > 0) {
      const i = stack[--sp];
      size++;
      const x = i % w;
      const y = (i / w) | 0;
      if (x > 0 && mask[i - 1] === 1 && labels[i - 1] === -1) { labels[i - 1] = label; stack[sp++] = i - 1; }
      if (x < w - 1 && mask[i + 1] === 1 && labels[i + 1] === -1) { labels[i + 1] = label; stack[sp++] = i + 1; }
      if (y > 0 && mask[i - w] === 1 && labels[i - w] === -1) { labels[i - w] = label; stack[sp++] = i - w; }
      if (y < h - 1 && mask[i + w] === 1 && labels[i + w] === -1) { labels[i + w] = label; stack[sp++] = i + w; }
    }
    sizes.push(size);
  }

  if (sizes.length === 0) return mask;

  const largest = Math.max(...sizes);
  // Keep the main subject plus any component that is a real secondary part
  // (>= 12% of the main one). Everything smaller is mask noise / ghost patches.
  const minSize = Math.max(64, largest * 0.12);
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    const l = labels[i];
    if (l >= 0 && sizes[l] >= minSize) out[i] = 1;
  }
  return out;
}

/**
 * Fill only tiny interior holes. Large enclosed background regions (car wheel
 * arches, gaps under a product, chair handles, etc.) must stay transparent; the
 * old all-hole fill was the reason wheel/ground artifacts survived.
 */
export function fillSmallEnclosedHoles(mask: Uint8Array, w: number, h: number) {
  const reachable = new Uint8Array(mask.length);
  const stack = new Int32Array(mask.length);
  let sp = 0;

  const push = (i: number) => {
    if (mask[i] === 0 && reachable[i] === 0) {
      reachable[i] = 1;
      stack[sp++] = i;
    }
  };

  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }

  while (sp > 0) {
    const i = stack[--sp];
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }

  const out = new Uint8Array(mask);
  const labels = new Int32Array(mask.length).fill(-1);
  const holeStack = new Int32Array(mask.length);
  const fillLimit = Math.max(48, Math.round(mask.length * 0.0015));

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] !== 0 || reachable[start] === 1 || labels[start] !== -1) continue;

    const label = start;
    let size = 0;
    let hp = 0;
    let overflow = false;
    holeStack[hp++] = start;
    labels[start] = label;

    while (hp > 0) {
      const i = holeStack[--hp];
      stack[size++] = i;
      if (size > fillLimit) overflow = true;

      const x = i % w;
      const y = (i / w) | 0;
      if (x > 0) {
        const next = i - 1;
        if (mask[next] === 0 && reachable[next] === 0 && labels[next] === -1) { labels[next] = label; holeStack[hp++] = next; }
      }
      if (x < w - 1) {
        const next = i + 1;
        if (mask[next] === 0 && reachable[next] === 0 && labels[next] === -1) { labels[next] = label; holeStack[hp++] = next; }
      }
      if (y > 0) {
        const next = i - w;
        if (mask[next] === 0 && reachable[next] === 0 && labels[next] === -1) { labels[next] = label; holeStack[hp++] = next; }
      }
      if (y < h - 1) {
        const next = i + w;
        if (mask[next] === 0 && reachable[next] === 0 && labels[next] === -1) { labels[next] = label; holeStack[hp++] = next; }
      }
    }

    if (!overflow) {
      for (let j = 0; j < size; j++) out[stack[j]] = 1;
    }
  }
  return out;
}

function colorLuma(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function trimWeakBoundary(mask: Uint8Array, rawMask: Uint8ClampedArray, w: number, h: number) {
  let current = new Uint8Array(mask);

  for (let pass = 0; pass < 2; pass++) {
    const next = new Uint8Array(current);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (current[i] !== 1) continue;

        const transparentNeighbors =
          (current[i - 1] === 0 ? 1 : 0) +
          (current[i + 1] === 0 ? 1 : 0) +
          (current[i - w] === 0 ? 1 : 0) +
          (current[i + w] === 0 ? 1 : 0);

        if (transparentNeighbors === 0) continue;

        // Border pixels with only borderline model confidence are almost always
        // road/sky/studio-floor residue around tires and product contact shadows.
        // Remove them instead of letting feather/defringe turn them into jagged
        // white/gray chunks.
        if (rawMask[i] < 214 || (rawMask[i] < 232 && transparentNeighbors >= 2)) {
          next[i] = 0;
        }
      }
    }
    current = next;
  }

  return current;
}

export function defringeRgba(data: Uint8ClampedArray, alpha: Uint8ClampedArray, w: number, h: number) {
  const source = new Uint8ClampedArray(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = alpha[i];
      if (a === 0 || a === 255) continue;

      const touchesTransparent =
        (x > 0 && alpha[i - 1] === 0) ||
        (x < w - 1 && alpha[i + 1] === 0) ||
        (y > 0 && alpha[i - w] === 0) ||
        (y < h - 1 && alpha[i + w] === 0);
      if (!touchesTransparent) continue;

      const currentR = source[4 * i];
      const currentG = source[4 * i + 1];
      const currentB = source[4 * i + 2];
      const currentLuma = colorLuma(currentR, currentG, currentB);

      let found = -1;
      for (let r = 1; r <= 3 && found < 0; r++) {
        for (let dy = -r; dy <= r && found < 0; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const ni = yy * w + xx;
            if (alpha[ni] > 235) {
              found = ni;
              break;
            }
          }
        }
      }

      if (found >= 0) {
        const foundR = source[4 * found];
        const foundG = source[4 * found + 1];
        const foundB = source[4 * found + 2];
        const foundLuma = colorLuma(foundR, foundG, foundB);

        // Never paint a dark tire/body edge with a much brighter donor. That was
        // the visible white/jagged wheel artifact on dark cars.
        if (currentLuma < 140 && foundLuma > currentLuma + 55) continue;

        data[4 * i] = source[4 * found];
        data[4 * i + 1] = source[4 * found + 1];
        data[4 * i + 2] = source[4 * found + 2];
      }
    }
  }
}

export function featherAlpha(alpha: Uint8ClampedArray, w: number, h: number, radius = 1) {
  const out = new Uint8ClampedArray(alpha.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          sum += alpha[yy * w + xx];
          count++;
        }
      }
      out[y * w + x] = Math.round(sum / count);
    }
  }
  return out;
}

/** Push the ambiguous mid band to hard 0/255 so ghosting can't survive. */
export function sharpenAlphaHoles(alpha: Uint8ClampedArray, low = 140, high = 200) {
  const span = high - low;
  const out = new Uint8ClampedArray(alpha.length);
  for (let i = 0; i < alpha.length; i++) {
    const v = alpha[i];
    if (v <= low) out[i] = 0;
    else if (v >= high) out[i] = 255;
    else out[i] = Math.round(((v - low) / span) * 255);
  }
  return out;
}

export function assertUsefulAlpha(alpha: Uint8ClampedArray) {
  let visible = 0;
  for (let i = 0; i < alpha.length; i++) {
    if (alpha[i] > 24) visible++;
  }
  const coverage = visible / Math.max(1, alpha.length);
  if (coverage < 0.015 || coverage > 0.985) {
    throw new Error("invalid_cutout_mask");
  }
}

/** Full cleanup: raw soft mask -> final alpha channel.
 *
 * Deliberately conservative: the previous version (a) ramped the 140-200 band
 * up to 255 and (b) forced every pixel inside the kept silhouette to ~98%
 * opacity. On photos with a large soft-scoring background (desert, sky, studio
 * floor) those two steps promoted weak background pixels into solid blocks that
 * were connected to the subject, producing the rectangular leftovers.
 *
 * Now: hard threshold decides membership, and the ORIGINAL soft mask supplies
 * the opacity inside. Nothing is ever brightened. */
export function refineAlpha(rawMask: Uint8ClampedArray, w: number, h: number) {
  assertUsefulAlpha(rawMask);

  // Membership needs a confident model score, not a borderline one.
  const binary = keepMainComponents(binarize(rawMask, 178), w, h);
  const solid = trimWeakBoundary(fillSmallEnclosedHoles(binary, w, h), rawMask, w, h);

  const combined = new Uint8ClampedArray(rawMask.length);
  for (let i = 0; i < combined.length; i++) {
    if (solid[i] !== 1) {
      combined[i] = 0;
      continue;
    }
    // Interior stays as the model saw it; only clearly-confident pixels become
    // fully opaque. No value is ever raised above its raw score.
    combined[i] = rawMask[i] >= 220 ? 255 : rawMask[i];
  }
  return featherAlpha(combined, w, h, 1);
}
