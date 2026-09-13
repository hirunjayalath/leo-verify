import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import {
  templateLayoutSchema,
  type TemplateLayout,
} from "@/lib/certificates/layout";
import { buildVerificationPath } from "@/lib/certificates/token";

export type RenderCertificateInput = {
  backgroundUrl: string;
  layout: unknown;
  recipientName: string;
  role: string;
  issueDate: string; // YYYY-MM-DD
  uniqueId: string;
  verificationToken: string;
  achievement?: string | null;
  appBaseUrl?: string;
};

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return rgb(0.04, 0.12, 0.23);
  return rgb(
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  );
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  if (url.startsWith("/") || url.includes("/uploads/")) {
    const { readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const filename = url.split("/uploads/").pop();
    if (filename) {
      const filePath = path.join(process.cwd(), "public", "uploads", filename);
      try {
        return new Uint8Array(await readFile(filePath));
      } catch {
        /* fall through to fetch */
      }
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch background: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function renderCertificatePdf(
  input: RenderCertificateInput,
): Promise<Uint8Array> {
  const parsed = templateLayoutSchema.safeParse(input.layout);
  const layout: TemplateLayout = parsed.success ? parsed.data : [];

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // A4 landscape points
  const { width, height } = page.getSize();

  try {
    const bgBytes = await fetchBytes(input.backgroundUrl);
    let image;
    try {
      image = await pdf.embedPng(bgBytes);
    } catch {
      image = await pdf.embedJpg(bgBytes);
    }
    page.drawImage(image, { x: 0, y: 0, width, height });
  } catch {
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.97, 0.97, 0.98),
    });
  }

  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const courier = await pdf.embedFont(StandardFonts.Courier);

  const values: Record<string, string> = {
    recipientName: input.recipientName,
    role: input.achievement
      ? `${input.role} · ${input.achievement}`
      : input.role,
    issueDate: input.issueDate,
    uniqueId: input.uniqueId,
  };

  const base = (input.appBaseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
  const verifyUrl = `${base}${buildVerificationPath(input.uniqueId, input.verificationToken)}`;

  for (const field of layout) {
    if (field.field === "qr") {
      const qrPng = await QRCode.toBuffer(verifyUrl, {
        type: "png",
        margin: 1,
        width: 256,
      });
      const qrImage = await pdf.embedPng(qrPng);
      const size = field.width ?? 80;
      // Fabric y is top-down; PDF y is bottom-up
      const y = height - (field.y + size);
      page.drawImage(qrImage, {
        x: field.x,
        y,
        width: size,
        height: field.height ?? size,
      });
      continue;
    }

    const text = values[field.field] ?? "";
    const fontSize = field.fontSize ?? 16;
    const font =
      field.fontFamily?.toLowerCase().includes("courier") ? courier : helvetica;
    const color = hexToRgb(field.color ?? "#0b1f3a");
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x = field.x;
    if (field.align === "center") x = field.x - textWidth / 2;
    if (field.align === "right") x = field.x - textWidth;
    const y = height - field.y - fontSize;
    page.drawText(text, { x, y, size: fontSize, font, color });
  }

  return pdf.save();
}
