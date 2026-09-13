import { IssueCertificateForm } from "@/components/issue-certificate-form";
import { RevokeButton } from "@/components/revoke-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CertificateStatus } from "@/generated/prisma/client";
import { requireClubAdmin } from "@/lib/auth";
import { buildVerificationPath } from "@/lib/certificates/token";
import { prisma } from "@/lib/db";

export default async function AdminCertificatesPage() {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;

  const [certificates, events] = await Promise.all([
    prisma.certificate.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { event: { select: { name: true } } },
    }),
    prisma.event.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Certificates
        </h1>
        <p className="mt-1 text-muted-foreground">
          Issue, revoke, and reissue — every write is attributed in the audit log.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Issued certificates</CardTitle>
            <CardDescription>
              {certificates.length === 0
                ? "No certificates yet"
                : `${certificates.length} shown`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {certificates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Issue a single certificate to verify the end-to-end QR flow.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {certificates.map((cert) => (
                  <li key={cert.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-medium">{cert.uniqueId}</p>
                      <Badge
                        variant={
                          cert.status === CertificateStatus.issued
                            ? "success"
                            : "danger"
                        }
                      >
                        {cert.status}
                      </Badge>
                    </div>
                    <p className="text-sm">
                      {cert.recipientName} · {cert.role} · {cert.event.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <a
                        href={buildVerificationPath(
                          cert.uniqueId,
                          cert.verificationToken,
                        )}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open verify link
                      </a>
                      {cert.pdfUrl && (
                        <a
                          href={cert.pdfUrl}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          PDF
                        </a>
                      )}
                      {cert.status === CertificateStatus.issued && (
                        <RevokeButton certificateId={cert.id} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issue one</CardTitle>
            <CardDescription>
              Uses the event’s latest template when available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IssueCertificateForm events={events} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
