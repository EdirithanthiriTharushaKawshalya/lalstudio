import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { database } from "./supabase";
export function signature(value: string) {
  if (!process.env.APP_SECRET || process.env.APP_SECRET.length < 32)
    throw new Error(
      "Set APP_SECRET to a random secret of at least 32 characters.",
    );
  return createHmac("sha256", process.env.APP_SECRET)
    .update(value)
    .digest("hex");
}
export async function rateLimit(scope: string, max = 5, seconds = 900) {
  const h = await headers();
  const ip =
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const { data, error } = await database().rpc("consume_rate", {
    k: signature(`${scope}:${ip}`),
    max_attempts: max,
    seconds,
  });
  if (error || !data)
    throw new Error(
      "Too many attempts. Please wait a little before trying again.",
    );
}
export function allowedUrl(
  value: string,
  host: "facebook" | "drive" | "instagram",
) {
  const u = new URL(value);
  const hosts =
    host === "facebook"
      ? ["facebook.com", "www.facebook.com"]
      : host === "drive"
        ? ["drive.google.com"]
        : ["instagram.com", "www.instagram.com"];
  if (
    u.protocol !== "https:" ||
    !hosts.includes(u.hostname) ||
    u.username ||
    u.password ||
    u.port
  )
    throw new Error(`Use a valid HTTPS ${host} link.`);
  return u.toString();
}
