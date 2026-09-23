import { NextResponse } from "next/server";
import { requireClubAdmin, withSessionRls } from "@/lib/auth";
import { computeVerificationToken } from "@/lib/certificates/token";
import { renderCertificatePdf } from "@/lib/certificates/render-pdf";
import { prisma } from "@/lib/db";
import {
  clientIpFromHeaders,
  rateLimitExpensiveRender,
} from "@/lib/rate-limit";

export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const limit = await rateLimitExpensiveRender(
    clientIpFromHeaders(new Headers(request.headers)),
  );
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const user = await requireClubAdmin();
  const { id } = await params;
  const template = await withSessionRls(user, () =>
    prisma.certificateTemplate.findFirst({
      where: { id, clubId: user.clubId },
      include: { event: true },
    }),
  );
  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const uniqueId = "LEO-PREVIEW-000000";
  const issueDate = new Date().toISOString().slice(0, 10);
  const fields = {
    uniqueId,
    recipientName: "Preview Recipient",
    eventId: template.eventId,
    clubId: template.clubId,
    issueDate,
    role: "Volunteer",
  };
  const token = computeVerificationToken(fields);

  const clubRow = await withSessionRls(user, () =>
    prisma.club.findUniqueOrThrow({
      where: { id: template.clubId },
      select: { name: true },
    }),
  );
  const pdf = await renderCertificatePdf({
    backgroundUrl: template.backgroundUrl,
    layout: template.layout,
    recipientName: fields.recipientName,
    role: fields.role,
    issueDate,
    uniqueId,
    verificationToken: token,
    achievement: "Sample achievement",
    eventName: template.event.name,
    clubName: clubRow.name,
    pageSize:
      template.pageSize === "a4_portrait" ? "a4_portrait" : "a4_landscape",
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="preview-${template.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
