import { NextResponse } from "next/server";
import { CertificateStatus } from "@/generated/prisma/client";
import { getSessionUser, getSupabaseAuthUser } from "@/lib/auth";
import {
  canAccessCertificatePdf,
  recipientClaimLoginPath,
} from "@/lib/certificates/pdf-access";
import { verifyVerificationToken } from "@/lib/certificates/token";
import { prismaService, withRlsContext } from "@/lib/db";
import {
  clientIpFromHeaders,
  rateLimitVerification,
} from "@/lib/rate-limit";
import {
  getShortLivedObjectUrl,
  readLocalCertificatePdf,
} from "@/lib/storage/r2";

type Params = { params: Promise<{ uniqueId: string }> };

/** HMAC + issued + recipient (or club admin) session. Revoked certs 404. */
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

  const cert = await prismaService.certificate.findUnique({
    where: { uniqueId },
    select: {
      uniqueId: true,
      recipientName: true,
      eventId: true,
      clubId: true,
      issueDate: true,
      role: true,
      tokenVersion: true,
      status: true,
      pdfKey: true,
    },
  });
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

  const [auth, admin] = await Promise.all([
    getSupabaseAuthUser(),
    getSessionUser(),
  ]);
  let recipientOwns = false;
  if (auth?.id && auth.email) {
    const visible = await withRlsContext(
      auth.id,
      (tx) =>
        tx.certificate.findFirst({
          where: {
            uniqueId: cert.uniqueId,
            status: CertificateStatus.issued,
          },
          select: { id: true },
        }),
      { recipientEmail: auth.email },
    );
    recipientOwns = Boolean(visible);
  }
  const access = canAccessCertificatePdf({
    clubId: cert.clubId,
    authEmail: auth?.email,
    recipientOwns,
    admin:
      admin &&
      (admin.role === "club_admin" || admin.role === "district_admin")
        ? { role: admin.role, clubId: admin.clubId }
        : null,
  });
  if (!access.ok) {
    return NextResponse.json(
      {
        error: "Sign in to download",
        claimUrl: recipientClaimLoginPath(),
      },
      { status: 401 },
    );
  }

  if (!cert.pdfKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const localPdf = await readLocalCertificatePdf(cert.pdfKey);
  if (localPdf) {
    return new NextResponse(new Uint8Array(localPdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${uniqueId}.pdf"`,
      },
    });
  }

  const url = await getShortLivedObjectUrl(cert.pdfKey, 120);
  if (!url) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.redirect(url, 302);
}
