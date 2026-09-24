import { redirect } from "next/navigation";
import { getSessionUser, getSupabaseAuthUser } from "@/lib/auth";
import { postLoginPath } from "@/lib/auth-redirect";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function ContinuePage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user) {
    redirect(postLoginPath(user.role, next));
  }

  const auth = await getSupabaseAuthUser();
  if (auth) {
    redirect(postLoginPath(null, next));
  }

  redirect("/login");
}
