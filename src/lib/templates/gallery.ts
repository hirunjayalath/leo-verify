import { DEFAULT_LAYOUT, type TemplateLayout } from "@/lib/certificates/layout";

export type GalleryFamily = "completion" | "appreciation";

export type GalleryPreset = {
  id: string;
  name: string;
  category: string;
  backgroundPath: string;
  family: GalleryFamily;
  layout: TemplateLayout;
};

export const GALLERY_PAGE = { width: 842, height: 595 } as const;
export const GALLERY_CX = 421;
export const GALLERY_RULE_COLOR = "#c4b48a";
export const GALLERY_QR_CAPTION = "Scan to verify";
/** 2× A4 landscape. Compose output and designer export target. */
export const GALLERY_PNG = { width: 1684, height: 1190 } as const;

const BODY = "#4a4a4a";
const NAVY = "#323232";
const TEAL = "#38a3e3";

export type GallerySlot = {
  x: number;
  y: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  align?: "left" | "center" | "right";
  width?: number;
  height?: number;
};

export type GalleryBakedLine = {
  text: string;
  y: number;
  fontSize: number;
  letterSpacing?: number;
  color?: string;
  weight?: "normal" | "bold";
};

export type GalleryMergeField =
  | "recipientName"
  | "role"
  | "eventName"
  | "achievement"
  | "issueDate"
  | "clubName"
  | "uniqueId"
  | "qr";

export type GallerySlots = Record<GalleryMergeField, GallerySlot>;

export type GalleryArtwork = {
  title: string;
  family: GalleryFamily;
  baked: GalleryBakedLine[];
  slots: GallerySlots;
  underlines: { y: number; width: number }[];
};

function underlineBelow(slot: GallerySlot, width: number): { y: number; width: number } {
  return { y: slot.y + (slot.fontSize ?? 16) + 4, width };
}

function footerSlots(overrides: Partial<GallerySlots> = {}): GallerySlots {
  return {
    recipientName: {
      x: GALLERY_CX,
      y: 218,
      fontSize: 30,
      color: NAVY,
      align: "center",
    },
    role: { x: GALLERY_CX, y: 374, fontSize: 15, color: NAVY, align: "center" },
    eventName: {
      x: GALLERY_CX,
      y: 306,
      fontSize: 14,
      color: NAVY,
      align: "center",
    },
    achievement: {
      x: GALLERY_CX,
      y: 412,
      fontSize: 13,
      color: TEAL,
      align: "center",
    },
    issueDate: {
      x: GALLERY_CX,
      y: 448,
      fontSize: 12,
      color: BODY,
      align: "center",
    },
    clubName: { x: 110, y: 498, fontSize: 11, color: BODY, align: "left" },
    uniqueId: {
      x: 110,
      y: 526,
      fontSize: 9,
      fontFamily: "Courier",
      color: BODY,
      align: "left",
    },
    qr: { x: 668, y: 438, width: 80, height: 80 },
    ...overrides,
  };
}

function completionArtwork(title: string): GalleryArtwork {
  const slots = footerSlots();
  return {
    title,
    family: "completion",
    baked: [
      { text: title, y: 128, fontSize: 15, letterSpacing: 4.2, color: NAVY, weight: "bold" },
      { text: "This is to certify that", y: 168, fontSize: 13, color: BODY },
      { text: "has successfully completed", y: 272, fontSize: 13, color: BODY },
      { text: "in the capacity of", y: 342, fontSize: 13, color: BODY },
    ],
    slots,
    underlines: [
      underlineBelow(slots.recipientName, 280),
      underlineBelow(slots.eventName, 260),
      underlineBelow(slots.role, 200),
      underlineBelow(slots.issueDate, 110),
    ],
  };
}

function appreciationArtwork(title: string): GalleryArtwork {
  const slots = footerSlots({
    role: { x: GALLERY_CX, y: 308, fontSize: 15, color: NAVY, align: "center" },
    eventName: {
      x: GALLERY_CX,
      y: 376,
      fontSize: 14,
      color: NAVY,
      align: "center",
    },
    achievement: {
      x: GALLERY_CX,
      y: 412,
      fontSize: 13,
      color: TEAL,
      align: "center",
    },
  });
  return {
    title,
    family: "appreciation",
    baked: [
      { text: title, y: 132, fontSize: 15, letterSpacing: 4.2, color: NAVY, weight: "bold" },
      { text: "This certificate is presented to", y: 168, fontSize: 13, color: BODY },
      { text: "in recognition of dedicated service as", y: 272, fontSize: 13, color: BODY },
      { text: "during", y: 344, fontSize: 13, color: BODY },
    ],
    slots,
    underlines: [
      underlineBelow(slots.recipientName, 280),
      underlineBelow(slots.role, 200),
      underlineBelow(slots.eventName, 260),
      underlineBelow(slots.issueDate, 110),
    ],
  };
}

export function layoutFromSlots(slots: GallerySlots): TemplateLayout {
  const order: GalleryMergeField[] = [
    "recipientName",
    "role",
    "eventName",
    "achievement",
    "issueDate",
    "clubName",
    "uniqueId",
    "qr",
  ];
  return order.map((field) => {
    const slot = slots[field];
    if (field === "qr") {
      return {
        field,
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
      };
    }
    return {
      field,
      x: slot.x,
      y: slot.y,
      fontSize: slot.fontSize,
      fontFamily: slot.fontFamily ?? "Helvetica",
      color: slot.color ?? BODY,
      align: slot.align ?? "center",
    };
  });
}

export const GALLERY_ARTWORK: Record<string, GalleryArtwork> = {
  completion: completionArtwork("CERTIFICATE OF COMPLETION"),
  appreciation: appreciationArtwork("CERTIFICATE OF APPRECIATION"),
};

const PRESETS: Omit<GalleryPreset, "layout" | "family">[] = [
  {
    id: "appreciation",
    name: "Appreciation",
    category: "Service",
    backgroundPath: "/template-gallery/appreciation.png",
  },
  {
    id: "completion",
    name: "Completion",
    category: "Training",
    backgroundPath: "/template-gallery/completion.png",
  },
];

export const TEMPLATE_GALLERY: GalleryPreset[] = PRESETS.map((preset) => {
  const artwork = GALLERY_ARTWORK[preset.id];
  if (!artwork) throw new Error(`Missing gallery artwork: ${preset.id}`);
  return {
    ...preset,
    family: artwork.family,
    layout: layoutFromSlots(artwork.slots),
  };
});

export function galleryById(id: string): GalleryPreset | undefined {
  return TEMPLATE_GALLERY.find((g) => g.id === id);
}

export { DEFAULT_LAYOUT };
