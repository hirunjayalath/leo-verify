export type ActionResult =
  | {
      ok: true;
      id?: string;
      uniqueId?: string;
      verificationToken?: string;
      pdfUrl?: string | null;
      skipped?: boolean;
      url?: string;
    }
  | { ok: false; error: string };
