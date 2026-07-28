import { PNG } from "pngjs";

type MaskReadResult = {
  mask: Uint8Array;
  width: number;
  height: number;
  bbox: { x1: number; y1: number; x2: number; y2: number } | null;
  count: number;
};

type MaskBox = { x1: number; y1: number; x2: number; y2: number };
type MaskComponent = MaskBox & { count: number; cx: number; cy: number };

function parseImageDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("invalid_image_payload");
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

function pngDataUrlFromMask(mask: Uint8Array, width: number, height: number): string {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i += 1) {
    const v = mask[i] ? 255 : 0;
    const j = i * 4;
    png.data[j] = v;
    png.data[j + 1] = v;
    png.data[j + 2] = v;
    png.data[j + 3] = 255;
  }
  return `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
}

function countMaskPixels(mask: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < mask.length; i += 1) if (mask[i]) count += 1;
  return count;
}

function readMask(dataUrl: string): MaskReadResult | null {
  const { buffer } = parseImageDataUrl(dataUrl);
  let png: PNG;
  try {
    png = PNG.sync.read(buffer);
  } catch {
    return null;
  }
  const out = new Uint8Array(png.width * png.height);
  let x1 = png.width;
  let y1 = png.height;
  let x2 = -1;
  let y2 = -1;
  let count = 0;
  // Binarize aggressively: any pixel that carries mask intent — any visible
  // alpha, any non-black RGB (white paint, red tint, blue tint, magenta) —
  // becomes PURE WHITE (1). Everything else is PURE BLACK (0). Fixes the
  // "multi-select produces tinted/half-opaque pixels the model reads as
  // background" bug the LaMa inpainter chokes on.
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const idx = y * png.width + x;
      const j = idx * 4;
      const r = png.data[j];
      const g = png.data[j + 1];
      const b = png.data[j + 2];
      const alpha = png.data[j + 3];
      const bright = Math.max(r, g, b);
      const redTint = r > 40 && r >= g && r >= b;
      const hasInk = alpha > 8 && (bright > 24 || redTint);
      if (hasInk) {
        out[idx] = 1;
        count += 1;
        if (x < x1) x1 = x;
        if (y < y1) y1 = y;
        if (x > x2) x2 = x;
        if (y > y2) y2 = y;
      }
    }
  }
  return { mask: out, width: png.width, height: png.height, bbox: count ? { x1, y1, x2, y2 } : null, count };
}

function dilateMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return mask;
  const out = new Uint8Array(mask);
  const offsets: Array<[number, number]> = [];
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx * dx + dy * dy <= r2) offsets.push([dx, dy]);
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      for (const [dx, dy] of offsets) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) out[ny * width + nx] = 1;
      }
    }
  }
  return out;
}

function mergeMasks(...items: Array<{ mask: Uint8Array; width: number; height: number } | null | undefined>) {
  const first = items.find(Boolean);
  if (!first) return null;
  const out = new Uint8Array(first.width * first.height);
  for (const item of items) {
    if (!item || item.width !== first.width || item.height !== first.height) continue;
    for (let i = 0; i < out.length; i += 1) if (item.mask[i]) out[i] = 1;
  }
  return { mask: out, width: first.width, height: first.height };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function findMaskComponents(mask: Uint8Array, width: number, height: number): MaskComponent[] {
  const visited = new Uint8Array(mask.length);
  const stack = new Int32Array(mask.length);
  const components: MaskComponent[] = [];
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
  ] as const;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;

    let top = 0;
    stack[top++] = start;
    visited[start] = 1;

    let x1 = width;
    let y1 = height;
    let x2 = -1;
    let y2 = -1;
    let count = 0;
    let sumX = 0;
    let sumY = 0;

    while (top > 0) {
      const idx = stack[--top];
      const x = idx % width;
      const y = Math.floor(idx / width);
      count += 1;
      sumX += x;
      sumY += y;
      if (x < x1) x1 = x;
      if (y < y1) y1 = y;
      if (x > x2) x2 = x;
      if (y > y2) y2 = y;

      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const ni = ny * width + nx;
        if (!mask[ni] || visited[ni]) continue;
        visited[ni] = 1;
        stack[top++] = ni;
      }
    }

    if (count >= 8) {
      components.push({
        x1,
        y1,
        x2,
        y2,
        count,
        cx: sumX / count,
        cy: sumY / count,
      });
    }
  }

  return components.sort((a, b) => b.count - a.count);
}

function paintSolidRoundedBox(out: Uint8Array, width: number, height: number, box: MaskBox, radius: number): void {
  const x1 = clamp(Math.floor(box.x1), 0, width - 1);
  const y1 = clamp(Math.floor(box.y1), 0, height - 1);
  const x2 = clamp(Math.ceil(box.x2), 0, width - 1);
  const y2 = clamp(Math.ceil(box.y2), 0, height - 1);
  const r = Math.max(0, Math.min(radius, Math.floor((x2 - x1 + 1) / 2), Math.floor((y2 - y1 + 1) / 2)));
  const r2 = r * r;

  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      if (r > 0) {
        const cx = x < x1 + r ? x1 + r : x > x2 - r ? x2 - r : x;
        const cy = y < y1 + r ? y1 + r : y > y2 - r ? y2 - r : y;
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > r2) continue;
      }
      out[y * width + x] = 1;
    }
  }
}

function paintTaperedPersonMask(out: Uint8Array, width: number, height: number, box: MaskBox, component: MaskComponent): void {
  const x1 = clamp(Math.floor(box.x1), 0, width - 1);
  const y1 = clamp(Math.floor(box.y1), 0, height - 1);
  const x2 = clamp(Math.ceil(box.x2), 0, width - 1);
  const y2 = clamp(Math.ceil(box.y2), 0, height - 1);
  const cx = clamp(component.cx, x1, x2);
  const maxHalf = Math.max(14, (x2 - x1 + 1) / 2);
  const spanY = Math.max(1, y2 - y1);

  for (let y = y1; y <= y2; y += 1) {
    const t = (y - y1) / spanY;
    const shape =
      t < 0.12
        ? 0.48 + t * 2.8
        : t < 0.42
          ? 0.84 + Math.sin((t - 0.12) / 0.30 * Math.PI) * 0.13
          : t < 0.78
            ? 0.82
            : 0.72 - (t - 0.78) * 1.25;
    const half = clamp(maxHalf * shape, 12, maxHalf);
    const left = Math.max(x1, Math.floor(cx - half));
    const right = Math.min(x2, Math.ceil(cx + half));
    for (let x = left; x <= right; x += 1) out[y * width + x] = 1;
  }
}

function paintStrokeObjectMask(out: Uint8Array, width: number, height: number, component: MaskComponent): MaskBox {
  const minSide = Math.min(width, height);
  const bw = component.x2 - component.x1 + 1;
  const bh = component.y2 - component.y1 + 1;
  const areaRatio = component.count / Math.max(1, width * height);
  const tallStroke = bh > bw * 1.25 || bh > height * 0.14;
  const tinyTouch = areaRatio < 0.0009 && bw < minSide * 0.08 && bh < minSide * 0.08;

  let box: MaskBox;
  if (tinyTouch) {
    const boxW = clamp(Math.max(58, minSide * 0.075), 54, Math.min(width * 0.14, 150));
    box = {
      x1: component.cx - boxW / 2,
      y1: component.cy - height * 0.045,
      x2: component.cx + boxW / 2,
      y2: component.cy + height * 0.24,
    };
  } else if (tallStroke) {
    const expandedW = clamp(Math.max(bw * 2.15, bh * 0.18, minSide * 0.065), 54, Math.min(width * 0.18, 190));
    const topPad = bh < height * 0.18 ? Math.max(height * 0.035, bh * 0.28, 26) : Math.max(height * 0.012, bh * 0.045, 12);
    const bottomPad = bh < height * 0.18 ? Math.max(height * 0.12, bh * 0.85, 78) : Math.max(height * 0.02, bh * 0.07, 20);
    box = {
      x1: component.cx - expandedW / 2,
      y1: component.y1 - topPad,
      x2: component.cx + expandedW / 2,
      y2: component.y2 + bottomPad,
    };
  } else {
    const broadGesture = bw > minSide * 0.16 && bh > minSide * 0.12;
    const padX = broadGesture ? Math.max(16, bw * 0.10, minSide * 0.018) : Math.max(18, bw * 0.38, minSide * 0.024);
    const padTop = broadGesture ? Math.max(14, bh * 0.06, minSide * 0.014) : Math.max(18, bh * 0.26, minSide * 0.024);
    const padBottom = broadGesture ? Math.max(20, bh * 0.10, minSide * 0.02) : Math.max(26, bh * 0.45, minSide * 0.032);
    box = {
      x1: component.x1 - padX,
      y1: component.y1 - padTop,
      x2: component.x2 + padX,
      y2: component.y2 + padBottom,
    };
  }

  const clampedBox = {
    x1: clamp(Math.round(box.x1), 0, width - 1),
    y1: clamp(Math.round(box.y1), 0, height - 1),
    x2: clamp(Math.round(box.x2), 0, width - 1),
    y2: clamp(Math.round(box.y2), 0, height - 1),
  };
  if (tallStroke || tinyTouch) {
    paintTaperedPersonMask(out, width, height, clampedBox, component);
  } else {
    const radius = Math.max(10, Math.min(22, Math.round((clampedBox.x2 - clampedBox.x1 + 1) * 0.16)));
    paintSolidRoundedBox(out, width, height, clampedBox, radius);
  }
  return clampedBox;
}

function buildSolidStrokeObjectMask(
  userMask: { mask: Uint8Array; width: number; height: number },
  point?: { x: number; y: number } | null,
): { mask: Uint8Array; width: number; height: number; components: MaskComponent[]; boxes: MaskBox[] } {
  const { mask, width, height } = userMask;
  const solid = new Uint8Array(width * height);
  const components = findMaskComponents(mask, width, height).slice(0, 64);
  const boxes: MaskBox[] = [];

  if (!components.length && point) {
    const fallback: MaskComponent = {
      x1: point.x,
      y1: point.y,
      x2: point.x,
      y2: point.y,
      count: 1,
      cx: point.x,
      cy: point.y,
    };
    boxes.push(paintStrokeObjectMask(solid, width, height, fallback));
  }

  for (const component of components) {
    boxes.push(paintStrokeObjectMask(solid, width, height, component));
  }

  const finalRadius = Math.max(5, Math.min(12, Math.round(Math.min(width, height) * 0.006)));
  return {
    mask: dilateMask(solid, width, height, finalRadius),
    width,
    height,
    components,
    boxes,
  };
}

export function expandMaskLocally(userMaskDataUrl: string, point: { x: number; y: number }): string | null {
  const userMask = readMask(userMaskDataUrl);
  if (!userMask) return null;
  const solidObjects = buildSolidStrokeObjectMask(userMask, point);
  const merged = mergeMasks(solidObjects, { ...userMask, mask: dilateMask(userMask.mask, userMask.width, userMask.height, 10) });
  if (!merged) return null;
  console.info("[inpaint/smartExpand] solid object mask ready", {
    pixels: countMaskPixels(merged.mask),
    userPixels: userMask.count,
    components: solidObjects.components.map((c) => ({
      count: c.count,
      box: { x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2 },
    })),
    solidBoxes: solidObjects.boxes,
  });
  return pngDataUrlFromMask(merged.mask, merged.width, merged.height);
}

/**
 * Always-on UX safety net for the Red "Remove" brush: thicken the painted mask
 * by a few percent of the image's smallest side. Mobile users drag with their
 * fingertip and leave thin gaps around the object — without this padding, BRIA
 * Eraser leaves remnants (an arm, a foot, a striped sleeve). The padding is
 * small enough that it never overshoots into important background detail.
 */
export function padPaintedMask(userMaskDataUrl: string): string | null {
  const userMask = readMask(userMaskDataUrl);
  if (!userMask || userMask.count === 0) return null;
  const radius = Math.max(14, Math.min(48, Math.round(Math.min(userMask.width, userMask.height) * 0.022)));
  const padded = dilateMask(userMask.mask, userMask.width, userMask.height, radius);
  console.info("[inpaint/padMask] padded", {
    radius,
    before: userMask.count,
    after: countMaskPixels(padded),
  });
  return pngDataUrlFromMask(padded, userMask.width, userMask.height);
}

// Read width/height from a PNG or JPEG buffer without a full decode.
function readImageDimensions(mime: string, buf: Buffer): { width: number; height: number } | null {
  try {
    if (mime.includes("png")) {
      // PNG IHDR at bytes 16..23 (width, height as big-endian u32).
      if (buf.length < 24) return null;
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      return { width: w, height: h };
    }
    if (mime.includes("jpeg") || mime.includes("jpg")) {
      // Walk JPEG segments until SOF marker.
      let i = 2; // skip SOI
      while (i < buf.length) {
        if (buf[i] !== 0xff) return null;
        const marker = buf[i + 1];
        i += 2;
        // SOF markers: C0-CF except C4, C8, CC
        if (
          (marker >= 0xc0 && marker <= 0xcf) &&
          marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
        ) {
          const h = buf.readUInt16BE(i + 3);
          const w = buf.readUInt16BE(i + 5);
          return { width: w, height: h };
        }
        const segLen = buf.readUInt16BE(i);
        i += segLen;
      }
      return null;
    }
    if (mime.includes("webp")) {
      // VP8/VP8L/VP8X — try VP8X first (extended header at offset 24).
      if (buf.length < 30) return null;
      const fourcc = buf.toString("ascii", 12, 16);
      if (fourcc === "VP8X") {
        const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
        const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
        return { width: w, height: h };
      }
      if (fourcc === "VP8 ") {
        const w = buf.readUInt16LE(26) & 0x3fff;
        const h = buf.readUInt16LE(28) & 0x3fff;
        return { width: w, height: h };
      }
      if (fourcc === "VP8L") {
        const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
        const w = 1 + (((b1 & 0x3f) << 8) | b0);
        const h = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width: w, height: h };
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Ensure the mask PNG has EXACT same pixel dimensions as the image and is a
 * clean binary RGBA PNG. `zylim0702/remove-object` (LaMa) crashes with
 * "tensor a (W) must match tensor b (W2)" when the mask dimensions differ
 * even by one pixel from the image. Also re-encodes to fix "broken data
 * stream" errors that come from truncated/oddly-encoded client PNGs.
 */
export function normalizeMaskToImage(
  imageDataUrl: string,
  maskDataUrl: string,
  targetDimensions?: { width: number; height: number } | null,
): string | null {
  const imgParsed = parseImageDataUrl(imageDataUrl);
  const parsedDims = readImageDimensions(imgParsed.mime, imgParsed.buffer);
  const fallbackDims =
    targetDimensions &&
    Number.isFinite(targetDimensions.width) &&
    Number.isFinite(targetDimensions.height) &&
    targetDimensions.width > 0 &&
    targetDimensions.height > 0
      ? { width: Math.round(targetDimensions.width), height: Math.round(targetDimensions.height) }
      : null;
  const dims = parsedDims ?? fallbackDims;
  const src = readMask(maskDataUrl);
  if (!src) return null;
  if (!dims) {
    // Unknown image type — at least re-encode mask cleanly.
    return pngDataUrlFromMask(src.mask, src.width, src.height);
  }
  const { width: tw, height: th } = dims;
  console.info("[inpaint/normalizeMask] target", {
    image: { w: tw, h: th, source: parsedDims ? "header" : "client" },
    mask: { w: src.width, h: src.height, pixels: src.count },
  });
  if (src.width === tw && src.height === th) {
    // Just re-encode cleanly.
    return pngDataUrlFromMask(src.mask, tw, th);
  }
  // Nearest-neighbor resample from src → target dims.
  const out = new Uint8Array(tw * th);
  const sx = src.width / tw;
  const sy = src.height / th;
  for (let y = 0; y < th; y += 1) {
    const syi = Math.min(src.height - 1, Math.floor(y * sy));
    for (let x = 0; x < tw; x += 1) {
      const sxi = Math.min(src.width - 1, Math.floor(x * sx));
      if (src.mask[syi * src.width + sxi]) out[y * tw + x] = 1;
    }
  }
  console.info("[inpaint/normalizeMask] resized", {
    from: { w: src.width, h: src.height },
    to: { w: tw, h: th },
  });
  return pngDataUrlFromMask(out, tw, th);
}

function pngDataUrlFromGrayscale(gray: Uint8Array, width: number, height: number): string {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i += 1) {
    const v = gray[i];
    const j = i * 4;
    png.data[j] = v;
    png.data[j + 1] = v;
    png.data[j + 2] = v;
    png.data[j + 3] = 255;
  }
  return `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
}

