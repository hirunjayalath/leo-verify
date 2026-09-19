"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAuthUser } from "@/lib/auth";
import { signupPublicOrg } from "@/lib/orgs/service";
import {
  clientIpFromHeaders,
  rateLimitSignup,
} from "@/lib/rate-limit";

export type SignupResult =
  | { ok: true; clubId: string }
  | { ok: false; error: string };

/** Requires authenticated Supabase session; binds identity from the session only. */
export async function signupPublicOrgAction(
  formData: FormData,
): Promise<SignupResult> {
  const auth = await getSupabaseAuthUser();
  if (!auth) {
    return {
      ok: false,
      error: "Sign in before creating an organization.",
    };
  }

  const headerList = await headers();
  const limit = await rateLimitSignup(clientIpFromHeaders(headerList));
  if (!limit.success) {
    return { ok: false, error: "Too many signup attempts. Try again later." };
  }

  const parsed = z
    .object({
      orgName: z.string().trim().min(2).max(200),
      orgCode: z
        .string()
        .trim()
        .min(2)
        .max(12)
        .regex(/^[A-Za-z0-9]+$/),
      adminName: z.string().trim().min(2).max(200),
    })
    .safeParse({
      orgName: formData.get("orgName"),
      orgCode: formData.get("orgCode"),
      adminName: formData.get("adminName"),
    });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await signupPublicOrg({
    supabaseId: auth.id,
    adminEmail: auth.email,
    orgName: parsed.data.orgName,
    orgCode: parsed.data.orgCode,
    adminName: parsed.data.adminName,
  });

  if (result.ok) {
    revalidatePath("/signup");
  }
  return result;
}
