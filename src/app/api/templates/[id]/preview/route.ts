import { NextResponse } from "next/server";
import { requireClubAdmin } from "@/lib/auth";
import { computeVerificationToken } from "@/lib/certificates/token";
import { renderCertificatePdf } from "@/lib/certificates/render-pdf";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await requireClubAdmin();
  const { id } = await params;
  const template = await prisma.certificateTemplate.findFirst({
    where: { id, clubId: user.clubId! },
    include: { event: true },
  });
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

  const pdf = await renderCertificatePdf({
    backgroundUrl: template.backgroundUrl,
    layout: template.layout,
    recipientName: fields.recipientName,
    role: fields.role,
    issueDate,
    uniqueId,
    verificationToken: token,
    achievement: "Sample achievement",
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="preview-${template.id}.pdf"`,
    },
  });
}
