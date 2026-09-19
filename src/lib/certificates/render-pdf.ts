import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import {
  pageDimensions,
  templateLayoutSchema,
  type PageSize,
  type TemplateLayout,
} from "@/lib/certificates/layout";
import { fetchBackgroundBytes } from "@/lib/certificates/safe-fetch";
import { buildVerificationPath } from "@/lib/certificates/token";
import { getPublicEnv } from "@/lib/env";

export type RenderCertificateInput = {
  backgroundUrl: string;
  /** When set (e.g. bulk import), skip re-fetching the same template background. */
  backgroundBytes?: Uint8Array;
  layout: unknown;
  recipientName: string;
  role: string;
  issueDate: string;
  uniqueId: string;
  verificationToken: string;
  achievement?: string | null;
  eventName?: string | null;
  clubName?: string | null;
  pageSize?: PageSize;
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

async function tryEmbedCustomFont(pdf: PDFDocument) {
  try {
    const path = join(process.cwd(), "public/fonts/Poppins-Regular.ttf");
    const bytes = await readFile(path);
    return await pdf.embedFont(bytes);
  } catch {
    return null;
  }
}

export async function renderCertificatePdf(
  input: RenderCertificateInput,
): Promise<Uint8Array> {
  const parsed = templateLayoutSchema.safeParse(input.layout);
  const layout: TemplateLayout = parsed.success ? parsed.data : [];
  const dims = pageDimensions(input.pageSize ?? "a4_landscape");

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([dims.width, dims.height]);
  const { width, height } = page.getSize();

  try {
    const bgBytes =
      input.backgroundBytes ??
      (await fetchBackgroundBytes(input.backgroundUrl));
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
  const poppins = await tryEmbedCustomFont(pdf);

  const values: Record<string, string> = {
    recipientName: input.recipientName,
    role: input.role,
    achievement: input.achievement ?? "",
    issueDate: input.issueDate,
    uniqueId: input.uniqueId,
    eventName: input.eventName ?? "",
    clubName: input.clubName ?? "",
  };

  const base = (
    input.appBaseUrl ?? getPublicEnv().NEXT_PUBLIC_APP_URL
  ).replace(/\/$/, "");
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
      const y = height - (field.y + size);
      page.drawImage(qrImage, {
        x: field.x,
        y,
        width: size,
        height: field.height ?? size,
      });
      continue;
    }

    if (
      field.field === "signature1" ||
      field.field === "signature2" ||
      field.field === "imageStamp"
    ) {
      if (!field.imageUrl) continue;
      try {
        const sigBytes = await fetchBackgroundBytes(field.imageUrl);
        let sigImage;
        try {
          sigImage = await pdf.embedPng(sigBytes);
        } catch {
          sigImage = await pdf.embedJpg(sigBytes);
        }
        const w = field.width ?? 140;
        const h = field.height ?? 60;
        const y = height - (field.y + h);
        page.drawImage(sigImage, { x: field.x, y, width: w, height: h });
      } catch {
        /* skip */
      }
      continue;
    }

    const text =
      field.field === "staticText"
        ? (field.text ?? "")
        : (values[field.field] ?? "");
    if (!text) continue;

    const fontSize = field.fontSize ?? 16;
    const family = (field.fontFamily ?? "Helvetica").toLowerCase();
    const font = family.includes("courier")
      ? courier
      : family.includes("poppins") && poppins
        ? poppins
        : helvetica;
    const color = hexToRgb(field.color ?? "#323232");
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x = field.x;
    if (field.align === "center") x = field.x - textWidth / 2;
    if (field.align === "right") x = field.x - textWidth;
    const y = height - field.y - fontSize;
    page.drawText(text, { x, y, size: fontSize, font, color });
  }

  return pdf.save();
}
