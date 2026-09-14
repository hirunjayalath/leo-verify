"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlignCenter,
  AlignLeft,
  Minus,
  Plus,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Canvas, FabricImage, FabricText, Rect, type FabricObject } from "fabric";
import { toast } from "sonner";
import { saveTemplateLayoutAction } from "@/app/(admin)/admin/templates/actions";
import type { LayoutField, TemplateLayout } from "@/lib/certificates/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const FIELD_LABELS: Record<LayoutField["field"], string> = {
  recipientName: "Recipient name",
  role: "Role",
  issueDate: "Issue date",
  uniqueId: "Certificate ID",
  qr: "QR code",
};

const FIELD_KEYS = Object.keys(FIELD_LABELS) as LayoutField["field"][];

const CANVAS_W = 842;
const CANVAS_H = 595;
const BRAND_HEX = "#0b1f3a";

type Props = {
  templateId: string;
  backgroundUrl: string;
  initialLayout: TemplateLayout;
};

export function TemplateDesigner({
  templateId,
  backgroundUrl,
  initialLayout,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [zoom, setZoom] = useState(0.75);
  const [selectedKey, setSelectedKey] = useState<LayoutField["field"] | null>(
    null,
  );
  const [fontSize, setFontSize] = useState(18);
  const [color, setColor] = useState(BRAND_HEX);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function fit() {
      const el = stageRef.current;
      if (!el) return;
      const pad = 48;
      const available = Math.max(280, el.clientWidth - pad);
      const next = Math.min(1.25, Math.max(0.35, available / CANVAS_W));
      setZoom(Number(next.toFixed(2)));
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new Canvas(canvasRef.current, {
      width: CANVAS_W,
      height: CANVAS_H,
      selection: true,
      backgroundColor: "#ffffff",
    });
    fabricRef.current = canvas;

    const markDirty = () => setDirty(true);
    canvas.on("object:modified", markDirty);
    canvas.on("object:moving", markDirty);
    canvas.on("object:scaling", markDirty);
    canvas.on("selection:created", (e) => syncSelection(e.selected?.[0]));
    canvas.on("selection:updated", (e) => syncSelection(e.selected?.[0]));
    canvas.on("selection:cleared", () => setSelectedKey(null));

    let cancelled = false;

    async function load() {
      try {
        const img = await FabricImage.fromURL(backgroundUrl, {
          crossOrigin: "anonymous",
        });
        if (cancelled) return;
        const scale = Math.min(
          CANVAS_W / (img.width || CANVAS_W),
          CANVAS_H / (img.height || CANVAS_H),
        );
        img.set({
          selectable: false,
          evented: false,
          scaleX: scale,
          scaleY: scale,
          left: 0,
          top: 0,
          originX: "left",
          originY: "top",
        });
        canvas.backgroundImage = img;

        for (const field of initialLayout) {
          if (field.field === "qr") {
            const box = new Rect({
              left: field.x,
              top: field.y,
              width: field.width ?? 80,
              height: field.height ?? 80,
              fill: "rgba(201,162,39,0.25)",
              stroke: "#c9a227",
              strokeWidth: 2,
            });
            (box as unknown as { fieldKey: string }).fieldKey = field.field;
            canvas.add(box);
          } else {
            const text = new FabricText(FIELD_LABELS[field.field], {
              left: field.x,
              top: field.y,
              fontSize: field.fontSize ?? 18,
              fill: field.color ?? BRAND_HEX,
              fontFamily: field.fontFamily ?? "Helvetica",
              originX: field.align === "center" ? "center" : "left",
            });
            (text as unknown as { fieldKey: string }).fieldKey = field.field;
            canvas.add(text);
          }
        }
        canvas.requestRenderAll();
      } catch {
        toast.error(
          "Could not load background image (CORS). Layout can still be saved.",
        );
      }
    }

    void load();

    return () => {
      cancelled = true;
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [backgroundUrl, initialLayout]);

  function syncSelection(obj?: FabricObject) {
    if (!obj) {
      setSelectedKey(null);
      return;
    }
    const key = (obj as unknown as { fieldKey?: LayoutField["field"] }).fieldKey;
    setSelectedKey(key ?? null);
    if (obj instanceof FabricText) {
      setFontSize(Math.round(obj.fontSize ?? 18));
      setColor(String(obj.fill ?? BRAND_HEX));
    }
  }

  function findByKey(key: LayoutField["field"]) {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    return (
      canvas
        .getObjects()
        .find(
          (obj) =>
            (obj as unknown as { fieldKey?: string }).fieldKey === key,
        ) ?? null
    );
  }

  function selectField(key: LayoutField["field"]) {
    const canvas = fabricRef.current;
    const obj = findByKey(key);
    if (!canvas || !obj) return;
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    syncSelection(obj);
  }

  function updateActiveText(patch: {
    fontSize?: number;
    fill?: string;
    originX?: "left" | "center";
  }) {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !(active instanceof FabricText)) return;
    active.set(patch);
    canvas.requestRenderAll();
    setDirty(true);
    if (patch.fontSize != null) setFontSize(patch.fontSize);
    if (patch.fill != null) setColor(patch.fill);
  }

  function collectLayout(): TemplateLayout {
    const canvas = fabricRef.current;
    if (!canvas) return initialLayout;
    const layout: TemplateLayout = [];
    for (const obj of canvas.getObjects()) {
      const fieldKey = (obj as unknown as { fieldKey?: LayoutField["field"] })
        .fieldKey;
      if (!fieldKey) continue;
      if (fieldKey === "qr") {
        layout.push({
          field: "qr",
          x: Math.round(obj.left ?? 0),
          y: Math.round(obj.top ?? 0),
          width: Math.round((obj.width ?? 80) * (obj.scaleX ?? 1)),
          height: Math.round((obj.height ?? 80) * (obj.scaleY ?? 1)),
        });
      } else {
        const text = obj as FabricText;
        layout.push({
          field: fieldKey,
          x: Math.round(text.left ?? 0),
          y: Math.round(text.top ?? 0),
          fontSize: Math.round(text.fontSize ?? 18),
          fontFamily: text.fontFamily ?? "Helvetica",
          color: String(text.fill ?? BRAND_HEX),
          align: text.originX === "center" ? "center" : "left",
        });
      }
    }
    return layout.length > 0 ? layout : initialLayout;
  }

  function onSave() {
    const layout = collectLayout();
    startTransition(async () => {
      const result = await saveTemplateLayoutAction({ templateId, layout });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDirty(false);
      toast.success("Layout saved");
    });
  }

  function fitZoom() {
    const el = stageRef.current;
    if (!el) return;
    const available = Math.max(280, el.clientWidth - 48);
    setZoom(Number(Math.min(1.25, Math.max(0.35, available / CANVAS_W)).toFixed(2)));
  }

  const textSelected = selectedKey != null && selectedKey !== "qr";

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-20 space-y-3 rounded-xl border border-border bg-card/95 p-3 shadow-elevated backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/templates"
            className="mr-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={(e) => {
              if (
                dirty &&
                !window.confirm(
                  "You have unsaved layout changes. Leave without saving?",
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            ← Back to templates
          </Link>
          <div className="hidden flex-wrap gap-1 md:flex">
            {FIELD_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => selectField(key)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  selectedKey === key
                    ? "bg-brand text-brand-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {FIELD_LABELS[key]}
              </button>
            ))}
          </div>
          <div className="w-full md:hidden">
            <Select
              aria-label="Select field"
              value={selectedKey ?? ""}
              onChange={(e) => {
                const key = e.target.value as LayoutField["field"];
                if (key) selectField(key);
              }}
            >
              <option value="">Select field…</option>
              {FIELD_KEYS.map((key) => (
                <option key={key} value={key}>
                  {FIELD_LABELS[key]}
                </option>
              ))}
            </Select>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <a
              href={`/api/templates/${templateId}/preview`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Preview PDF
            </a>
            <Button type="button" onClick={onSave} disabled={pending}>
              {pending && <Spinner />}
              <span className="relative">
                Save layout
                {dirty && (
                  <span
                    className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-accent"
                    aria-label="Unsaved changes"
                  />
                )}
              </span>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              Text
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Decrease font size"
              disabled={!textSelected}
              onClick={() =>
                updateActiveText({ fontSize: Math.max(8, fontSize - 1) })
              }
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Input
              type="number"
              className="h-8 w-16 text-center"
              value={fontSize}
              disabled={!textSelected}
              aria-label="Font size"
              onChange={(e) =>
                updateActiveText({
                  fontSize: Math.max(8, Number(e.target.value) || 18),
                })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Increase font size"
              disabled={!textSelected}
              onClick={() => updateActiveText({ fontSize: fontSize + 1 })}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <input
              type="color"
              value={color}
              disabled={!textSelected}
              aria-label="Text color"
              className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent disabled:opacity-40"
              onChange={(e) => updateActiveText({ fill: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Align left"
              disabled={!textSelected}
              onClick={() => updateActiveText({ originX: "left" })}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Align center"
              disabled={!textSelected}
              onClick={() => updateActiveText({ originX: "center" })}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
          </div>

          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              Zoom
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Zoom out"
              onClick={() =>
                setZoom((z) => Math.max(0.35, Number((z - 0.1).toFixed(2))))
              }
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <button
              type="button"
              className="min-w-14 rounded-md px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground hover:bg-muted"
              onClick={() => setZoom(1)}
              aria-label="Reset zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Zoom in"
              onClick={() =>
                setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))
              }
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={fitZoom}>
              Fit
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={stageRef}
        className="checkerboard overflow-auto rounded-xl border border-border p-6"
      >
        <div
          className="mx-auto origin-top shadow-float transition-transform"
          style={{
            width: CANVAS_W * zoom,
            height: CANVAS_H * zoom,
          }}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              width: CANVAS_W,
              height: CANVAS_H,
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>

      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Drag placeholders on the artboard. On narrow screens, use the field
        selector and scroll horizontally if needed. Coordinates are stored as
        layout JSON (templates are data — Rule 5).
      </p>
    </div>
  );
}
