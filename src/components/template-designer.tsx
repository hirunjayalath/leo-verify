"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Canvas, FabricImage, FabricText, Rect } from "fabric";
import { saveTemplateLayoutAction } from "@/app/(admin)/admin/templates/actions";
import type { LayoutField, TemplateLayout } from "@/lib/certificates/layout";
import { Button } from "@/components/ui/button";

const FIELD_LABELS: Record<LayoutField["field"], string> = {
  recipientName: "Recipient name",
  role: "Role",
  issueDate: "Issue date",
  uniqueId: "Certificate ID",
  qr: "QR code",
};

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
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new Canvas(canvasRef.current, {
      width: 842,
      height: 595,
      selection: true,
      backgroundColor: "#f1f5f9",
    });
    fabricRef.current = canvas;

    let cancelled = false;

    async function load() {
      try {
        const img = await FabricImage.fromURL(backgroundUrl, {
          crossOrigin: "anonymous",
        });
        if (cancelled) return;
        const scale = Math.min(842 / (img.width || 842), 595 / (img.height || 595));
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
              fill: field.color ?? "#0b1f3a",
              fontFamily: field.fontFamily ?? "Helvetica",
              originX: field.align === "center" ? "center" : "left",
            });
            (text as unknown as { fieldKey: string }).fieldKey = field.field;
            canvas.add(text);
          }
        }
        canvas.requestRenderAll();
      } catch {
        setMessage(
          "Could not load background image (CORS). Layout can still be saved from defaults.",
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
          color: String(text.fill ?? "#0b1f3a"),
          align: text.originX === "center" ? "center" : "left",
        });
      }
    }
    return layout.length > 0 ? layout : initialLayout;
  }

  function onSave() {
    setMessage(null);
    const layout = collectLayout();
    startTransition(async () => {
      const result = await saveTemplateLayoutAction({ templateId, layout });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("Layout saved.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-auto rounded-xl border border-border bg-muted/40 p-3">
        <canvas ref={canvasRef} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save layout"}
        </Button>
        <a
          href={`/api/templates/${templateId}/preview`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Preview PDF
        </a>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
      <p className="text-xs text-muted-foreground">
        Drag placeholders on the background. Coordinates are stored as layout JSON
        (templates are data — Rule 5).
      </p>
    </div>
  );
}
