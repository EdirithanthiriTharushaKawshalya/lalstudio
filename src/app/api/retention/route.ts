import { timingSafeEqual } from "node:crypto";
import { database, live } from "@/lib/supabase";
export async function GET(request: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const supplied = request.headers.get("authorization") ?? "";
  if (
    !process.env.CRON_SECRET ||
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return new Response("Unauthorized", { status: 401 });
  if (!live)
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  const db = database();
  const { data: s } = await db
    .from("settings")
    .select("value")
    .eq("id", "studio")
    .single();
  const days = Number(s?.value?.document_retention_days);
  if (!days || days < 1)
    return Response.json({ skipped: "Owner has not set retention days." });
  const { data: docs, error } = await db
    .from("verification_documents")
    .select("id,storage_key")
    .is("deleted_at", null)
    .lt("created_at", new Date(Date.now() - days * 86400000).toISOString())
    .limit(100);
  if (error)
    return Response.json(
      { error: "Could not read retention queue" },
      { status: 500 },
    );
  let deleted = 0;
  for (const doc of docs ?? []) {
    const { error } = await db.storage
      .from("verification")
      .remove([doc.storage_key]);
    if (!error) {
      const { error: markError } = await db
        .from("verification_documents")
        .update({
          deleted_at: new Date().toISOString(),
          storage_key: `deleted:${doc.id}`,
        })
        .eq("id", doc.id);
      if (!markError) deleted++;
    }
  }
  return Response.json(
    { deleted },
    { headers: { "Cache-Control": "no-store" } },
  );
}