function boxBlurSeparable(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return src;
  const tmp = new Uint8Array(width * height);
  const out = new Uint8Array(width * height);
  const win = radius * 2 + 1;
  // horizontal
  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    const row = y * width;
    for (let x = -radius; x <= radius; x += 1) sum += src[row + Math.max(0, Math.min(width - 1, x))];
    for (let x = 0; x < width; x += 1) {
      tmp[row + x] = Math.round(sum / win);
      const outX = x - radius;
      const inX = x + radius + 1;
      sum -= src[row + Math.max(0, Math.min(width - 1, outX))];
      sum += src[row + Math.max(0, Math.min(width - 1, inX))];
    }
  }
  // vertical
  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = -radius; y <= radius; y += 1) sum += tmp[Math.max(0, Math.min(height - 1, y)) * width + x];
    for (let y = 0; y < height; y += 1) {
      out[y * width + x] = Math.round(sum / win);
      const outY = y - radius;
      const inY = y + radius + 1;
      sum -= tmp[Math.max(0, Math.min(height - 1, outY)) * width + x];
      sum += tmp[Math.max(0, Math.min(height - 1, inY)) * width + x];
    }
  }
  return out;
}

/**
 * Post-normalize refinement: dilate the mask outward by `dilatePx` (default 8)
 * so SAM's razor-tight object edges don't leave a 1-2px "ghost halo" after
 * inpainting, then apply a small feather (Gaussian-like separable box blur)
 * so the new texture blends smoothly into the untouched background.
 * Input MUST already be at the target image's exact pixel dimensions.
 */
export function refineMaskForInpaint(
  maskDataUrl: string,
  options?: { dilatePx?: number; featherPx?: number },
): string | null {
  const dilatePx = Math.max(0, options?.dilatePx ?? 8);
  const featherPx = Math.max(0, options?.featherPx ?? 2);
  const src = readMask(maskDataUrl);
  if (!src || src.count === 0) return null;

  const dilated = dilateMask(src.mask, src.width, src.height, dilatePx);
  const gray = new Uint8Array(src.width * src.height);
  for (let i = 0; i < gray.length; i += 1) gray[i] = dilated[i] ? 255 : 0;
  const feathered = featherPx > 0 ? boxBlurSeparable(gray, src.width, src.height, featherPx) : gray;

  console.info("[inpaint/refineMask] dilate+feather", {
    w: src.width,
    h: src.height,
    dilatePx,
    featherPx,
    beforePx: src.count,
    afterPx: countMaskPixels(dilated),
  });
  return pngDataUrlFromGrayscale(feathered, src.width, src.height);
}