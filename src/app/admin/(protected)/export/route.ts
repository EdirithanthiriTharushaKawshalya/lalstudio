import { requireAdmin, live } from "@/lib/supabase";
import { adminRows } from "@/lib/data";
export async function GET(request: Request) {
  if (!live)
    return new Response(
      "Sample preview is read-only. Connect Supabase to export records.",
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  await requireAdmin();
  const q = new URL(request.url).searchParams;
  const section = q.get("section");
  if (!["inventory", "finances", "movements"].includes(section ?? ""))
    return new Response("Invalid export", { status: 400 });
  const columns =
    section === "movements"
      ? [
          "created_at",
          "inventory_id",
          "quantity",
          "reason",
          "notes",
          "actor_id",
        ]
      : section === "inventory"
        ? [
            "name",
            "category",
            "sku",
            "variant",
            "unit",
            "quantity",
            "reorder_threshold",
            "unit_cost",
            "selling_price",
            "supplier",
          ]
        : [
            "date",
            "category",
            "kind",
            "amount",
            "description",
            "payment_method",
            "reference",
            "booking_id",
            "rental_id",
            "voided",
          ];
  let rows = await adminRows(
    section === "movements"
      ? "stock_movements"
      : section === "inventory"
        ? "inventory"
        : "financial_transactions",
  );
  if (section === "finances")
    rows = rows.filter(
      (x) =>
        (!q.get("from") || String(x.date) >= q.get("from")!) &&
        (!q.get("to") || String(x.date) <= q.get("to")!),
    );
  const esc = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const csv = [
    columns.map(esc).join(","),
    ...rows.map((r) => columns.map((c) => esc(r[c])).join(",")),
  ].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lal-studio-${section}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
