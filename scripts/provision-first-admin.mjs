import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
nextEnv.loadEnvConfig(process.cwd());
const [userId, expectedEmail] = process.argv.slice(2);
if (!/^[a-f0-9-]{36}$/i.test(userId || "") || !expectedEmail?.includes("@")) {
  console.error(
    "Usage: node scripts/provision-first-admin.mjs USER_UUID EMAIL",
  );
  process.exit(1);
}
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const { data: auth, error: authError } =
  await db.auth.admin.getUserById(userId);
if (
  authError ||
  auth.user?.email?.toLowerCase() !== expectedEmail.toLowerCase() ||
  !auth.user.email_confirmed_at
) {
  console.error(
    "The intended confirmed Auth user could not be verified. No access was changed.",
  );
  process.exit(1);
}
const { data: existing, error: readError } = await db
  .from("admins")
  .select("user_id");
if (readError) {
  console.error("Unable to check existing admin access.");
  process.exit(1);
}
const alreadyAdmin = existing.some((a) => a.user_id === userId);
if (existing.length && !alreadyAdmin) {
  console.error(
    "First-admin setup is already complete. No additional staff access was granted.",
  );
  process.exit(1);
}
if (!alreadyAdmin) {
  const { error } = await db
    .from("admins")
    .upsert(
      { user_id: userId },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("Admin access could not be saved.");
    process.exit(1);
  }
  const hex = createHash("sha256")
    .update(`first-admin:${userId}`)
    .digest("hex")
    .slice(0, 32);
  const auditId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const { error: auditError } = await db
    .from("audit_events")
    .upsert(
      {
        id: auditId,
        actor_id: userId,
        table_name: "admins",
        record_id: userId,
        operation: "PROVISION_FIRST_ADMIN",
        after_data: { user_id: userId },
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (auditError) {
    console.error(
      "Admin access was saved, but the provisioning audit needs attention.",
    );
    process.exit(1);
  }
}
const { data: verified, error: verifyError } = await db
  .from("admins")
  .select("user_id")
  .eq("user_id", userId)
  .single();
if (verifyError || !verified) {
  console.error("Could not verify saved admin access.");
  process.exit(1);
}
console.log(
  JSON.stringify({
    adminAccessVerified: true,
    email: auth.user.email,
    alreadyProvisioned: alreadyAdmin,
    passwordUnchanged: true,
    noEmailSent: true,
  }),
);
