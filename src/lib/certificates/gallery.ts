import { DEFAULT_LAYOUT, type TemplateLayout } from "@/lib/certificates/layout";

export type GalleryPreset = {
  id: string;
  name: string;
  category: string;
  /** Path under /public */
  backgroundPath: string;
  layout: TemplateLayout;
};

const centeredTextLayout = (
  titleY: number,
): TemplateLayout => [
  {
    field: "staticText",
    x: 421,
    y: titleY,
    fontSize: 22,
    fontFamily: "Helvetica",
    color: "#323232",
    align: "center",
    text: "Certificate of Achievement",
  },
  {
    field: "recipientName",
    x: 421,
    y: 280,
    fontSize: 32,
    fontFamily: "Helvetica",
    color: "#323232",
    align: "center",
  },
  {
    field: "role",
    x: 421,
    y: 340,
    fontSize: 16,
    fontFamily: "Helvetica",
    color: "#646464",
    align: "center",
  },
  {
    field: "eventName",
    x: 421,
    y: 380,
    fontSize: 14,
    fontFamily: "Helvetica",
    color: "#646464",
    align: "center",
  },
  {
    field: "issueDate",
    x: 421,
    y: 420,
    fontSize: 12,
    fontFamily: "Helvetica",
    color: "#646464",
    align: "center",
  },
  {
    field: "clubName",
    x: 80,
    y: 520,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#646464",
    align: "left",
  },
  {
    field: "uniqueId",
    x: 80,
    y: 545,
    fontSize: 9,
    fontFamily: "Courier",
    color: "#646464",
    align: "left",
  },
  {
    field: "qr",
    x: 680,
    y: 470,
    width: 90,
    height: 90,
  },
];

export const TEMPLATE_GALLERY: GalleryPreset[] = [
  {
    id: "completion",
    name: "Completion",
    category: "Training",
    backgroundPath: "/template-gallery/completion.png",
    layout: centeredTextLayout(180),
  },
  {
    id: "participation",
    name: "Participation",
    category: "Events",
    backgroundPath: "/template-gallery/participation.png",
    layout: centeredTextLayout(170),
  },
  {
    id: "appreciation",
    name: "Appreciation",
    category: "Service",
    backgroundPath: "/template-gallery/appreciation.png",
    layout: centeredTextLayout(175),
  },
  {
    id: "training",
    name: "Training",
    category: "Training",
    backgroundPath: "/template-gallery/training.png",
    layout: centeredTextLayout(180),
  },
  {
    id: "leadership",
    name: "Leadership",
    category: "Leadership",
    backgroundPath: "/template-gallery/leadership.png",
    layout: centeredTextLayout(175),
  },
  {
    id: "service",
    name: "Service",
    category: "Service",
    backgroundPath: "/template-gallery/service.png",
    layout: centeredTextLayout(180),
  },
  {
    id: "workshop",
    name: "Workshop",
    category: "Events",
    backgroundPath: "/template-gallery/workshop.png",
    layout: centeredTextLayout(170),
  },
  {
    id: "excellence",
    name: "Excellence",
    category: "Awards",
    backgroundPath: "/template-gallery/excellence.png",
    layout: [
      ...centeredTextLayout(160),
      {
        field: "achievement",
        x: 421,
        y: 400,
        fontSize: 14,
        fontFamily: "Helvetica",
        color: "#38a3e3",
        align: "center",
      },
    ],
  },
];

export function galleryById(id: string): GalleryPreset | undefined {
  return TEMPLATE_GALLERY.find((g) => g.id === id);
}

export { DEFAULT_LAYOUT };
