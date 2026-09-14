import { ImageResponse } from "next/og";

export const alt = "LeoVerify — Live certificate verification";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #0b1f3a 0%, #132a4a 55%, #0b1f3a 100%)",
          color: "#f8fafc",
          padding: 72,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              background: "#0b1f3a",
              border: "2px solid #d4af37",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#d4af37",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            LV
          </div>
          <div style={{ fontSize: 36, fontWeight: 600 }}>LeoVerify</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1, maxWidth: 900 }}>
            Live certificate verification
          </div>
          <div style={{ fontSize: 28, color: "#cbd5e1", maxWidth: 820 }}>
            The PDF is a convenience copy. The database record is authoritative.
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#d4af37" }}>
          Leo Club of University of Moratuwa · District 306 A2
        </div>
      </div>
    ),
    { ...size },
  );
}
