import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const { data, error } = await db.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (error) {
  console.error(
    "Could not read staff account setup. No credentials were printed.",
  );
  process.exit(1);
}
const { data: admins, error: adminError } = await db
  .from("admins")
  .select("user_id");
if (adminError) {
  console.error("Could not check existing admin access.");
  process.exit(1);
}
console.log(
  JSON.stringify(
    {
      users: data.users.map((u) => ({
        id: u.id,
        email: u.email,
        emailConfirmed: Boolean(u.email_confirmed_at),
        createdAt: u.created_at,
        admin: admins.some((a) => a.user_id === u.id),
      })),
      total: data.total ?? data.users.length,
    },
    null,
    2,
  ),
);
