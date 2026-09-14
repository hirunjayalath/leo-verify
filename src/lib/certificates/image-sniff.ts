const MAX_TEMPLATE_BYTES = 5 * 1024 * 1024;

export type ImageSniffResult =
  | { ok: true; ext: "png" | "jpg" | "webp"; contentType: string }
  | { ok: false; error: string };

export function sniffImageBytes(bytes: Buffer): ImageSniffResult {
  if (bytes.length > MAX_TEMPLATE_BYTES) {
    return { ok: false, error: "Image must be 5 MB or smaller" };
  }
  if (bytes.length < 12) {
    return { ok: false, error: "File is too small to be an image" };
  }
  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { ok: true, ext: "png", contentType: "image/png" };
  }
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ok: true, ext: "jpg", contentType: "image/jpeg" };
  }
  // WEBP (RIFF....WEBP)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ok: true, ext: "webp", contentType: "image/webp" };
  }
  return { ok: false, error: "Only PNG, JPEG, or WebP images are allowed" };
}

export const MAX_TEMPLATE_UPLOAD_BYTES = MAX_TEMPLATE_BYTES;
