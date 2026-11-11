import assert from "node:assert/strict";
const base = process.env.TEST_SITE_URL || "http://localhost:3000";
const routes = [
  "/",
  "/portfolio",
  "/services",
  "/about",
  "/bookings",
  "/rentals",
  "/event-gallery",
  "/privacy",
  "/admin/login",
  "/admin",
  "/admin/portfolio",
  "/admin/bookings",
  "/admin/rentals",
  "/admin/equipment",
  "/admin/units",
  "/admin/calendar",
  "/admin/inventory",
  "/admin/finances",
  "/admin/galleries",
  "/admin/settings",
  "/rentals?item=sample-camera",
];
for (const path of routes) {
  const r = await fetch(base + path);
  assert.equal(r.status, 200, path);
  const html = await r.text();
  assert(!html.includes("Internal Server Error"), path);
  assert(html.includes("LAL"), `${path}: studio identity`);
  assert.match(
    html,
    /name="viewport"[^>]*width=device-width/,
    `${path}: mobile viewport metadata`,
  );
  console.log(`PASS ${path}`);
}
const sitemap = await (await fetch(base + "/sitemap.xml")).text();
assert(!sitemap.includes("/event-gallery"));
assert(!sitemap.includes("/admin"));
const privateRoute = await fetch(base + "/event-gallery/" + "a".repeat(64));
assert.equal(privateRoute.status, 200);
assert.match(await privateRoute.text(), /gallery is unavailable/);
const noexport = await fetch(base + "/admin/export?section=inventory");
assert.notEqual(
  noexport.status,
  200,
  "Read-only preview must not export private records",
);
const retention = await fetch(base + "/api/retention");
assert.equal(retention.status, 401);
console.log(
  "PASS sitemap exclusions, unavailable gallery, private export and cron authorization",
);
const bookingHtml = await (await fetch(base + "/bookings")).text();
const rentalCatalog = await (await fetch(base + "/rentals")).text();
assert(!rentalCatalog.includes("Check availability"));
assert(
  !rentalCatalog.includes('name="starts_at"'),
  "Catalog shows cards before a client selects an item",
);
if (rentalCatalog.includes("SAMPLE PREVIEW")) {
  assert(rentalCatalog.includes("/rentals?item=sample-camera#request"));
  const rentalForm = await (
    await fetch(base + "/rentals?item=sample-camera")
  ).text();
  assert(rentalForm.includes('name="qty_sample-camera"'));
  assert(rentalForm.includes('name="starts_at"'));
  assert(rentalForm.includes("Call us to confirm"));
  console.log(
    "PASS rental cards open selected-item forms without an availability checker",
  );
}
for (const route of ["/", "/admin/login", "/admin"]) {
  const html = await (await fetch(base + route)).text();
  assert(html.includes("studio-logo-name"));
  assert(html.includes("Photographs become memories."));
}
console.log(
  "PASS shared footer-style wordmark across public and admin screens",
);
if (bookingHtml.includes("SAMPLE PREVIEW")) {
  const nextBookingHtml = await (await fetch(base + "/bookings")).text();
  const id = (html) => html.match(/name="request_id" value="([^"]+)"/)?.[1];
  assert(id(bookingHtml));
  assert.notEqual(
    id(bookingHtml),
    id(nextBookingHtml),
    "Each visitor must receive an independent request ID",
  );
  const formHtml = bookingHtml.match(/<form[\s\S]*?<\/form>/)?.[0];
  assert(formHtml);
  const decode = (s) =>
    s
      .replaceAll("&quot;", '"')
      .replaceAll("&amp;", "&")
      .replaceAll("&#x27;", "'");
  const form = new FormData();
  for (const m of formHtml.matchAll(/<input\b[^>]*type="hidden"[^>]*>/g)) {
    const name = m[0].match(/name="([^"]+)"/)?.[1];
    const value = m[0].match(/value="([^"]*)"/)?.[1] ?? "";
    if (name) form.set(decode(name), decode(value));
  }
  for (const [key, value] of Object.entries({
    name: "Preview test",
    phone: "0000000000",
    email: "preview@example.invalid",
    service: "Studio portraits",
    starts_at: "2035-01-01T09:00",
    duration: "1",
    venue: "Test only",
    requirements: "Test only",
    privacy: "on",
  }))
    form.set(key, value);
  const response = await fetch(base + "/bookings", {
    method: "POST",
    headers: { Origin: base },
    body: form,
  });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /No request has been saved/);
  console.log(
    "PASS independent booking request IDs and server-side unsaved-preview form response",
  );
}
const image = await fetch(
  base + "/_next/image?url=%2Fphotos%2Fhero-celebration.jpg&w=1920&q=75",
  { headers: { Accept: "image/webp" } },
);
assert.equal(image.status, 200);
assert.match(image.headers.get("content-type"), /^image\//);
console.log("PASS local hero image optimization");
const home = await (await fetch(base)).text();
assert.match(
  home,
  /hero-celebration[^"<>\s]*q=90/,
  "Hero uses the higher image quality",
);
const qualityHero = await fetch(
  base + "/_next/image?url=%2Fphotos%2Fhero-celebration.jpg&w=1920&q=90",
  { headers: { Accept: "image/webp" } },
);
assert.equal(qualityHero.status, 200);
const adminHome = await (await fetch(base + "/admin")).text();
assert(adminHome.includes('aria-controls="admin-navigation"'));
assert(adminHome.includes('aria-label="Open studio navigation"'));
const calendar = await (await fetch(base + "/admin/calendar")).text();
assert(calendar.includes("calendar-scroll"));
assert(calendar.includes("Scroll horizontally to see all dates."));
console.log(
  "PASS viewport metadata, high-quality hero delivery and accessible mobile navigation/calendar markup (layout still requires a browser)",
);
const settingsHtml = await (await fetch(base + "/admin/settings")).text();
assert(settingsHtml.includes('name="hero_image_file"'));
assert(settingsHtml.includes('name="hero_image_alt"'));
assert(settingsHtml.includes("hero-image-preview"));
assert(settingsHtml.includes("1600"));
console.log(
  "PASS admin hero upload, description and current-image preview render",
);
