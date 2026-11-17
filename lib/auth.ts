import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Profile } from "@/lib/types";

export const getCurrentUser = cache(async () => {
  if (!getSupabaseEnv().configured) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return { user, profile: profile as Profile | null };
});

export async function requireMember() {
  const auth = await getCurrentUser();
  if (!auth?.user) redirect("/login?next=/member");
  return auth;
}

export async function requireAdmin() {
  const auth = await getCurrentUser();
  if (!auth?.user) redirect("/login?next=/admin");
  if (auth.profile?.role !== "admin") redirect("/member?error=forbidden");
  return auth;
}
