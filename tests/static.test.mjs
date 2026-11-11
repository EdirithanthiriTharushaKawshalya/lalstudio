import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
test("Sample photograph assets exist locally and are real images", async () => {
  for (const name of [
    "hero-celebration",
    "wedding",
    "portrait",
    "family",
    "couple",
    "event",
    "camera",
  ]) {
    const b = await readFile(`public/photos/${name}.jpg`);
    assert(b.length > 10000);
    assert.equal(b[0], 0xff);
    assert.equal(b[1], 0xd8);
  }
});
test("All public request routes exist and booking IDs are generated per request", async () => {
  for (const route of [
    "about",
    "portfolio",
    "services",
    "bookings",
    "rentals",
    "privacy",
    "event-gallery",
  ])
    assert((await stat(`src/app/(public)/${route}/page.tsx`)).isFile());
  const booking = await readFile("src/app/(public)/bookings/page.tsx", "utf8");
  assert.match(booking, /force-dynamic/);
});
test("Migrations and environment example are included for reproducible setup", async () => {
  assert.equal(
    (await readdir("supabase/migrations")).filter((n) => n.endsWith(".sql"))
      .length,
    6,
  );
  const env = await readFile(".env.example", "utf8");
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "APP_SECRET",
    "CRON_SECRET",
  ])
    assert(env.includes(key + "="));
});
