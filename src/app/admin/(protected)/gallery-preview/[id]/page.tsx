import { requireAdmin, database } from "@/lib/supabase";
import { GalleryDelivery } from "@/features/galleries/delivery";
import { notFound } from "next/navigation";
export default async function Preview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const db = database();
  const { data: g } = await db
    .from("event_galleries")
    .select("*")
    .eq("id", id)
    .single();
  if (!g) notFound();
  const { data: cover } = g.cover_key
    ? await db.storage.from("gallery-covers").createSignedUrl(g.cover_key, 300)
    : { data: null };
  return (
    <>
      <p className="message">
        Staff preview · draft, expiry and access restrictions are bypassed for
        this preview only.
      </p>
      <GalleryDelivery gallery={{ ...g, cover: cover?.signedUrl }} />
    </>
  );
}
