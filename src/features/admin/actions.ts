"use server";
import { z } from "zod";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { database, requireAdmin, authClient, live } from "@/lib/supabase";
import { sections } from "./config";
import { localTimestamp, studioDefaults } from "@/lib/studio";
import { allowedUrl, rateLimit } from "@/lib/security";
import { uploadImage, removeUnusedPublicFile } from "@/lib/storage";
import type { ActionState } from "@/components/ui/form";
import { loginSchema } from "@/features/auth/schema.mts";
import {
  backend,
  isHosted,
  authConfigurationIssues,
} from "@/lib/supabase-configuration";
function message(e: unknown) {
  return {
    error:
      e instanceof z.ZodError
        ? e.issues.map((i) => `${i.path.join(" ")} ${i.message}`).join(" · ")
        : e instanceof Error
          ? e.message
          : "The change could not be saved.",
  };
}
export async function login(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!live)
    return {
      error: isHosted
        ? `Staff sign-in is not configured on this deployment. Add the Production environment variables ${backend.missing.join(", ")} in Vercel and redeploy.`
        : "Connect Supabase to enable staff sign-in. The sample admin preview is read-only.",
    };
  try {
    const p = loginSchema.parse(Object.fromEntries(form));
    if (authConfigurationIssues.length)
      return {
        error: `Staff sign-in setup is incomplete. Configure ${authConfigurationIssues.join(", ")} in the deployment environment and redeploy.`,
      };
    await rateLimit("login", 8);
    const auth = await authClient(true);
    const { data, error } = await auth.auth.signInWithPassword(p);
    if (error?.code === "email_not_confirmed")
      return {
        error:
          "Confirm your staff email in Supabase Authentication before signing in.",
      };
    if (error || !data.user)
      return { error: "Sign-in failed. Check your staff credentials." };
    const { data: staff, error: staffError } = await database()
      .from("admins")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (staffError) {
      await auth.auth.signOut();
      return {
        error:
          "Signed in, but staff permissions could not be verified. Check the deployment’s Supabase server key and database setup.",
      };
    }
    if (!staff) {
      await auth.auth.signOut();
      return {
        error: "This account has not been provisioned as studio staff.",
      };
    }
  } catch (e) {
    return message(e);
  }
  revalidatePath("/admin", "layout");
  redirect("/admin");
}
export async function logout() {
  if (live) await (await authClient(true)).auth.signOut();
  redirect("/admin/login");
}
export async function saveRecord(
  section: string,
  id: string | undefined,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  let uploaded:
    { key: string; bucket: "portfolio" | "gallery-covers" } | undefined;
  let persisted = false;
  try {
    const actor = await requireAdmin();
    const def = sections[section];
    if (!def) throw new Error("Unknown section");
    if (id) z.uuid().parse(id);
    const db = database();
    const payload: Record<string, unknown> = {};
    for (const field of def.fields) {
      if (
        field.type === "file" ||
        [
          "passcode",
          "remove_passcode",
          "regenerate",
          "acknowledge_overlap",
        ].includes(field.name)
      )
        continue;
      const raw = form.get(field.name);
      if (field.type === "checkbox") {
        payload[field.name] = raw === "on";
        continue;
      }
      let v = String(raw ?? "").trim();
      if (field.required && !v) throw new Error(`${field.label} is required.`);
      if (v.length > 5000) throw new Error(`${field.label} is too long.`);
      if (field.options && v && !field.options.includes(v))
        throw new Error("Choose a valid option.");
      if (field.type === "number") {
        if (!v) {
          payload[field.name] = [
            "sort_order",
            "unit_cost",
            "reorder_threshold",
            "quote",
          ].includes(field.name)
            ? 0
            : null;
          continue;
        }
        const n = z.coerce.number().finite().min(0).max(999999999).parse(v);
        if (field.name === "sort_order" && !Number.isInteger(n))
          throw new Error("Order must be an integer.");
        if (
          field.name !== "sort_order" &&
          Math.abs(n * 100 - Math.round(n * 100)) > 0.00001
        )
          throw new Error(
            "Monetary amounts and thresholds support up to two decimal places.",
          );
        payload[field.name] = n;
      } else if (field.type === "datetime-local")
        payload[field.name] = v ? localTimestamp(v) : null;
      else if (field.type === "date") payload[field.name] = v || null;
      else if (field.name.endsWith("_id"))
        payload[field.name] = v ? z.uuid().parse(v) : null;
      else {
        if (field.name === "facebook_url" && v) v = allowedUrl(v, "facebook");
        if (field.name === "drive_url" && v) v = allowedUrl(v, "drive");
        payload[field.name] =
          v || (["facebook_url", "drive_url"].includes(field.name) ? null : "");
      }
    }
    if (section === "rentals") {
      const ids = String(form.get("assigned_unit_ids") ?? "").trim();
      if (ids)
        payload.assigned_unit_ids = ids
          .split(",")
          .map((x) => z.uuid().parse(x.trim()));
      else delete payload.assigned_unit_ids;
    }
    if (
      payload.starts_at &&
      payload.ends_at &&
      String(payload.ends_at) <= String(payload.starts_at)
    )
      throw new Error("End time must be after start time.");
    const previous = id
      ? (await db.from(def.table).select("*").eq("id", id).single()).data
      : null;
    if (
      section === "rentals" &&
      payload.status !== previous?.status &&
      ["Approved", "Ready for Pickup", "Collected", "Returned"].includes(
        String(payload.status),
      )
    )
      throw new Error(
        "Use the confirmation, handover & return panel to record this step.",
      );
    const file = form.get(
      section === "galleries" ? "cover_file" : "thumbnail_file",
    );
    if (file instanceof File && file.size) {
      const bucket = section === "galleries" ? "gallery-covers" : "portfolio";
      const image = await uploadImage(file, bucket);
      uploaded = { key: image.key, bucket };
      if (section === "galleries") payload.cover_key = image.key;
      else {
        payload.thumbnail = image.url;
        payload.thumbnail_key = image.key;
      }
    }
    if (section === "portfolio" && !payload.thumbnail && !previous?.thumbnail)
      throw new Error("Upload a portfolio thumbnail.");
    let error;
    if (section === "bookings" || section === "rentals") {
      if (!id)
        throw new Error(
          "Create a new request using the public booking or rental form.",
        );
      ({ error } = await db.rpc(
        section === "bookings" ? "update_booking" : "update_rental",
        {
          actor: actor.id,
          record: id,
          payload,
          ...(section === "bookings"
            ? { acknowledge_overlap: form.get("acknowledge_overlap") === "on" }
            : {}),
        },
      ));
    } else if (section === "services") {
      if (!id) throw new Error("Edit an existing service.");
      ({ error } = await db.rpc("update_service", {
        actor: actor.id,
        record: id,
        payload,
      }));
    } else if (section === "finances")
      ({ error } = await db.rpc("record_payment", {
        actor: actor.id,
        payload,
        retry_key: z.uuid().parse(form.get("retry_key")),
      }));
    else if (section === "galleries") {
      if (!id && !payload.expires_at) {
        const { data: s } = await db
          .from("settings")
          .select("value")
          .eq("id", "studio")
          .single();
        const days = Number(s?.value?.gallery_expiry_days);
        if (days > 0)
          payload.expires_at = new Date(
            Date.now() + days * 86400000,
          ).toISOString();
      }
      const code = String(form.get("passcode") ?? "");
      if (code && code.length < 4)
        throw new Error("Use a passcode of at least 4 characters.");
      if (code.length > 100) throw new Error("Passcode is too long.");
      if (Buffer.byteLength(code, "utf8") > 72)
        throw new Error("Passcode must be at most 72 UTF-8 bytes.");
      ({ error } = await db.rpc("save_gallery", {
        actor: actor.id,
        record: id ?? null,
        payload,
        passcode: form.get("remove_passcode") === "on" ? "__REMOVE__" : code,
        regenerate: form.get("regenerate") === "on",
      }));
    } else {
      ({ error } = await db.rpc("save_record", {
        actor: actor.id,
        table_name: def.table,
        record: id ?? null,
        payload,
      }));
    }
    if (error)
      throw new Error(
        error.message.includes("overlap") ||
          error.message.includes("available") ||
          error.message.includes("transition")
          ? error.message
          : "The database rejected this change. Check required fields, linked IDs and constraints.",
      );
    persisted = true;
    if (uploaded && previous?.thumbnail_key)
      await removeUnusedPublicFile(previous.thumbnail_key);
    if (uploaded && previous?.cover_key) {
      const { data: refs, error: refError } = await db
        .from("event_galleries")
        .select("id")
        .eq("cover_key", previous.cover_key);
      if (!refError && !refs?.length)
        await db.storage.from("gallery-covers").remove([previous.cover_key]);
    }
    if (["portfolio", "equipment", "services"].includes(section))
      updateTag("public-catalog");
    revalidatePath("/", "layout");
    return { success: "Saved. Your records and related views are up to date." };
  } catch (e) {
    if (uploaded && !persisted)
      await database().storage.from(uploaded.bucket).remove([uploaded.key]);
    return message(e);
  }
}
export async function deleteRecord(
  section: string,
  id: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    z.uuid().parse(id);
    if (!["portfolio", "equipment", "galleries", "calendar"].includes(section))
      throw new Error(
        "This record must be preserved. Use its status or void action.",
      );
    if (form.get("confirm") !== "on")
      throw new Error("Confirm deletion first.");
    const db = database();
    const def = sections[section];
    const { data: old } = await db
      .from(def.table)
      .select("*")
      .eq("id", id)
      .single();
    const { error } = await db.rpc("delete_record", {
      actor: actor.id,
      table_name: def.table,
      record: id,
    });
    if (error) throw new Error("Record is in use and cannot be deleted.");
    if (old?.thumbnail_key) await removeUnusedPublicFile(old.thumbnail_key);
    if (old?.cover_key)
      await db.storage.from("gallery-covers").remove([old.cover_key]);
    if (["portfolio", "equipment"].includes(section))
      updateTag("public-catalog");
    revalidatePath("/", "layout");
    return { success: "Record deleted." };
  } catch (e) {
    return message(e);
  }
}
export async function stockMovement(
  id: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const p = z
      .object({
        quantity: z.coerce
          .number()
          .finite()
          .refine((x) => x !== 0)
          .refine((x) => Math.abs(x) < 1e9),
        reason: z.enum(["Restock", "Usage", "Sale", "Damage", "Adjustment"]),
        notes: z.string().max(5000),
        retry_key: z.uuid(),
      })
      .parse(Object.fromEntries(form));
    const { error } = await database().rpc("move_stock", {
      actor: actor.id,
      item: z.uuid().parse(id),
      delta: p.quantity,
      reason_text: p.reason,
      notes_text: p.notes,
      retry_key: p.retry_key,
    });
    if (error)
      throw new Error(
        "Movement rejected. Check direction and available stock. Stock cannot become negative.",
      );
    revalidatePath("/admin", "layout");
    return { success: "Stock movement recorded." };
  } catch (e) {
    return message(e);
  }
}
export async function voidPayment(
  id: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const reason = z.string().trim().min(5).max(1000).parse(form.get("reason"));
    const { error } = await database().rpc("void_payment", {
      actor: actor.id,
      record: z.uuid().parse(id),
      reason_text: reason,
    });
    if (error) throw new Error("Could not void this payment.");
    revalidatePath("/admin", "layout");
    return {
      success: "Payment voided. The original and audit history are preserved.",
    };
  } catch (e) {
    return message(e);
  }
}
export async function saveSettings(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  let uploadedKey: string | undefined;
  let persisted = false;
  try {
    const actor = await requireAdmin();
    const value: Record<string, string | number> = {};
    for (const key of Object.keys(studioDefaults)) {
      if (
        [
          "established",
          "timezone",
          "currency",
          "name",
          "hero_image",
          "hero_image_key",
        ].includes(key)
      )
        continue;
      let v = String(form.get(key) ?? "").trim();
      if (v.length > 5000) throw new Error("A setting is too long.");
      if (key === "email") z.email().parse(v);
      if (
        [
          "phone",
          "international_phone",
          "address",
          "map_destination",
          "hero_headline",
          "introduction",
        ].includes(key) &&
        !v
      )
        throw new Error(`${key} is required.`);
      if (key.endsWith("_days") && v)
        z.coerce.number().int().min(1).max(3650).parse(v);
      if (key === "social_facebook" && v) v = allowedUrl(v, "facebook");
      if (key === "social_instagram" && v) v = allowedUrl(v, "instagram");
      if (key === "hero_image_alt" && v.length > 300)
        throw new Error(
          "Keep the photograph description under 300 characters.",
        );
      value[key] = v;
    }
    const db = database();
    const { data: current, error: readError } = await db
      .from("settings")
      .select("value")
      .eq("id", "studio")
      .single();
    if (readError)
      throw new Error(
        "Current settings could not be loaded. Please try again.",
      );
    const file = form.get("hero_image_file");
    const reset = form.get("reset_hero_image") === "on";
    if (reset && file instanceof File && file.size)
      throw new Error(
        "Choose either a replacement photograph or restore the default, not both.",
      );
    if (file instanceof File && file.size) {
      const image = await uploadImage(file, "portfolio", { landscape: true });
      uploadedKey = image.key;
      value.hero_image = image.url!;
      value.hero_image_key = image.key;
    } else if (reset) {
      value.hero_image = "";
      value.hero_image_key = "";
      value.hero_image_alt = studioDefaults.hero_image_alt;
    }
    const { error } = await db.rpc("set_settings", {
      actor: actor.id,
      payload: value,
    });
    if (error) throw new Error("Settings could not be saved.");
    persisted = true;
    const previousKey = current.value?.hero_image_key;
    if (
      (uploadedKey || reset) &&
      typeof previousKey === "string" &&
      previousKey
    )
      await removeUnusedPublicFile(previousKey);
    updateTag("studio-settings");
    revalidatePath("/", "layout");
    return { success: "Studio settings saved across the website." };
  } catch (e) {
    if (uploadedKey && !persisted)
      await database().storage.from("portfolio").remove([uploadedKey]);
    return message(e);
  }
}
export async function deleteDocument(
  id: string,
  _: ActionState,
): Promise<ActionState> {
  try {
    void _;
    const actor = await requireAdmin();
    const db = database();
    const { data: doc } = await db
      .from("verification_documents")
      .select("storage_key")
      .eq("id", z.uuid().parse(id))
      .is("deleted_at", null)
      .single();
    if (!doc) throw new Error("Document is already removed.");
    const { error } = await db.storage
      .from("verification")
      .remove([doc.storage_key]);
    if (error) throw new Error("File removal failed. Try again.");
    const { error: markError } = await db.rpc("delete_document", {
      actor: actor.id,
      record: id,
    });
    if (markError)
      throw new Error("File removed, but record needs to be refreshed.");
    revalidatePath("/admin", "layout");
    return { success: "Verification document permanently removed." };
  } catch (e) {
    return message(e);
  }
}
