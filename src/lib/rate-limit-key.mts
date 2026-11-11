import { createHmac } from "node:crypto";

// Password sign-in should not depend on the separate gallery-cookie secret.
// Namespace the digest and keep IP addresses and the server key out of stored counters.
export function rateLimitKey(scope: string, ip: string, serverKey: string) {
  if (!serverKey)
    throw new Error("Supabase server key is required for rate limiting.");
  return createHmac("sha256", serverKey)
    .update("lal-studio:rate-limit:v1\0")
    .update(scope)
    .update("\0")
    .update(ip)
    .digest("hex");
}
