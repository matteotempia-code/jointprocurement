export function supabaseAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) throw new Error("Supabase Auth is not configured.");
  return { url, publishableKey };
}
