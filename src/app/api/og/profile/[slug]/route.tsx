import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { getPublicProfileShareCard } from "@/lib/recipients/public-profile";
import {
  clientIpFromHeaders,
  rateLimitExpensiveRender,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

type Params = { params: Promise<{ slug: string }> };

async function emblemSrc() {
  const logoBytes = await readFile(
    join(process.cwd(), "public/brand/leo-emblem.png"),
  );
  return `data:image/png;base64,${logoBytes.toString("base64")}`;
}

async function genericCard() {
  const logoSrc = await emblemSrc();
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
            "linear-gradient(145deg, #0C2340 0%, #081729 60%, #050E1A 100%)",
          color: "#ffffff",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse/Satori requires <img> */}
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
            Public profile
          </div>
          <div style={{ fontSize: 26, color: "#cbd5e1", maxWidth: 820 }}>
            Certificates stay private unless the recipient publishes them.
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#FFC72C" }}>leoverify</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

async function publicCard(input: { name: string; certCount: number }) {
  const logoSrc = await emblemSrc();
  const countLabel =
    input.certCount === 1
      ? "1 public certificate"
      : `${input.certCount} public certificates`;

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
            "linear-gradient(145deg, #0C2340 0%, #081729 60%, #00338D 100%)",
          color: "#ffffff",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse/Satori requires <img> */}
          <img
            src={logoSrc}
            width={64}
            height={64}
            alt=""
            style={{ borderRadius: 12, background: "#fff" }}
          />
          <div style={{ fontSize: 28, fontWeight: 600 }}>
            Certificates on LeoVerify
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
            {input.name}
          </div>
          <div style={{ fontSize: 28, color: "#e8e8e8" }}>{countLabel}</div>
        </div>
        <div style={{ fontSize: 20, color: "#FFC72C" }}>
          Shared with the recipient’s consent
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

/** Private or missing slug → generic card with no name (Rule 10). */
export async function GET(request: Request, { params }: Params) {
  const limit = await rateLimitExpensiveRender(
    clientIpFromHeaders(new Headers(request.headers)),
  );
  if (!limit.success) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);

  try {
    const card = await getPublicProfileShareCard(slug);
    if (!card) return genericCard();
    return publicCard(card);
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
