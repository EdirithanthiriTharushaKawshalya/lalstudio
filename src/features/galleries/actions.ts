"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { database, live } from "@/lib/supabase";
import { rateLimit, signature } from "@/lib/security";
import { galleryProof } from "./server";
import type { ActionState } from "@/components/ui/form";
export async function findGallery(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  let token = String(form.get("code") ?? "").trim();
  try {
    if (token.includes("/")) {
      const url = new URL(token);
      token = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    }
    if (!/^[a-f0-9]{64}$/.test(token))
      return {
        error:
          "Enter the complete gallery link or the 64-character access code from the studio.",
      };
  } catch {
    return { error: "Please enter a valid gallery link or access code." };
  }
  redirect(`/event-gallery/${token}`);
}
export async function unlockGallery(
  token: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    if (!live)
      throw new Error("Gallery delivery is unavailable in sample preview.");
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("Gallery unavailable.");
    await rateLimit("gallery", 8);
    const passcode = String(form.get("passcode") ?? "");
    if (!passcode || passcode.length > 100)
      throw new Error("Enter your gallery passcode.");
    const db = database();
    const { data, error } = await db.rpc("unlock_gallery", {
      share_token: token,
      passcode,
    });
    if (error || !data)
      throw new Error(
        "Access could not be granted. Check your passcode or contact the studio.",
      );
    const { data: g } = await db
      .from("event_galleries")
      .select("passcode_hash")
      .eq("token", token)
      .single();
    const expiry = Date.now() + 60 * 60 * 1000;
    (await cookies()).set(
      `gallery_${signature(token).slice(0, 16)}`,
      `${expiry}.${galleryProof(token, g!.passcode_hash, expiry)}`,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: `/event-gallery/${token}`,
        maxAge: 3600,
      },
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Access unavailable." };
  }
  redirect(`/event-gallery/${token}`);
}
