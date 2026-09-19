import { NextResponse } from "next/server";
import { CertificateStatus } from "@/generated/prisma/client";
import { verifyVerificationToken } from "@/lib/certificates/token";
import { prisma } from "@/lib/db";
import {
  clientIpFromHeaders,
  rateLimitVerification,
} from "@/lib/rate-limit";
import { getShortLivedObjectUrl } from "@/lib/storage/r2";

type Params = { params: Promise<{ uniqueId: string }> };

/** Token-gated PDF. Live DB status is authoritative — revoked certs 404. */
export async function GET(request: Request, { params }: Params) {
  const limit = await rateLimitVerification(
    clientIpFromHeaders(new Headers(request.headers)),
  );
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { uniqueId: rawId } = await params;
  const uniqueId = decodeURIComponent(rawId);
  const token = new URL(request.url).searchParams.get("t");
  if (!token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cert = await prisma.certificate.findUnique({ where: { uniqueId } });
  if (!cert || cert.status !== CertificateStatus.issued) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (cert.pdfKey) {
    const url = await getShortLivedObjectUrl(cert.pdfKey, 120);
    if (!url) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.redirect(url, 302);
  }

  // Legacy rows without pdfKey.
  if (cert.pdfUrl) {
    return NextResponse.redirect(cert.pdfUrl, 302);
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
