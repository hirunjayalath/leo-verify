import { getServerEnv } from "@/lib/env";
import {
  evaluateVerification as evaluateVerificationPure,
  type CertificateLookupRow,
  type PublicVerificationResult,
} from "@/lib/certificates/pure/verify";

export type { CertificateLookupRow, PublicVerificationResult };

export function evaluateVerification(
  row: CertificateLookupRow | null,
  providedToken: string | null | undefined,
): PublicVerificationResult {
  const env = getServerEnv();
  return evaluateVerificationPure(row, providedToken, {
    current: env.CERT_HMAC_SECRET,
    previous: env.CERT_HMAC_SECRET_PREVIOUS,
  });
}
