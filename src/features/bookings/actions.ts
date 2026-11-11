"use server";
import { z } from "zod";
import { database, live } from "@/lib/supabase";
import { rateLimit } from "@/lib/security";
import { localTimestamp } from "@/lib/studio";
import type { ActionState } from "@/components/ui/form";
const schema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d\s()-]{9,25}$/),
  email: z.email().max(254),
  service: z.string().min(1).max(150),
  starts_at: z.string().min(1),
  duration: z.coerce.number().min(0.5).max(72),
  venue: z.string().max(1000),
  requirements: z.string().max(5000),
  privacy: z.literal("on"),
  request_id: z.uuid(),
});
export async function submitBooking(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    if (!live)
      throw new Error(
        "This is a sample preview. No request has been saved. Please phone the studio to book.",
      );
    await rateLimit("booking");
    if (form.get("website")) throw new Error("Request could not be accepted.");
    const p = schema.parse(Object.fromEntries(form));
    const { data: service } = await database()
      .from("services")
      .select("id")
      .eq("name", p.service)
      .eq("published", true)
      .maybeSingle();
    if (!service) throw new Error("Choose an available service.");
    const start = localTimestamp(p.starts_at);
    if (new Date(start).getTime() < Date.now())
      throw new Error("Choose a future date and time.");
    const { data, error } = await database()
      .from("bookings")
      .upsert(
        {
          id: p.request_id,
          name: p.name,
          phone: p.phone,
          email: p.email,
          service: p.service,
          starts_at: start,
          ends_at: new Date(
            new Date(start).getTime() + p.duration * 3600000,
          ).toISOString(),
          venue: p.venue,
          requirements: p.requirements,
        },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("reference")
      .maybeSingle();
    if (error)
      throw new Error(
        "We could not save your request. Please try again or phone the studio.",
      );
    return {
      success:
        "Your request is saved as Pending. The studio will review it and contact you to confirm the details.",
      reference: data?.reference ?? "Request already received",
    };
  } catch (e) {
    return {
      error:
        e instanceof z.ZodError
          ? e.issues.map((i) => `${i.path.join(" ")}: ${i.message}`).join(" · ")
          : e instanceof Error
            ? e.message
            : "Unable to submit.",
    };
  }
}
