import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !secret) {
  console.error(
    "Supabase configuration is incomplete. No secret values were printed.",
  );
  process.exit(1);
}
const client = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
try {
  const [auth, settings, buckets, admins] = await Promise.all([
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: publicKey } }),
    client.from("settings").select("id").eq("id", "studio").maybeSingle(),
    client.storage.listBuckets(),
    client.from("admins").select("user_id", { count: "exact", head: true }),
  ]);
  const networkFailed =
    settings.error?.message === "TypeError: fetch failed" ||
    buckets.error?.message === "fetch failed";
  const report = {
    publicKeyAccepted: auth.ok,
    authStatus: auth.status,
    settingsTableReady: !settings.error && Boolean(settings.data),
    databaseErrorCode: settings.error?.code || null,
    serverKeyAccepted: !buckets.error,
    storageStatus: buckets.error?.status || null,
    provisionedAdminCount: admins.error ? null : admins.count,
    requiredBuckets: ["portfolio", "verification", "gallery-covers"].map(
      (name) => ({
        name,
        exists: Boolean(buckets.data?.some((b) => b.id === name)),
        isPublic: buckets.data?.find((b) => b.id === name)?.public ?? null,
      }),
    ),
  };
  console.log(JSON.stringify(report, null, 2));
  if (networkFailed || !auth.ok || buckets.error) process.exitCode = 2;
} catch {
  console.error(
    "Unable to reach Supabase. Check network access and project configuration. Secret values were not printed.",
  );
  process.exitCode = 2;
}
