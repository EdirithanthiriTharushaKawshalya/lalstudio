import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import {
  backend,
  isHosted,
  sessionCookieOptions,
} from "./supabase-configuration";
export const live = backend.configured;
export function database() {
  if (!live)
    throw new Error("Sample preview: connect Supabase to save records.");
  return createClient(backend.url, backend.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function authClient(writeCookies = false) {
  const jar = await cookies();
  return createServerClient(backend.url, backend.publishableKey, {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        if (writeCookies) {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
          return;
        }
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Server Components are read-only. Proxy persists refreshed cookies. */
        }
      },
    },
  });
}
async function verifyAdmin(allowPreview = false) {
  if (!live) {
    if (allowPreview && !isHosted)
      return { id: "preview", email: "Read-only sample preview" };
    if (isHosted) redirect("/admin/login?error=configuration");
    throw new Error("Preview is read-only. Configure Supabase first.");
  }
  const client = await authClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data } = await database()
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) redirect("/admin/login?error=staff");
  return { id: user.id, email: user.email };
}
export const requireAdmin = cache(verifyAdmin);
