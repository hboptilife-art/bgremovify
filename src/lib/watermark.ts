// Tiled diagonal watermark that matches the on-screen preview overlay.
// The preview shows "bgremovify.com" repeated on a -30° grid at ~16% opacity;
// we bake the exact same pattern into the exported PNG so the download looks
// identical to what the user sees on the free-tier preview card.

export async function watermarkPngBlob(
  input: Blob,
  label = "bgremovify.com",
): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(input);
    const w = bitmap.width;
    const h = bitmap.height;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return input;

    // 1) Original cutout underneath.
    ctx.drawImage(bitmap, 0, 0);

    // 2) Tiled diagonal stamp on top, matching the preview overlay.
    const fontPx = Math.max(18, Math.round(Math.min(w, h) * 0.038));
    ctx.font = `700 ${fontPx}px "Inter", "Helvetica Neue", Arial, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const textWidth = ctx.measureText(label).width;
    const stepX = textWidth + fontPx * 1.6; // horizontal gap between stamps
    const stepY = fontPx * 2.4;             // vertical gap between rows

    ctx.save();
    // Rotate around the canvas centre so the grid covers everything after
    // rotation — same -30° angle used by the preview overlay.
    ctx.translate(w / 2, h / 2);
    ctx.rotate((-30 * Math.PI) / 180);

    // Oversize the tiling grid so rotation never leaves empty corners.
    const diag = Math.ceil(Math.sqrt(w * w + h * h)) + stepX;
    const startX = -diag;
    const endX = diag;
    const startY = -diag;
    const endY = diag;

    // Güvenlik basımı: siyah araç gövdesinde ve şeffaf arka planda net
    // okunacak şekilde beyaz metin + ince siyah kontur, %38 opaklık.
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = Math.max(1, fontPx * 0.06);

    let row = 0;
    for (let y = startY; y <= endY; y += stepY) {
      // Offset alternating rows for a nicer brick-like pattern.
      const offset = row % 2 === 0 ? 0 : stepX / 2;
      for (let x = startX; x <= endX; x += stepX) {
        ctx.strokeText(label, x + offset, y);
        ctx.fillText(label, x + offset, y);
      }
      row++;
    }

    ctx.restore();
    ctx.globalAlpha = 1;

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b ?? input), "image/png");
    });
  } catch (err) {
    console.warn("[watermark] failed, returning original", err);
    return input;
  }
}
