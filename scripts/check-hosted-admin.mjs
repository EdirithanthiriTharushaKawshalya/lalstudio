const base = "https://lalstudio.vercel.app";
const decode = (s) =>
  s
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'");
const pages = {};
for (const path of ["/", "/admin", "/admin/login"]) {
  const response = await fetch(base + path, { redirect: "manual" });
  const html = await response.text();
  pages[path] = html;
  console.log(
    JSON.stringify({
      path,
      status: response.status,
      location: response.headers.get("location"),
      title: html.match(/<title>(.*?)<\/title>/)?.[1],
      samplePreview: html.includes("SAMPLE PREVIEW"),
      supabaseDisconnected: html.includes("Supabase is not connected"),
      loginForm: html.includes('name="password"'),
      dashboard: html.includes("A good day to make memories."),
      cacheControl: response.headers.get("cache-control"),
    }),
  );
}
if (process.argv.includes("--probe-form")) {
  const form = pages["/admin/login"].match(/<form\b[\s\S]*?<\/form>/)?.[0];
  if (!form) throw new Error("Hosted login form is unavailable.");
  const body = new FormData();
  for (const input of form.matchAll(/<input\b[^>]*type="hidden"[^>]*>/g)) {
    const name = input[0].match(/name="([^"]+)"/)?.[1];
    const value = input[0].match(/value="([^"]*)"/)?.[1] || "";
    if (name) body.set(decode(name), decode(value));
  }
  // Deliberately invalid credentials inspect error handling; no real account is attempted.
  body.set("email", "invalid-email");
  body.set("password", "invalid-password");
  const response = await fetch(base + "/admin/login", {
    method: "POST",
    headers: { Origin: base },
    body,
    redirect: "manual",
  });
  const html = await response.text();
  const messages = [
    ...html.matchAll(/<p[^>]*class="[^"]*message[^\"]*"[^>]*>([\s\S]*?)<\/p>/g),
  ].map((m) =>
    decode(
      m[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    ),
  );
  console.log(
    JSON.stringify({
      probe: "invalid-credentials-form",
      status: response.status,
      location: response.headers.get("location"),
      messages,
    }),
  );
}
