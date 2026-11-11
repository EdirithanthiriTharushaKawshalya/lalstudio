import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { Plus, ArrowLeft, Download, ArrowUpRight } from "lucide-react";
import { sections } from "@/features/admin/config";
import {
  saveRecord,
  deleteRecord,
  stockMovement,
  voidPayment,
  saveSettings,
  deleteDocument,
} from "@/features/admin/actions";
import { adminRows, settings } from "@/lib/data";
import { database, live, requireAdmin } from "@/lib/supabase";
import { ActionForm, Field, Check } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecordsTable } from "@/features/admin/table";
import { RentalWorkflow } from "@/features/rentals/workflow";
import { HeroImageFields } from "@/features/settings/hero-image-fields";
import { Calendar } from "@/features/calendar/calendar";
import { money, dateTime, type Row } from "@/lib/studio";
function fieldValue(
  row: Row | undefined,
  name: string,
  type?: string,
): string | number | undefined {
  const v = row?.[name];
  if (type === "datetime-local" && v) {
    const date = new Date(String(v));
    return new Date(date.getTime() + 19800000).toISOString().slice(0, 16);
  }
  return typeof v === "string" || typeof v === "number" ? v : undefined;
}
export default async function AdminSection({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{
    edit?: string;
    new?: string;
    date?: string;
    from?: string;
    to?: string;
    booking?: string;
    rental?: string;
  }>;
}) {
  await requireAdmin(true);
  const { section } = await params;
  const q = await searchParams;
  if (section === "settings") {
    const s = await settings();
    const labels: Record<string, string> = {
      phone: "Local phone",
      international_phone: "International phone",
      email: "Email",
      address: "Display address",
      map_destination: "Map search destination",
      introduction: "Studio introduction",
      hero_headline: "Homepage headline",
      social_facebook: "Facebook URL",
      social_instagram: "Instagram URL",
      opening_hours: "Opening hours (leave empty until supplied)",
      booking_availability: "Booking availability guidance",
      gallery_expiry_days: "Default gallery expiry · days",
      document_retention_days: "Verification document retention · days",
    };
    return (
      <>
        <div className="admin-heading">
          <div>
            <span className="admin-eyebrow">ONE SOURCE OF TRUTH</span>
            <h1>Studio Settings</h1>
            <p>
              Contact details and content update throughout the public website.
            </p>
          </div>
        </div>
        <Button href="/admin/services" variant="secondary">
          Service descriptions & prices ?
        </Button>
        <div className="editor-panel settings-editor">
          <ActionForm action={saveSettings} submit="Save studio settings">
            <HeroImageFields studio={s} />
            <div className="form-grid">
              {Object.entries(labels).map(([key, label]) => (
                <Field
                  key={key}
                  name={key}
                  label={label}
                  value={String(s[key as keyof typeof s] ?? "")}
                  type={
                    key.endsWith("_days")
                      ? "number"
                      : key === "email"
                        ? "email"
                        : [
                              "introduction",
                              "opening_hours",
                              "hero_headline",
                              "booking_availability",
                            ].includes(key)
                          ? "textarea"
                          : "text"
                  }
                  min={1}
                  max={3650}
                />
              ))}
            </div>
            <p className="small muted">
              LAL STUDIO · Established 1982 · English · LKR · Asia/Colombo.
              Retention is measured from document upload; schedule the retention
              endpoint after choosing a policy.
            </p>
          </ActionForm>
        </div>
      </>
    );
  }
  const def = sections[section];
  if (!def) notFound();
  let rows = await adminRows(def.table);
  const allRows = rows;
  const choices: Record<string, { value: string; label: string }[]> = {};
  let financialSources: Row[] = [];
  if (section === "units")
    choices.equipment_id = (await adminRows("equipment")).map((x) => ({
      value: x.id,
      label: String(x.name),
    }));
  if (section === "finances") {
    const [bookings, rentals] = await Promise.all([
      adminRows("bookings"),
      adminRows("rentals"),
    ]);
    choices.booking_id = bookings.map((x) => ({
      value: x.id,
      label: `${x.reference} · ${x.name}`,
    }));
    choices.rental_id = rentals.map((x) => ({
      value: x.id,
      label: `${x.reference} · ${x.name}`,
    }));
    financialSources = [...bookings, ...rentals];
  }
  if (section === "finances")
    rows = rows.filter(
      (r) =>
        (!q.from || String(r.date) >= q.from) &&
        (!q.to || String(r.date) <= q.to),
    );
  const row = q.edit ? rows.find((r) => r.id === q.edit) : undefined;
  if (q.edit && !row) notFound();
  const editing = Boolean(q.new || row);
  const defaults: Row = row ?? {
    id: "",
    ...(q.date
      ? { starts_at: q.date + "T03:30:00Z", ends_at: q.date + "T04:30:00Z" }
      : {}),
    ...(q.booking
      ? { booking_id: q.booking, kind: "Income", category: "Booking payment" }
      : {}),
    ...(q.rental
      ? { rental_id: q.rental, kind: "Income", category: "Rental payment" }
      : {}),
  };
  let ledger: Row[] = [];
  if (row && ["bookings", "rentals"].includes(section))
    ledger = (await adminRows("financial_transactions")).filter(
      (x) =>
        x[section === "bookings" ? "booking_id" : "rental_id"] === row.id &&
        !x.voided,
    );
  let docs: Row[] = [],
    items: Row[] = [],
    reservations: Row[] = [],
    movements: Row[] = [],
    history: Row[] = [];
  if (live && row) {
    const db = database();
    if (section === "rentals") {
      const result = await Promise.all([
        db
          .from("verification_documents")
          .select("id,kind,deleted_at,created_at")
          .eq("rental_id", row.id),
        db.from("rental_items").select("*").eq("rental_id", row.id),
        db
          .from("reservations")
          .select("*")
          .eq("rental_id", row.id)
          .eq("released", false),
      ]);
      docs = result[0].data ?? [];
      items = result[1].data ?? [];
      reservations = result[2].data ?? [];
    }
    if (section === "inventory")
      movements = (await adminRows("stock_movements")).filter(
        (x) => x.inventory_id === row.id,
      );
    const { data } = await db
      .from("audit_events")
      .select("id,operation,created_at,actor_id")
      .eq("record_id", row.id)
      .order("created_at", { ascending: false })
      .limit(20);
    history = data ?? [];
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">
            STUDIO MANAGEMENT / {def.title.toUpperCase()}
          </span>
          <h1>
            {editing
              ? row
                ? "Record details"
                : `New ${section === "galleries" ? "event gallery" : section === "finances" ? "financial entry" : section === "calendar" ? "studio appointment" : "record"}`
              : def.title}
          </h1>
          <p>{def.description}</p>
        </div>
        <div className="heading-actions">
          {editing ? (
            <Button href={`/admin/${section}`} variant="secondary">
              <ArrowLeft size={15} /> Back to records
            </Button>
          ) : (
            <>
              {section === "equipment" && (
                <Button href="/admin/units" variant="secondary">
                  Physical units
                </Button>
              )}
              {section === "inventory" && (
                <Button
                  variant="secondary"
                  href="/admin/export?section=movements"
                >
                  Movement CSV
                </Button>
              )}
              {["inventory", "finances"].includes(section) && (
                <Button
                  variant="secondary"
                  href={`/admin/export?section=${section}&from=${q.from || ""}&to=${q.to || ""}`}
                >
                  <Download size={16} /> CSV
                </Button>
              )}
              {!["bookings", "rentals", "services"].includes(section) && (
                <Button href={`/admin/${section}?new=1`}>
                  <Plus size={16} /> Add{" "}
                  {section === "calendar" ? "studio time" : "new"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      {!editing && section === "finances" && (
        <>
          <form className="period-filter">
            <Field label="From" name="from" type="date" value={q.from} />
            <Field label="To" name="to" type="date" value={q.to} />
            <Button>Apply period</Button>
          </form>
          <div className="stats-grid finance-stats">
            {(() => {
              const valid = rows.filter((x) => !x.voided);
              const sum = (k: string) =>
                valid
                  .filter((x) => x.kind === k)
                  .reduce((s, x) => s + Number(x.amount), 0);
              const held = allRows
                .filter((x) => !x.voided)
                .reduce(
                  (s, x) =>
                    s +
                    (x.kind === "Deposit"
                      ? Number(x.amount)
                      : x.kind === "Refund"
                        ? -Number(x.amount)
                        : 0),
                  0,
                );
              return [
                ["Income", sum("Income")],
                ["Expenses", sum("Expense")],
                ["Net recorded income", sum("Income") - sum("Expense")],
                [
                  "Outstanding quoted fees · all time",
                  financialSources
                    .filter(
                      (x) =>
                        !["Cancelled", "Declined", "Rejected"].includes(
                          String(x.status),
                        ),
                    )
                    .reduce(
                      (sum, source) =>
                        sum +
                        Math.max(
                          0,
                          Number(source.quote) -
                            allRows
                              .filter(
                                (t) =>
                                  !t.voided &&
                                  t.kind === "Income" &&
                                  (t.booking_id === source.id ||
                                    t.rental_id === source.id),
                              )
                              .reduce((s, t) => s + Number(t.amount), 0),
                        ),
                      0,
                    ),
                ],
                ["Refundable deposits held · all time", held],
              ].map(([l, n]) => (
                <div className="stat-card" key={String(l)}>
                  <span>{String(l)}</span>
                  <strong>{money(Number(n))}</strong>
                </div>
              ));
            })()}
          </div>
          <details className="editor-panel">
            <summary>Category summary</summary>
            {[...new Set(rows.map((r) => String(r.category)))].map((c) => (
              <p key={c}>
                {c} ·{" "}
                {money(
                  rows
                    .filter(
                      (r) =>
                        r.category === c &&
                        !r.voided &&
                        ["Income", "Expense"].includes(String(r.kind)),
                    )
                    .reduce(
                      (s, r) =>
                        s + (r.kind === "Expense" ? -1 : 1) * Number(r.amount),
                      0,
                    ),
                )}
              </p>
            ))}
          </details>
        </>
      )}
      {!editing && section === "calendar" && (
        <Calendar
          bookings={await adminRows("bookings")}
          rentals={await adminRows("rentals")}
          manual={rows}
        />
      )}
      {!editing && section !== "calendar" && (
        <RecordsTable
          rows={rows.map((r) => {
            const safe: Row = { id: r.id };
            for (const key of new Set([
              ...def.columns,
              "title",
              "name",
              "reference",
              "description",
              "email",
              "phone",
              "sku",
              "ends_at",
              "quantity",
              "reorder_threshold",
            ]))
              safe[key] = r[key];
            return safe;
          })}
          section={section}
          columns={def.columns}
          statuses={def.statuses}
        />
      )}
      {editing && section === "calendar" && (
        <p>
          <Button variant="secondary" href={`/bookings?date=${q.date || ""}`}>
            Create a photography booking on this date ↗
          </Button>
        </p>
      )}
      {editing && (
        <div className="record-layout">
          <section className="editor-panel">
            {row && (
              <div className="record-summary">
                <span className="eyebrow">
                  {String(row.reference || row.id)}
                </span>
                {row.status && <Badge>{String(row.status)}</Badge>}
                {["bookings", "rentals"].includes(section) && (
                  <>
                    <h2>{String(row.name)}</h2>
                    <p>
                      <a href={`tel:${row.phone}`}>{String(row.phone)}</a> ·{" "}
                      <a href={`mailto:${row.email}`}>{String(row.email)}</a>
                    </p>
                    <p>{String(row.service || row.address || "")}</p>
                    <p>
                      {String(
                        row.requirements ||
                          row.notes ||
                          "No additional requirements.",
                      )}
                    </p>
                    <details className="optional-finances">
                      <summary>Optional financial records</summary>
                      <div className="financial-lines">
                        <p>
                          <span>Quoted fees</span>
                          <strong>{money(Number(row.quote))}</strong>
                        </p>
                        <p>
                          <span>Recorded payments</span>
                          <strong>
                            {money(
                              ledger
                                .filter((x) => x.kind === "Income")
                                .reduce((s, x) => s + Number(x.amount), 0),
                            )}
                          </strong>
                        </p>
                        <p>
                          <span>Quote less recorded payments</span>
                          <strong>
                            {money(
                              Math.max(
                                0,
                                Number(row.quote) -
                                  ledger
                                    .filter((x) => x.kind === "Income")
                                    .reduce((s, x) => s + Number(x.amount), 0),
                              ),
                            )}
                          </strong>
                        </p>
                        {section === "rentals" && (
                          <p>
                            <span>Refundable deposit held</span>
                            <strong>
                              {money(
                                ledger.reduce(
                                  (s, x) =>
                                    s +
                                    (x.kind === "Deposit"
                                      ? Number(x.amount)
                                      : x.kind === "Refund"
                                        ? -Number(x.amount)
                                        : 0),
                                  0,
                                ),
                              )}
                            </strong>
                          </p>
                        )}
                      </div>
                      <Button
                        href={`/admin/finances?new=1&${section === "bookings" ? "booking" : "rental"}=${row.id}`}
                        variant="secondary"
                      >
                        Add a financial record (optional)
                      </Button>
                      <p className="small muted">
                        Financial entries are optional. You can confirm
                        bookings, hand over equipment and record returns without
                        entering a payment. A missing entry does not mean the
                        client has not paid.
                      </p>
                    </details>
                  </>
                )}
                {section === "galleries" && row.token && (
                  <div className="share-link">
                    <span>Client share link</span>
                    <input
                      aria-label="Client share link"
                      readOnly
                      value={`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/event-gallery/${row.token}`}
                    />
                    <Link
                      className="text-link"
                      href={`/admin/gallery-preview/${row.id}`}
                    >
                      Preview delivery page <ArrowUpRight size={15} />
                    </Link>
                    <small>
                      Copy the link above. Regenerating the token invalidates
                      earlier links and sessions.
                    </small>
                  </div>
                )}
              </div>
            )}
            {section === "finances" && row ? (
              <>
                <dl className="detail-list">
                  {Object.entries(row)
                    .filter(
                      ([k]) => !["idempotency_key", "actor_id"].includes(k),
                    )
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{k.replaceAll("_", " ")}</dt>
                        <dd>{String(v ?? "—")}</dd>
                      </div>
                    ))}
                </dl>
                {!row.voided && (
                  <ActionForm
                    action={voidPayment.bind(null, row.id)}
                    variant="destructive"
                    submit="Void entry"
                    confirm="Void this financial entry? The original and audit history will remain."
                  >
                    <Field name="reason" label="Reason for voiding" required />
                  </ActionForm>
                )}
                <p className="muted small">
                  To correct a financial entry, void the original and record a
                  replacement. Original records are preserved.
                </p>
              </>
            ) : (
              <ActionForm
                action={saveRecord.bind(null, section, row?.id)}
                submit={row ? "Save changes" : "Create record"}
              >
                <input type="hidden" name="retry_key" value={randomUUID()} />
                <div className="form-grid">
                  {def.fields.map((f) =>
                    f.type === "checkbox" ? (
                      <label className="check" key={f.name}>
                        <input
                          name={f.name}
                          type="checkbox"
                          defaultChecked={Boolean(defaults[f.name])}
                        />
                        <span>{f.label}</span>
                      </label>
                    ) : (
                      <Field
                        key={f.name}
                        {...f}
                        options={
                          section === "rentals" && f.name === "status"
                            ? f.options?.filter(
                                (s) =>
                                  s === row?.status ||
                                  ![
                                    "Approved",
                                    "Ready for Pickup",
                                    "Collected",
                                    "Returned",
                                  ].includes(s),
                              )
                            : f.options
                        }
                        value={fieldValue(defaults, f.name, f.type)}
                        choices={choices[f.name]}
                        step={f.type === "number" ? "0.01" : undefined}
                      />
                    ),
                  )}
                </div>
                {["bookings", "rentals"].includes(section) && (
                  <p className="small muted">
                    Scheduling changes run the same database checks as status
                    changes. Rentals reserve physical units only after approval.
                  </p>
                )}
              </ActionForm>
            )}
          </section>
          <aside className="record-aside">
            {section === "rentals" && row && (
              <>
                <RentalWorkflow rental={row} />
                <section className="editor-panel">
                  <h3>Requested equipment</h3>
                  {items.map((x) => (
                    <p key={x.id}>
                      {String(x.equipment_id)} × {String(x.quantity)}
                    </p>
                  ))}
                  <h3>Assigned units</h3>
                  {reservations.map((x) => (
                    <p key={x.id}>Unit {String(x.unit_id)}</p>
                  ))}
                  {!reservations.length && (
                    <p className="muted small">
                      Units are assigned transactionally on approval.
                    </p>
                  )}
                </section>
                <section className="editor-panel">
                  <h3>Identity documents</h3>
                  <p className="small muted">
                    Review manually. Viewing links expire after 60 seconds.
                    Deletion is permanent.
                  </p>
                  {docs.map((d) => (
                    <div className="document-row" key={d.id}>
                      <strong>{String(d.kind).replaceAll("_", " ")}</strong>
                      {d.deleted_at ? (
                        <Badge>Deleted</Badge>
                      ) : (
                        <>
                          <a
                            href={`/admin/documents/${d.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View securely ↗
                          </a>
                          <ActionForm
                            action={deleteDocument.bind(null, d.id)}
                            submit="Delete document"
                            variant="destructive"
                            confirm="Permanently delete this identity document?"
                          >
                            {null}
                          </ActionForm>
                        </>
                      )}
                    </div>
                  ))}
                </section>
              </>
            )}
            {section === "inventory" && row && (
              <section className="editor-panel">
                <h3>Stock movement</h3>
                <p>
                  Current quantity:{" "}
                  <strong>
                    {Number(row.quantity)} {String(row.unit)}
                  </strong>
                </p>
                <ActionForm
                  action={stockMovement.bind(null, row.id)}
                  submit="Record movement"
                >
                  <input type="hidden" name="retry_key" value={randomUUID()} />
                  <Field
                    label="Quantity change (+ restock, − usage)"
                    name="quantity"
                    type="number"
                    step="0.001"
                    required
                  />
                  <Field
                    label="Reason"
                    name="reason"
                    options={[
                      "Restock",
                      "Usage",
                      "Sale",
                      "Damage",
                      "Adjustment",
                    ]}
                    required
                  />
                  <Field label="Notes" name="notes" type="textarea" />
                </ActionForm>
                <h3>Movement history</h3>
                {movements.map((m) => (
                  <p className="small" key={m.id}>
                    {dateTime(String(m.created_at))}
                    <br />
                    {String(m.reason)} · {Number(m.quantity) > 0 ? "+" : ""}
                    {String(m.quantity)} · Staff {String(m.actor_id)}
                  </p>
                ))}
              </section>
            )}
            {row && (
              <section className="editor-panel">
                <h3>Audit history</h3>
                {history.map((h) => (
                  <p className="small muted" key={h.id}>
                    {String(h.operation)} · {dateTime(String(h.created_at))}
                    <br />
                    Staff: {String(h.actor_id || "Public request")}
                  </p>
                ))}
                {!history.length && (
                  <p className="small muted">
                    Significant changes are recorded when connected.
                  </p>
                )}
              </section>
            )}
            {row &&
              ["portfolio", "equipment", "galleries", "calendar"].includes(
                section,
              ) && (
                <section className="editor-panel danger-zone">
                  <h3>Delete record</h3>
                  <ActionForm
                    action={deleteRecord.bind(null, section, row.id)}
                    submit="Delete permanently"
                    variant="destructive"
                    confirm="Permanently delete this record?"
                  >
                    <Check name="confirm">I confirm this deletion.</Check>
                  </ActionForm>
                </section>
              )}
          </aside>
        </div>
      )}
    </>
  );
}
