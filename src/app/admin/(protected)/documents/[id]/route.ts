import { requireAdmin, database } from "@/lib/supabase";
import { z } from "zod";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return new Response("Not found", { status: 404 });
  const db = database();
  const { data: doc } = await db
    .from("verification_documents")
    .select("storage_key")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (!doc) return new Response("Not found", { status: 404 });
  const { data, error } = await db.storage
    .from("verification")
    .createSignedUrl(doc.storage_key, 60);
  if (error) return new Response("File unavailable", { status: 503 });
  return new Response(null, {
    status: 302,
    headers: {
      Location: data.signedUrl,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
