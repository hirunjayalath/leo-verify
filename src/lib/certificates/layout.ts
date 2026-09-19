import { z } from "zod";

export const layoutFieldSchema = z.object({
  field: z.enum(["recipientName", "role", "issueDate", "uniqueId", "qr"]),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  color: z.string().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
});

export const templateLayoutSchema = z.array(layoutFieldSchema);

export type LayoutField = z.infer<typeof layoutFieldSchema>;
export type TemplateLayout = z.infer<typeof templateLayoutSchema>;

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
