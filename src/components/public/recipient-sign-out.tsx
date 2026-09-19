"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function RecipientSignOut() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSignOut() {
    setLoading(true);
    try {
      const { createBrowserSupabaseClient } = await import(
        "@/lib/supabase/client"
      );
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      toast.success("Signed out");
      router.push("/login?next=/claim");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-out failed");
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onSignOut}
      disabled={loading}
    >
      {loading && <Spinner />}
      Sign out
    </Button>
  );
}
