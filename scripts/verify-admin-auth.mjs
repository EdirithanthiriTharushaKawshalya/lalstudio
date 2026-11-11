import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
nextEnv.loadEnvConfig(process.cwd());
if (!process.argv.includes("--temporary-account"))
  throw new Error(
    "Pass --temporary-account to allow an isolated Auth fixture that is removed afterward.",
  );
const base = process.env.TEST_SITE_URL || "http://localhost:3005";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error(
    "This test is restricted to a local server. No credentials were sent.",
  );
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const email = `studio-login-check-${randomUUID()}@example.invalid`;
const password = randomBytes(24).toString("base64url");
const jar = new Map();
let userId;
function remember(response) {
  for (const cookie of response.headers.getSetCookie()) {
    const part = cookie.split(";")[0];
    const position = part.indexOf("=");
    const name = part.slice(0, position),
      value = part.slice(position + 1);
    if (value) jar.set(name, value);
    else jar.delete(name);
  }
}
function cookieHeader() {
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}
const decode = (s) =>
  s
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'");
function formData(html, predicate = () => true) {
  const form = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)]
    .map((m) => m[0])
    .find(predicate);
  assert(form, "Expected form is present");
  const data = new FormData();
  for (const input of form.matchAll(/<input\b[^>]*type="hidden"[^>]*>/g)) {
    const name = input[0].match(/name="([^"]+)"/)?.[1];
    const value = input[0].match(/value="([^"]*)"/)?.[1] || "";
    if (name) data.set(decode(name), decode(value));
  }
  return data;
}
async function anonymousDenied() {
  const r = await fetch(base + "/admin", { redirect: "manual" });
  const html = await r.text();
  assert(
    r.headers.get("location")?.includes("/admin/login") ||
      html.includes("/admin/login"),
    "Anonymous visitor is sent to login",
  );
  assert(
    !html.includes("A good day to make memories."),
    "Dashboard content is protected",
  );
}
try {
  await anonymousDenied();
  console.log("PASS anonymous admin access is denied");
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error("Could not create temporary Auth fixture.");
  userId = data.user.id;
  const { error: roleError } = await db
    .from("admins")
    .insert({ user_id: userId });
  if (roleError) throw new Error("Could not provision temporary staff role.");
  let page = await fetch(base + "/admin/login");
  let html = await page.text();
  assert(
    !html.includes("Sign-in setup is incomplete"),
    "Server environment is configured",
  );
  let form = formData(html);
  form.set("email", `  ${email.toUpperCase()}  `);
  form.set("password", password);
  const login = await fetch(base + "/admin/login", {
    method: "POST",
    headers: { Origin: base },
    body: form,
    redirect: "manual",
  });
  assert.equal(login.status, 303, "Successful password login redirects");
  assert(login.headers.get("location")?.endsWith("/admin"));
  const cookies = login.headers.getSetCookie();
  assert(
    cookies.some((c) => c.includes("sb-") && /httponly/i.test(c)),
    "Session is persisted in HttpOnly cookies",
  );
  remember(login);
  assert(jar.size > 0);
  console.log(
    "PASS password sign-in accepts a normalized email and persists session cookies",
  );
  const dashboard = await fetch(base + "/admin", {
    headers: { Cookie: cookieHeader() },
    redirect: "manual",
  });
  remember(dashboard);
  const dashboardHtml = await dashboard.text();
  assert.equal(dashboard.status, 200);
  assert(dashboardHtml.includes("A good day to make memories."));
  console.log(
    "PASS the session reaches the server-protected dashboard with staff authorization",
  );
  const logoutForm = formData(dashboardHtml, (f) => f.includes("Sign out"));
  const logout = await fetch(base + "/admin", {
    method: "POST",
    headers: { Origin: base, Cookie: cookieHeader() },
    body: logoutForm,
    redirect: "manual",
  });
  assert.equal(logout.status, 303);
  assert(logout.headers.get("location")?.endsWith("/admin/login"));
  remember(logout);
  assert(
    ![...jar.keys()].some((k) => k.includes("auth-token")),
    "Sign-out clears the session",
  );
  await anonymousDenied();
  console.log(
    "PASS sign-out clears authentication and restores access protection",
  );
  page = await fetch(base + "/admin/login");
  html = await page.text();
  form = formData(html);
  form.set("email", email);
  form.set("password", "incorrect-password");
  const failed = await fetch(base + "/admin/login", {
    method: "POST",
    headers: { Origin: base },
    body: form,
    redirect: "manual",
  });
  assert.equal(failed.status, 200);
  assert(
    (await failed.text()).includes(
      "Sign-in failed. Check your staff credentials.",
    ),
  );
  console.log("PASS incorrect credentials show a recoverable form error");
} finally {
  if (userId) {
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) {
      console.error(
        `Temporary Auth fixture ${userId} requires manual cleanup.`,
      );
      process.exitCode = 1;
    } else
      console.log(
        "PASS temporary Auth account and cascading staff role removed",
      );
  }
}
