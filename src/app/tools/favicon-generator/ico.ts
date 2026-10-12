/**
 * Minimal ICO writer: PNG-compressed entries (supported by every browser and
 * by Windows since Vista). Each entry must be a square RGBA PNG ≤ 256 px.
 */
export async function packIco(entries: { size: number; png: Blob }[]): Promise<Blob> {
  const datas = await Promise.all(entries.map((e) => e.png.arrayBuffer()));
  const headerSize = 6 + 16 * entries.length;
  const header = new DataView(new ArrayBuffer(headerSize));
  header.setUint16(0, 0, true); // reserved
  header.setUint16(2, 1, true); // type 1 = icon
  header.setUint16(4, entries.length, true);
  let offset = headerSize;
  entries.forEach((entry, i) => {
    const o = 6 + 16 * i;
    const dim = entry.size >= 256 ? 0 : entry.size; // 0 means 256
    header.setUint8(o, dim); // width
    header.setUint8(o + 1, dim); // height
    header.setUint8(o + 2, 0); // palette colours
    header.setUint8(o + 3, 0); // reserved
    header.setUint16(o + 4, 1, true); // colour planes
    header.setUint16(o + 6, 32, true); // bits per pixel
    header.setUint32(o + 8, datas[i].byteLength, true);
    header.setUint32(o + 12, offset, true);
    offset += datas[i].byteLength;
  });
  return new Blob([header.buffer, ...datas], { type: "image/x-icon" });
}

/** Re-encode as a plain 32-bit RGBA PNG (optimised PNGs may be palette/grey, which some ICO readers reject). */
export async function toRgbaPng(blob: Blob, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), "image/png"));
}
