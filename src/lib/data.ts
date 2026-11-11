import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { database, live, requireAdmin } from "./supabase";
import {
  studioDefaults,
  samplePortfolio,
  sampleEquipment,
  services,
  type StudioSettings,
  type Row,
} from "./studio";
const cachedSettings = unstable_cache(
  async (): Promise<StudioSettings> => {
    const { data, error } = await database()
      .from("settings")
      .select("value")
      .eq("id", "studio")
      .single();
    if (error)
      throw new Error("Studio settings are unavailable. Please try again.");
    return { ...studioDefaults, ...data.value };
  },
  ["studio-settings"],
  { tags: ["studio-settings"], revalidate: 300 },
);
export const settings = cache(async (): Promise<StudioSettings> =>
  live ? cachedSettings() : studioDefaults,
);
export async function publicRows(
  table: "portfolio" | "equipment" | "services",
): Promise<Row[]> {
  if (!live)
    return table === "portfolio"
      ? samplePortfolio
      : table === "services"
        ? services.map((name, i) => ({
            id: `sample-service-${i}`,
            name,
            published: true,
          }))
        : sampleEquipment;
  return cachedPublicRows(table);
}
// Only published catalog data is shared across requests. Private records stay uncached.
const cachedPublicRows = unstable_cache(
  async (table: "portfolio" | "equipment" | "services"): Promise<Row[]> => {
    const { data, error } = await database()
      .from(table)
      .select("*")
      .eq("published", true)
      .order(table === "equipment" ? "name" : "sort_order");
    if (error) throw new Error("This collection is temporarily unavailable.");
    return data ?? [];
  },
  ["public-catalog"],
  { tags: ["public-catalog"], revalidate: 300 },
);
export const adminRows = cache(async (table: string): Promise<Row[]> => {
  await requireAdmin(true);
  if (!live)
    return table === "portfolio"
      ? samplePortfolio
      : table === "equipment"
        ? sampleEquipment
        : [];
  const rows: Row[] = [];
  // Fetch all pages so dashboards and exports never silently omit older records.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await database()
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error)
      throw new Error(
        "Records could not be loaded. Check the database migration.",
      );
    rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  return rows;
});
