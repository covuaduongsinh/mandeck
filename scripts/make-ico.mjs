// Generates build/icon.ico from docs/assets/icon.png — a single 256x256
// PNG-compressed ICO entry (valid on Windows Vista+). No image library needed:
// the ICO container just wraps the existing PNG bytes. Windows downscales the
// 256px image for smaller surfaces (taskbar, title bar).
//
// Used as the packaged Windows app icon (electron-builder auto-detects
// build/icon.ico) and as the dev window icon (see electron/main.ts).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcPng = path.join(root, "docs", "assets", "icon.png");
const outIco = path.join(root, "build", "icon.ico");

const png = fs.readFileSync(srcPng);
if (png.slice(1, 4).toString("latin1") !== "PNG") {
  throw new Error(`${srcPng} is not a PNG`);
}
// IHDR width/height are big-endian uint32 at byte offsets 16 and 20.
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: 1 = icon
header.writeUInt16LE(1, 4); // image count

const entry = Buffer.alloc(16);
entry.writeUInt8(width >= 256 ? 0 : width, 0); // 0 encodes 256
entry.writeUInt8(height >= 256 ? 0 : height, 1);
entry.writeUInt8(0, 2); // palette color count
entry.writeUInt8(0, 3); // reserved
entry.writeUInt16LE(1, 4); // color planes
entry.writeUInt16LE(32, 6); // bits per pixel
entry.writeUInt32LE(png.length, 8); // image data size
entry.writeUInt32LE(6 + 16, 12); // offset to image data

fs.mkdirSync(path.dirname(outIco), { recursive: true });
fs.writeFileSync(outIco, Buffer.concat([header, entry, png]));
console.log(`Wrote ${outIco} (${width}x${height}, ${png.length + 22} bytes)`);
