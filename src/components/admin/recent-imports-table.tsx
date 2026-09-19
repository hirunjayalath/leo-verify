"use client";

import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type RecentImportJob = {
  id: string;
  status: string;
  totalRows: number;
  successRows: number;
  skippedRows: number;
  failedRows: number;
  createdAt: string;
  rowErrors: { rowNumber: number; error: string }[];
};

export function RecentImportsTable({ jobs }: { jobs: RecentImportJob[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>When</TableHead>
          <TableHead className="text-right">Errors</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => {
          const open = openId === job.id;
          return (
            <Fragment key={job.id}>
              <TableRow>
                <TableCell>
                  <Badge variant="muted">{job.status}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {job.successRows}/{job.totalRows} issued
                  {job.skippedRows > 0 ? ` · ${job.skippedRows} skipped` : ""}
                  {job.failedRows > 0 ? ` · ${job.failedRows} failed` : ""}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {job.createdAt}
                </TableCell>
                <TableCell className="text-right">
                  {job.rowErrors.length > 0 ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                      onClick={() => setOpenId(open ? null : job.id)}
                    >
                      {open ? "Hide" : `Show ${job.rowErrors.length}`}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
              {open && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <ul className="max-h-40 space-y-1 overflow-auto rounded-lg bg-danger-muted p-3 text-xs text-danger">
                      {job.rowErrors.map((err) => (
                        <li key={`${job.id}-${err.rowNumber}-${err.error}`}>
                          Row {err.rowNumber}: {err.error}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
