import { CertificatesTable } from "@/components/certificates-table";
import { CsvImportForm } from "@/components/csv-import-form";
import { IssueCertificateForm } from "@/components/issue-certificate-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireClubAdmin } from "@/lib/auth";
import {
  buildPdfDownloadPath,
  buildVerificationPath,
} from "@/lib/certificates/token";
import { prisma } from "@/lib/db";

export default async function AdminCertificatesPage() {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;

  const [certificates, events, jobs] = await Promise.all([
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
    prisma.importJob.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const rows = certificates.map((cert) => ({
    id: cert.id,
    uniqueId: cert.uniqueId,
    recipientName: cert.recipientName,
    role: cert.role,
    status: cert.status as "issued" | "revoked",
    eventName: cert.event.name,
    verifyPath: buildVerificationPath(cert.uniqueId, cert.verificationToken),
    pdfUrl:
      cert.status === "issued" && (cert.pdfKey || cert.pdfUrl)
        ? buildPdfDownloadPath(cert.uniqueId, cert.verificationToken)
        : null,
    issueDate: cert.issueDate.toISOString().slice(0, 10),
  }));

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Certificates</h1>
        <p className="mt-1 text-muted-foreground">
          Issue, reissue, revoke, and bulk-import — every write is attributed in
          the audit log.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
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
              <CertificatesTable rows={rows} />
            </CardContent>
          </Card>

          {jobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent imports</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Badge variant="muted">{job.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {job.successRows}/{job.totalRows} issued
                          {job.skippedRows > 0
                            ? ` · ${job.skippedRows} skipped`
                            : ""}
                          {job.failedRows > 0
                            ? ` · ${job.failedRows} failed`
                            : ""}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {job.createdAt.toISOString().slice(0, 19)} UTC
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card id="issue">
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

          <Card>
            <CardHeader>
              <CardTitle>Bulk CSV import</CardTitle>
              <CardDescription>
                Validates every row before committing. Re-runs skip duplicates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CsvImportForm events={events} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
