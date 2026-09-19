import { serve } from "inngest/next";
import { functions, inngest } from "@/inngest/functions";

/** Bulk import can run long — keep work on Inngest, not a short Vercel request. */
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
