import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import {
  GALLERY_ARTWORK,
  GALLERY_CX,
  GALLERY_PAGE,
  GALLERY_PNG,
  GALLERY_QR_CAPTION,
  GALLERY_RULE_COLOR,
  type GalleryArtwork,
} from "../src/lib/templates/gallery";

const PNG_W = GALLERY_PNG.width;
const PNG_H = GALLERY_PNG.height;
const SCALE = PNG_W / GALLERY_PAGE.width;
const FRAME_W = 1280;
const FRAME_H = 720;
const FIT = Math.min(PNG_W / FRAME_W, PNG_H / FRAME_H);
const DEST_W = FRAME_W * FIT;
const DEST_H = FRAME_H * FIT;
const DEST_X = (PNG_W - DEST_W) / 2;
const DEST_Y = (PNG_H - DEST_H) / 2;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function artworkSvg(frameHref: string, artwork: GalleryArtwork): string {
  const baked = artwork.baked
    .map((line) => {
      const spacing =
        line.letterSpacing != null
          ? ` letter-spacing="${line.letterSpacing}"`
          : "";
      const weight = line.weight === "bold" ? ` font-weight="600"` : "";
      return `<text x="${GALLERY_CX}" y="${line.y}" text-anchor="middle" dominant-baseline="hanging" font-family="Helvetica, Arial, sans-serif" font-size="${line.fontSize}" fill="${line.color ?? "#4a4a4a"}"${spacing}${weight}>${escapeXml(line.text)}</text>`;
    })
    .join("\n    ");

  const rules = artwork.underlines
    .map((rule) => {
      const x1 = GALLERY_CX - rule.width / 2;
      const x2 = GALLERY_CX + rule.width / 2;
      return `<line x1="${x1}" y1="${rule.y}" x2="${x2}" y2="${rule.y}" stroke="${GALLERY_RULE_COLOR}" stroke-width="0.85"/>`;
    })
    .join("\n    ");

  const titleRuleY = (artwork.baked[0]?.y ?? 128) + 22;
  const qr = artwork.slots.qr;
  const qrCaptionY = (qr.y ?? 438) + (qr.height ?? 80) + 10;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${PNG_W}" height="${PNG_H}" viewBox="0 0 ${PNG_W} ${PNG_H}">
  <rect width="${PNG_W}" height="${PNG_H}" fill="#f4efe4"/>
  <image href="${frameHref}" x="${DEST_X}" y="${DEST_Y}" width="${DEST_W}" height="${DEST_H}" preserveAspectRatio="xMidYMid meet"/>
  <g transform="scale(${SCALE})">
    ${baked}
    <line x1="${GALLERY_CX - 70}" y1="${titleRuleY}" x2="${GALLERY_CX + 70}" y2="${titleRuleY}" stroke="${GALLERY_RULE_COLOR}" stroke-width="0.7"/>
    ${rules}
    <rect x="${qr.x}" y="${qr.y}" width="${qr.width}" height="${qr.height}" fill="none" stroke="${GALLERY_RULE_COLOR}" stroke-width="0.85"/>
    <text x="${(qr.x ?? 0) + (qr.width ?? 80) / 2}" y="${qrCaptionY}" text-anchor="middle" dominant-baseline="hanging" font-family="Helvetica, Arial, sans-serif" font-size="8" fill="#8a8a8a">${escapeXml(GALLERY_QR_CAPTION)}</text>
  </g>
</svg>`;
}

const root = process.cwd();
const framesDir = join(root, "scripts", "gallery-frames");
const outDir = join(root, "public", "template-gallery");

for (const [id, artwork] of Object.entries(GALLERY_ARTWORK)) {
  const framePath = join(framesDir, `${id}.png`);
  const frame = readFileSync(framePath);
  const href = `data:image/png;base64,${frame.toString("base64")}`;
  const svg = artworkSvg(href, artwork);
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: PNG_W },
    font: { loadSystemFonts: true },
  })
    .render()
    .asPng();
  writeFileSync(join(outDir, `${id}.png`), png);
  console.log("composed", `${id}.png`, `${PNG_W}x${PNG_H}`);
}
