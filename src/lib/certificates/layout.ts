import { z } from "zod";

const mergeField = z.enum([
  "recipientName",
  "role",
  "issueDate",
  "uniqueId",
  "qr",
  "eventName",
  "clubName",
  "achievement",
  "staticText",
  "imageStamp",
]);

const signatureField = z.enum(["signature1", "signature2"]);

export const layoutFieldSchema = z.object({
  field: z.union([mergeField, signatureField]),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  color: z.string().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  text: z.string().optional(),
  imageUrl: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().url().optional(),
  ),
});

export const templateLayoutSchema = z.array(layoutFieldSchema);

export type LayoutField = z.infer<typeof layoutFieldSchema>;
export type TemplateLayout = z.infer<typeof templateLayoutSchema>;

export type PageSize = "a4_landscape" | "a4_portrait";

export function pageDimensions(pageSize: PageSize = "a4_landscape"): {
  width: number;
  height: number;
} {
  return pageSize === "a4_portrait"
    ? { width: 595, height: 842 }
    : { width: 842, height: 595 };
}

export function isSignatureField(
  field: LayoutField["field"],
): field is "signature1" | "signature2" {
  return field === "signature1" || field === "signature2";
}

export function isImageOverlayField(
  field: LayoutField["field"],
): field is "signature1" | "signature2" | "qr" | "imageStamp" {
  return (
    field === "signature1" ||
    field === "signature2" ||
    field === "qr" ||
    field === "imageStamp"
  );
}

export const DEFAULT_LAYOUT: TemplateLayout = [
  {
    field: "recipientName",
    x: 297,
    y: 280,
    fontSize: 28,
    fontFamily: "Helvetica",
    color: "#323232",
    align: "center",
  },
  {
    field: "role",
    x: 297,
    y: 330,
    fontSize: 16,
    fontFamily: "Helvetica",
    color: "#646464",
    align: "center",
  },
  {
    field: "issueDate",
    x: 297,
    y: 380,
    fontSize: 14,
    fontFamily: "Helvetica",
    color: "#646464",
    align: "center",
  },
  {
    field: "uniqueId",
    x: 40,
    y: 540,
    fontSize: 10,
    fontFamily: "Courier",
    color: "#646464",
    align: "left",
  },
  {
    field: "qr",
    x: 480,
    y: 480,
    width: 80,
    height: 80,
  },
];
