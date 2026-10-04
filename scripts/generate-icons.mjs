// Gera os ícones PWA (núcleo ciano sobre fundo escuro) sem dependências externas.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buf) {
  let c, crc = ~0;
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, scale) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c) / (c * scale); // 0 centro, 1 borda do orbe
      let r = 5, g = 7, b = 13;
      const glow = Math.max(0, 1 - d / 1.5);
      r += 20 * glow * glow; g += 190 * glow * glow; b += 215 * glow * glow;
      if (d < 0.5) { const t = 1 - d / 0.5; r = 60 + 190 * t * t; g = 200 + 55 * t; b = 235 + 20 * t; }
      if (Math.abs(d - 0.78) < 0.012) { r = 34; g = 211; b = 238; }
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = Math.min(255, r); raw[i + 1] = Math.min(255, g); raw[i + 2] = Math.min(255, b); raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const out = "public/icons/";
writeFileSync(out + "icon-192.png", png(192, 1));
writeFileSync(out + "icon-512.png", png(512, 1));
writeFileSync(out + "icon-maskable-512.png", png(512, 0.72)); // zona segura para máscara
writeFileSync(out + "apple-touch-icon.png", png(180, 0.85));
console.log("ícones gerados em", out);
