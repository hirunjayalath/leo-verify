import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { getVerifiedShareCard } from "@/lib/certificates/verify-lookup";

export const runtime = "nodejs";

type Params = { params: Promise<{ uniqueId: string }> };

async function genericCard() {
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
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
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
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            Certificate verification
          </div>
          <div style={{ fontSize: 26, color: "#c8c8c8", maxWidth: 820 }}>
            Open the full verify link to confirm authenticity live from the
            database.
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#38a3e3" }}>leoverify</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

async function verifiedCard(input: {
  recipientName: string;
  eventName: string;
  clubName: string;
  role: string;
}) {
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
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img
            src={logoSrc}
            width={64}
            height={64}
            alt=""
            style={{ borderRadius: 12 }}
          />
          <div style={{ fontSize: 28, fontWeight: 600 }}>
            Verified credential · LeoVerify
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: 980,
            }}
          >
            {input.recipientName}
          </div>
          <div style={{ fontSize: 28, color: "#e8e8e8" }}>{input.eventName}</div>
          <div style={{ fontSize: 24, color: "#c8c8c8" }}>
            {input.role} · {input.clubName}
          </div>
        </div>
        <div style={{ fontSize: 20, color: "#38a3e3" }}>
          Live database record · not a static PDF claim
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

/**
 * Token-gated Open Graph image. Invalid/revoked/missing t → generic site card
 * with no personal data (Rule 8).
 */
export async function GET(request: Request, { params }: Params) {
  const { uniqueId: raw } = await params;
  const uniqueId = decodeURIComponent(raw);
  const token = new URL(request.url).searchParams.get("t");

  try {
    const card = await getVerifiedShareCard(uniqueId, token);
    if (!card) return genericCard();
    return verifiedCard(card);
  } catch {
    return genericCard();
  }
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: { "Content-Type": "image/png" },
  });
}
