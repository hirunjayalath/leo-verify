import Link from "next/link";
import { CertificatesTable } from "@/components/certificates-table";
import { CsvImportForm } from "@/components/csv-import-form";
import { IssueCertificateForm } from "@/components/issue-certificate-form";
import { RecentImportsTable } from "@/components/recent-imports-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ImportRowStatus } from "@/generated/prisma/client";
import { requireClubAdmin } from "@/lib/auth";
import {
  buildPdfDownloadPath,
  buildVerificationPath,
} from "@/lib/certificates/token";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 25;

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function AdminCertificatesPage({ searchParams }: PageProps) {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    clubId,
    ...(q
      ? {
          OR: [
            { uniqueId: { contains: q, mode: "insensitive" as const } },
            { recipientName: { contains: q, mode: "insensitive" as const } },
            { role: { contains: q, mode: "insensitive" as const } },
            { event: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [certificates, total, events, jobs] = await Promise.all([
    prisma.certificate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { event: { select: { name: true } } },
    }),
    prisma.certificate.count({ where }),
    prisma.event.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
    prisma.importJob.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        rows: {
          where: {
            status: ImportRowStatus.failed,
            error: { not: null },
          },
          select: { rowNumber: true, error: true },
          orderBy: { rowNumber: "asc" },
          take: 50,
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

  const importRows = jobs.map((job) => ({
    id: job.id,
    status: job.status,
    totalRows: job.totalRows,
    successRows: job.successRows,
    skippedRows: job.skippedRows,
    failedRows: job.failedRows,
    createdAt: `${job.createdAt.toISOString().slice(0, 19)} UTC`,
    rowErrors: job.rows
      .filter((r): r is { rowNumber: number; error: string } => Boolean(r.error))
      .map((r) => ({ rowNumber: r.rowNumber, error: r.error })),
  }));

  function pageHref(target: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (target > 1) sp.set("page", String(target));
    const qs = sp.toString();
    return qs ? `/admin/certificates?${qs}` : "/admin/certificates";
  }

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
                {total === 0
                  ? "No certificates yet"
                  : `Showing ${rows.length} of ${total}${q ? ` matching “${q}”` : ""}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="flex flex-wrap gap-2" method="get">
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Search ID, name, event…"
                  className="max-w-sm"
                  aria-label="Search certificates"
                />
                <Button type="submit" variant="outline">
                  Search
                </Button>
              </form>
              <CertificatesTable rows={rows} disableClientSearch />
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <p className="text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    {page > 1 ? (
                      <Link href={pageHref(page - 1)}>
                        <Button variant="outline" size="sm">
                          Previous
                        </Button>
                      </Link>
                    ) : null}
                    {page < totalPages ? (
                      <Link href={pageHref(page + 1)}>
                        <Button variant="outline" size="sm">
                          Next
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {importRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent imports</CardTitle>
                <CardDescription>
                  Expand a row to see per-row failure messages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentImportsTable jobs={importRows} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card id="issue">
            <CardHeader>
              <CardTitle>Issue one</CardTitle>
              <CardDescription>
                Uses the event’s latest approved template.
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
                Needs an approved template. Validates every row before committing.
                Re-runs skip duplicates.
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
