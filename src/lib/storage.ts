import "server-only";
import { randomUUID } from "node:crypto";
import { prepareUpload } from "./image-processing.mts";
import { database } from "./supabase";
export async function uploadImage(
  file: File,
  bucket: "portfolio" | "verification" | "gallery-covers",
  options: { landscape?: boolean } = {},
) {
  const safe = await prepareUpload(file, options);
  const key = `${randomUUID()}.webp`;
  const db = database();
  const { error } = await db.storage
    .from(bucket)
    .upload(key, safe, { contentType: "image/webp", upsert: false });
  if (error) throw new Error("Upload failed. Please try again.");
  return {
    key,
    url:
      bucket === "portfolio"
        ? db.storage.from(bucket).getPublicUrl(key).data.publicUrl
        : undefined,
  };
}
export async function removeUnusedPublicFile(key: string) {
  const db = database();
  const [p, e, s] = await Promise.all([
    db.from("portfolio").select("id").eq("thumbnail_key", key),
    db.from("equipment").select("id").eq("thumbnail_key", key),
    db.from("settings").select("value").eq("id", "studio").single(),
  ]);
  if (
    !p.error &&
    !e.error &&
    !s.error &&
    !p.data?.length &&
    !e.data?.length &&
    s.data.value?.hero_image_key !== key
  )
    await db.storage.from("portfolio").remove([key]);
}
