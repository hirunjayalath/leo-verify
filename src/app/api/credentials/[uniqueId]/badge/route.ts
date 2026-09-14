import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { CertificateStatus } from "@/generated/prisma/client";
import {
  buildPdfDownloadPath,
  verifyVerificationToken,
} from "@/lib/certificates/token";
import { prisma } from "@/lib/db";
import { getPublicEnv } from "@/lib/env";
import {
  clientIpFromHeaders,
  rateLimitBadge,
} from "@/lib/rate-limit";

type Params = { params: Promise<{ uniqueId: string }> };

/**
 * Open Badges 3.0 / VC-aligned export (Phase 2).
 * HMAC verification remains the primary UX; this is an interoperability layer.
 */
export async function GET(request: Request, { params }: Params) {
  const limit = await rateLimitBadge(
    clientIpFromHeaders(new Headers(request.headers)),
  );
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { uniqueId } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("t");

  const cert = await prisma.certificate.findUnique({
    where: { uniqueId },
    include: {
      event: { include: { club: true } },
    },
  });

  if (!cert || cert.status !== CertificateStatus.issued) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!token) {
    return NextResponse.json(
      { error: "Verification token required" },
      { status: 401 },
    );
  }

  const ok = verifyVerificationToken(
    {
      uniqueId: cert.uniqueId,
      recipientName: cert.recipientName,
      eventId: cert.eventId,
      clubId: cert.clubId,
      issueDate: cert.issueDate.toISOString().slice(0, 10),
      role: cert.role,
      tokenVersion: cert.tokenVersion,
    },
    token,
  );
  if (!ok) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const verifyUrl = `${appUrl}/v/${encodeURIComponent(cert.uniqueId)}?t=${encodeURIComponent(token)}`;
  const gatedPdf =
    cert.pdfKey || cert.pdfUrl
      ? `${appUrl}${buildPdfDownloadPath(cert.uniqueId, token)}`
      : null;

  const badge = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: `${appUrl}/api/credentials/${encodeURIComponent(cert.uniqueId)}/badge`,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      id: `${appUrl}/org/${cert.event.club.code}`,
      type: ["Profile"],
      name: cert.event.club.name,
    },
    validFrom: cert.issueDate.toISOString(),
    name: `${cert.event.name} — ${cert.role}`,
    credentialSubject: {
      type: ["AchievementSubject"],
      name: cert.recipientName,
      achievement: {
        id: `${appUrl}/achievements/${cert.eventId}`,
        type: ["Achievement"],
        name: cert.achievement || cert.role,
        description: cert.event.name,
        criteria: {
          narrative: `Awarded for participation as ${cert.role} in ${cert.event.name}.`,
        },
      },
    },
    evidence: [
      {
        id: verifyUrl,
        type: ["Evidence"],
        name: "LeoVerify live verification",
        description:
          "Authoritative verification page (database record, not the PDF).",
      },
    ],
    credentialSchema: [
      {
        id: "https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json",
        type: "1EdTechJsonSchemaValidator2019",
      },
    ],
  };

  const integrityHash = createHash("sha256")
    .update(JSON.stringify(badge))
    .digest("hex");

  return NextResponse.json(
    {
      ...badge,
      leoverify: {
        uniqueId: cert.uniqueId,
        integrityHash,
        ...(gatedPdf ? { pdfDownload: gatedPdf } : {}),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
