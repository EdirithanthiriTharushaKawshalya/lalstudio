import "server-only";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { database, live } from "@/lib/supabase";
import { signature } from "@/lib/security";
export function galleryProof(
  token: string,
  hash: string | null,
  expiry: number,
) {
  return signature(`${token}:${hash ?? ""}:${expiry}`);
}
export async function accessibleGallery(token: string) {
  if (!live || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { data: g, error } = await database()
    .from("event_galleries")
    .select("*")
    .eq("token", token)
    .eq("published", true)
    .eq("revoked", false)
    .maybeSingle();
  if (error) throw new Error("Gallery is temporarily unavailable.");
  if (!g || (g.expires_at && new Date(g.expires_at) <= new Date())) return null;
  if (g.passcode_hash) {
    const raw =
      (await cookies()).get(`gallery_${signature(token).slice(0, 16)}`)
        ?.value ?? "";
    const [expiry, proof] = raw.split(".");
    if (!expiry || Number(expiry) < Date.now() || !proof)
      return { locked: true as const };
    const expected = galleryProof(token, g.passcode_hash, Number(expiry));
    if (
      proof.length !== expected.length ||
      !timingSafeEqual(Buffer.from(proof), Buffer.from(expected))
    )
      return { locked: true as const };
  }
  const { data: cover } = g.cover_key
    ? await database()
        .storage.from("gallery-covers")
        .createSignedUrl(g.cover_key, 300)
    : { data: null };
  return {
    locked: false as const,
    title: String(g.title),
    description: String(g.description),
    client_name: String(g.client_name),
    event_date: g.event_date as string | null,
    studio_message: String(g.studio_message),
    facebook_url: g.facebook_url as string | null,
    drive_url: g.drive_url as string | null,
    cover: cover?.signedUrl,
  };
}
