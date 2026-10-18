"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileBadge2, Search } from "lucide-react";
import { RevokeButton } from "@/components/admin/revoke-button";
import { ReissueButton } from "@/components/admin/reissue-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CertRow = {
  id: string;
  uniqueId: string;
  recipientName: string;
  role: string;
  status: "issued" | "revoked";
  eventName: string;
  verifyPath: string;
  pdfUrl: string | null;
  issueDate: string;
};

export function CertificatesTable({
  rows,
  disableClientSearch = false,
}: {
  rows: CertRow[];
  disableClientSearch?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (disableClientSearch) return rows;
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.uniqueId.toLowerCase().includes(needle) ||
        r.recipientName.toLowerCase().includes(needle) ||
        r.eventName.toLowerCase().includes(needle) ||
        r.role.toLowerCase().includes(needle),
    );
  }, [q, rows, disableClientSearch]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FileBadge2}
        title="No certificates yet"
        description="Issue one certificate or import a CSV roster."
        action={
          <Link
            href="#issue"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Issue a certificate
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {!disableClientSearch && (
        <div className="relative max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ID, name, event…"
            className="pl-9"
            aria-label="Search certificates"
          />
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-md border border-border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((cert) => (
              <TableRow key={cert.id}>
                <TableCell className="font-mono text-xs">{cert.uniqueId}</TableCell>
                <TableCell>
                  <p className="font-medium">{cert.recipientName}</p>
                  <p className="text-xs text-muted-foreground">{cert.role}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {cert.eventName}
                </TableCell>
                <TableCell>
                  <Badge variant={cert.status === "issued" ? "success" : "danger"}>
                    {cert.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <a
                      href={cert.verifyPath}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Verify
                    </a>
                    {cert.pdfUrl && (
                      <a
                        href={cert.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        PDF
                      </a>
                    )}
                    {cert.status === "issued" && (
                      <>
                        <ReissueButton certificateId={cert.id} />
                        <RevokeButton certificateId={cert.id} />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            No matches for “{q}”.
          </p>
        )}
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 sm:hidden">
        {filtered.length === 0 ? (
          <li className="rounded-md border border-border p-4 text-center text-sm text-muted-foreground">
            No matches{q ? ` for “${q}”` : ""}.
          </li>
        ) : (
          filtered.map((cert) => (
            <li
              key={cert.id}
              className="rounded-md border border-border bg-card p-4 shadow-elevated"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-xs font-medium">{cert.uniqueId}</p>
                <Badge variant={cert.status === "issued" ? "success" : "danger"}>
                  {cert.status}
                </Badge>
              </div>
              <p className="mt-2 font-medium">{cert.recipientName}</p>
              <p className="text-sm text-muted-foreground">
                {cert.role} · {cert.eventName}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a
                  href={cert.verifyPath}
                  className="text-sm font-medium text-primary"
                  target="_blank"
                  rel="noreferrer"
                >
                  Verify
                </a>
                {cert.pdfUrl && (
                  <a
                    href={cert.pdfUrl}
                    className="text-sm font-medium text-primary"
                    target="_blank"
                    rel="noreferrer"
                  >
                    PDF
                  </a>
                )}
                {cert.status === "issued" && (
                  <>
                    <ReissueButton certificateId={cert.id} />
                    <RevokeButton certificateId={cert.id} />
                  </>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
