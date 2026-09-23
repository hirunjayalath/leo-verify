import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AuthAdmin = Pick<
  SupabaseClient["auth"]["admin"],
  "createUser" | "listUsers" | "updateUserById" | "inviteUserByEmail"
>;

export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to manage Auth users",
    );
  }
  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isAlreadyRegistered(message: string): boolean {
  return /already|registered|exists/i.test(message);
}

async function findUserIdByEmail(
  admin: AuthAdmin,
  email: string,
): Promise<string | null> {
  const target = email.trim().toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === target,
    );
    if (match) return match.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

/** Create or link a confirmed Auth user. Local seed only. */
export async function ensureAuthUser(
  input: { email: string; password: string },
  admin: AuthAdmin = createServiceRoleClient().auth.admin,
): Promise<{ id: string; email: string }> {
  const email = input.email.trim().toLowerCase();
  const { data, error } = await admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });
  if (!error && data.user?.id) {
    return { id: data.user.id, email: data.user.email ?? email };
  }
  if (error && !isAlreadyRegistered(error.message)) {
    throw error;
  }

  const existingId = await findUserIdByEmail(admin, email);
  if (!existingId) {
    throw error ?? new Error(`Auth user not found for ${email}`);
  }
  const { error: updateError } = await admin.updateUserById(existingId, {
    password: input.password,
    email_confirm: true,
  });
  if (updateError) throw updateError;
  return { id: existingId, email };
}

/** Invite a new Auth user, or find one that already exists. */
export async function inviteOrFindAuthUser(
  email: string,
  admin: AuthAdmin = createServiceRoleClient().auth.admin,
): Promise<{ id: string; email: string; invited: boolean }> {
  const normalized = email.trim().toLowerCase();
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  const { data, error } = await admin.inviteUserByEmail(normalized, {
    redirectTo: `${appUrl}/login`,
  });
  if (!error && data.user?.id) {
    return {
      id: data.user.id,
      email: data.user.email ?? normalized,
      invited: true,
    };
  }
  if (error && isAlreadyRegistered(error.message)) {
    const existingId = await findUserIdByEmail(admin, normalized);
    if (!existingId) {
      throw error;
    }
    return { id: existingId, email: normalized, invited: false };
  }
  throw error ?? new Error(`Could not invite Auth user for ${normalized}`);
}
