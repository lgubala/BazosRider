#!/usr/bin/env node
/* Draws icons/icon-{16,32,48,96,128}.png from the shapes in docs/icon/icon.svg.
 * Plain Node, no image library: run `node docs/icon/make-icons.js icons`. */
const zlib = require("zlib"), fs = require("fs");
const out = process.argv[2];
const ORANGE = [0xe8, 0x74, 0x1c], WHITE = [255, 255, 255];

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}
// A "D" shape: rectangle from xl to xc, then a half disc of radius r centred at (xc, cy).
function inD(x, y, xl, xc, cy, r) {
  if (y < cy - r || y > cy + r || x < xl) return false;
  return x <= xc || (x - xc) ** 2 + (y - cy) ** 2 <= r * r;
}
function inB(x, y) {
  const stem = x >= 14 && x <= 20 && y >= 11 && y <= 37;
  const upper = inD(x, y, 14, 25, 17.25, 6.25) && !inD(x, y, 20, 25, 17.25, 2.4);
  const lower = inD(x, y, 14, 26, 30, 7) && !inD(x, y, 20, 26, 30, 3);
  return stem || upper || lower;
}
function pixel(x, y) {
  if (!inRoundRect(x, y, 2, 2, 46, 46, 10)) return null;
  return inB(x, y) ? WHITE : ORANGE;
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const SS = 6, raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = pixel(((px + (sx + 0.5) / SS) / size) * 48, ((py + (sy + 0.5) / SS) / size) * 48);
        if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
      }
      const o = py * (size * 4 + 1) + 1 + px * 4;
      raw[o] = a ? Math.round(r / a) : 0; raw[o + 1] = a ? Math.round(g / a) : 0;
      raw[o + 2] = a ? Math.round(b / a) : 0; raw[o + 3] = Math.round((a / (SS * SS)) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
for (const s of [16, 32, 48, 96, 128]) fs.writeFileSync(`${out}/icon-${s}.png`, png(s));
console.log("ok");
