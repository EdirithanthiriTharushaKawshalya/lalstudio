import { test } from "node:test";
import assert from "node:assert/strict";
import { loginSchema } from "../src/features/auth/schema.mts";
import { readBackendConfiguration } from "../src/lib/backend-configuration.mts";
import { rateLimitKey } from "../src/lib/rate-limit-key.mts";

test("Login accepts existing Supabase passwords without applying new-account strength rules", () => {
  const parsed = loginSchema.parse({
    email: "  Staff@Example.com ",
    password: "123456",
  });
  assert.equal(parsed.email, "staff@example.com");
  assert.equal(parsed.password, "123456");
  assert.equal(
    loginSchema.parse({ email: "staff@example.com", password: " pass word " })
      .password,
    " pass word ",
  );
  assert.throws(() =>
    loginSchema.parse({ email: "staff@example.com", password: "" }),
  );
  assert.throws(() =>
    loginSchema.parse({ email: "not-an-email", password: "123456" }),
  );
});
test("Modern Supabase production key names configure both Auth and server access", () => {
  const c = readBackendConfiguration({
    NEXT_PUBLIC_SUPABASE_URL: " https://project.supabase.co/ ",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " public-key ",
    SUPABASE_SECRET_KEY: " private-key ",
  });
  assert(c.configured);
  assert.deepEqual(c.missing, []);
  assert.equal(c.url, "https://project.supabase.co");
  assert.equal(c.publishableKey, "public-key");
  assert.equal(c.secretKey, "private-key");
});
test("Legacy environment variable names remain supported", () => {
  const c = readBackendConfiguration({
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "old-public",
    SUPABASE_SERVICE_ROLE_KEY: "old-private",
  });
  assert(c.configured);
  assert.equal(c.publishableKey, "old-public");
  assert.equal(c.secretKey, "old-private");
});
test("Blank modern aliases do not mask configured legacy keys", () => {
  const c = readBackendConfiguration({
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " ",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-public",
    SUPABASE_SECRET_KEY: " ",
    SUPABASE_SERVICE_ROLE_KEY: "legacy-private",
  });
  assert(c.configured);
  assert.equal(c.publishableKey, "legacy-public");
  assert.equal(c.secretKey, "legacy-private");
});
test("Login rate limits remain scoped and opaque without APP_SECRET", () => {
  const key = "test-server-key";
  const identity = rateLimitKey("login", "192.0.2.10", key);
  assert.match(identity, /^[a-f0-9]{64}$/);
  assert.equal(identity, rateLimitKey("login", "192.0.2.10", key));
  assert.notEqual(identity, rateLimitKey("gallery", "192.0.2.10", key));
  assert.notEqual(identity, rateLimitKey("login", "192.0.2.11", key));
  assert.notEqual(
    identity,
    rateLimitKey("login", "192.0.2.10", "different-key"),
  );
  assert.throws(() => rateLimitKey("login", "192.0.2.10", ""));
});
test("Incomplete deployment configuration reports names without disclosing supplied keys", () => {
  const c = readBackendConfiguration({
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "do-not-print-this",
  });
  assert(!c.configured);
  assert.match(c.missing.join(" "), /SUPABASE_SECRET_KEY/);
  assert(!c.missing.join(" ").includes("do-not-print-this"));
});
