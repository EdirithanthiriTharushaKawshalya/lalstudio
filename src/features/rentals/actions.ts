"use server";
import { z } from "zod";
import { database, live, requireAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/security";
import { uploadImage } from "@/lib/storage";
import { localTimestamp } from "@/lib/studio";
import type { ActionState } from "@/components/ui/form";
import { settings } from "@/lib/data";
export async function submitRental(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const uploaded: string[] = [];
  let persisted = false;
  try {
    if (!live)
      throw new Error(
        "Sample preview only. No request or identity document has been saved. Please contact the studio.",
      );
    await rateLimit("rental", 3);
    if (form.get("website")) throw new Error("Request could not be accepted.");
    const p = z
      .object({
        name: z.string().trim().min(2).max(150),
        phone: z.string().regex(/^[+\d\s()-]{9,25}$/),
        email: z.email(),
        address: z.string().min(5).max(1000),
        starts_at: z.string().min(1),
        ends_at: z.string().min(1),
        notes: z.string().max(5000),
        privacy: z.literal("on"),
        request_id: z.uuid(),
      })
      .parse(Object.fromEntries(form));
    const start = localTimestamp(p.starts_at),
      end = localTimestamp(p.ends_at);
    if (new Date(start).getTime() < Date.now() || end <= start)
      throw new Error(
        "Choose future pickup and return times, with return after pickup.",
      );
    const items = [...form.entries()]
      .filter(([k, v]) => k.startsWith("qty_") && Number(v) > 0)
      .map(([k, v]) => ({
        equipment_id: z.uuid().parse(k.slice(4)),
        quantity: z.coerce.number().int().min(1).max(20).parse(v),
      }));
    if (!items.length || items.length > 20)
      throw new Error("Select at least one piece of equipment.");
    const db = database();
    const { data: existing } = await db
      .from("rentals")
      .select("reference")
      .eq("id", p.request_id)
      .maybeSingle();
    if (existing)
      return {
        success: `Your request was already received. Call ${(await settings()).international_phone} with this reference to confirm availability.`,
        reference: existing.reference,
      };
    const docs = [];
    for (const kind of ["id_front", "id_back", "selfie"]) {
      const file = form.get(kind);
      if (!(file instanceof File) || !file.size)
        throw new Error("Add both sides of your ID and a selfie.");
      const image = await uploadImage(file, "verification");
      uploaded.push(image.key);
      docs.push({ kind, storage_key: image.key });
    }
    const { data, error } = await db.rpc("create_rental", {
      payload: {
        id: p.request_id,
        name: p.name,
        phone: p.phone,
        email: p.email,
        address: p.address,
        starts_at: start,
        ends_at: end,
        notes: p.notes,
      },
      items,
      docs,
    });
    if (error)
      throw new Error(
        "The request could not be saved. Confirm your selection and try again.",
      );
    persisted = true;
    // Concurrent retries can upload a second set before the intake transaction wins.
    const { data: savedDocuments, error: documentError } = await db
      .from("verification_documents")
      .select("storage_key")
      .eq("rental_id", p.request_id);
    if (!documentError) {
      const savedKeys = new Set(savedDocuments.map((d) => d.storage_key));
      const unused = uploaded.filter((key) => !savedKeys.has(key));
      if (unused.length) await db.storage.from("verification").remove(unused);
    }
    return {
      success: `Your rental request is saved as Pending Review. Call ${(await settings()).international_phone} with your reference to confirm availability. Your request is not confirmed until the studio approves it.`,
      reference: String(data),
    };
  } catch (e) {
    if (uploaded.length && !persisted)
      await database().storage.from("verification").remove(uploaded);
    return {
      error:
        e instanceof z.ZodError
          ? "Check your contact details, dates and equipment quantities."
          : e instanceof Error
            ? e.message
            : "Unable to submit.",
    };
  }
}

export async function advanceRental(
  id: string,
  nextStatus: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const target = z
      .enum(["Approved", "Ready for Pickup", "Collected", "Returned"])
      .parse(nextStatus);
    z.uuid().parse(id);
    if (form.get("confirmed") !== "on")
      throw new Error("Confirm the action before continuing.");
    const condition = String(form.get("condition") ?? "").trim();
    if (["Collected", "Returned"].includes(target))
      z.string()
        .min(3, "Record the equipment condition.")
        .max(5000)
        .parse(condition);
    const db = database();
    const { data: current, error: readError } = await db
      .from("rentals")
      .select("status")
      .eq("id", id)
      .single();
    if (readError || !current)
      throw new Error("Rental request could not be loaded.");
    if (current.status === target)
      return { success: "This step is already recorded." };
    const payload = {
      status: target,
      ...(target === "Collected"
        ? { pickup_condition: condition }
        : target === "Returned"
          ? { return_condition: condition }
          : {}),
    };
    const { error } = await db.rpc("update_rental", {
      actor: actor.id,
      record: id,
      payload,
    });
    if (error)
      throw new Error(
        error.message.includes("available")
          ? "Equipment is not available for these dates. Review units and dates before confirming."
          : "This step could not be recorded. Refresh the record and check its current status.",
      );
    revalidatePath("/admin", "layout");
    return {
      success:
        target === "Collected"
          ? "Handover recorded. The equipment is now marked as with the client."
          : target === "Returned"
            ? "Return recorded. The physical units have been released."
            : target === "Approved"
              ? "Request approved after confirmation. Physical units are reserved."
              : "Equipment marked ready for pickup. No handover has been recorded yet.",
    };
  } catch (e) {
    return {
      error:
        e instanceof z.ZodError
          ? e.issues.map((x) => x.message).join(" ")
          : e instanceof Error
            ? e.message
            : "This step could not be recorded.",
    };
  }
}
