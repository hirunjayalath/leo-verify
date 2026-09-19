import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Minimal RGB PNG writer for gallery placeholders. */
function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function pngRGB(width: number, height: number, fill: [number, number, number]): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 3;
      // subtle vertical gradient
      const t = y / height;
      raw[i] = Math.min(255, Math.round(fill[0] * (1 - t * 0.15)));
      raw[i + 1] = Math.min(255, Math.round(fill[1] * (1 - t * 0.1)));
      raw[i + 2] = Math.min(255, Math.round(fill[2] * (1 - t * 0.05)));
      // border frame
      if (x < 24 || x >= width - 24 || y < 24 || y >= height - 24) {
        raw[i] = 50;
        raw[i + 1] = 50;
        raw[i + 2] = 50;
      }
      if (
        (x >= 24 && x < 28) ||
        (x >= width - 28 && x < width - 24) ||
        (y >= 24 && y < 28) ||
        (y >= height - 28 && y < height - 24)
      ) {
        raw[i] = 56;
        raw[i + 1] = 163;
        raw[i + 2] = 227;
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = join(process.cwd(), "public", "template-gallery");
mkdirSync(dir, { recursive: true });

const specs: { file: string; rgb: [number, number, number] }[] = [
  { file: "completion.png", rgb: [245, 250, 255] },
  { file: "participation.png", rgb: [248, 252, 248] },
  { file: "appreciation.png", rgb: [255, 250, 245] },
  { file: "training.png", rgb: [245, 248, 255] },
  { file: "leadership.png", rgb: [250, 245, 255] },
  { file: "service.png", rgb: [245, 255, 252] },
  { file: "workshop.png", rgb: [255, 248, 250] },
  { file: "excellence.png", rgb: [252, 252, 245] },
];

for (const s of specs) {
  // A4 landscape @ 72dpi ≈ 842x595; use 2x for sharper backgrounds
  writeFileSync(join(dir, s.file), pngRGB(1684, 1190, s.rgb));
  console.log("wrote", s.file);
}
