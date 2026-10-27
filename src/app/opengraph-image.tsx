import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "LeoVerify, live certificate checks";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logoBytes = await readFile(
    join(process.cwd(), "public/brand/leo-emblem.png"),
  );
  const logoSrc = `data:image/png;base64,${logoBytes.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(145deg, #323232 0%, #2a2a2a 45%, #1f1f1f 100%)",
          color: "#ffffff",
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
          <img
            src={logoSrc}
            width={72}
            height={72}
            alt=""
            style={{ borderRadius: 12 }}
          />
          <div style={{ fontSize: 36, fontWeight: 600 }}>LeoVerify</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            Check a Leo Club certificate
          </div>
          <div style={{ fontSize: 28, color: "#c8c8c8", maxWidth: 820 }}>
            If the PDF and the site disagree, believe the site.
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#38a3e3" }}>
          Leo Club of University of Moratuwa · District 306 D2
        </div>
      </div>
    ),
    { ...size },
  );
}
