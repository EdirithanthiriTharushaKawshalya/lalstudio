type Environment = Record<string, string | undefined>;
export function readBackendConfiguration(env: Environment) {
  const clean = (name: string) => (env[name] || "").trim();
  const url = clean("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
  const publishableKey =
    clean("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    clean("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const secretKey =
    clean("SUPABASE_SECRET_KEY") || clean("SUPABASE_SERVICE_ROLE_KEY");
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!publishableKey)
    missing.push(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  if (!secretKey)
    missing.push("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)");
  return {
    url,
    publishableKey,
    secretKey,
    missing,
    configured: missing.length === 0,
  };
}
