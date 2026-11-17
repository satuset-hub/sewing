export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, key, configured: Boolean(url && key) };
}

export function requireSupabaseEnv() {
  const env = getSupabaseEnv();
  if (!env.configured) throw new Error("SUPABASE_NOT_CONFIGURED");
  return { url: env.url!, key: env.key! };
}
