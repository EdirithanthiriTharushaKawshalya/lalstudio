"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { dateTime, money, type Row } from "@/lib/studio";
export function RecordsTable({
  rows,
  columns,
  section,
  statuses,
}: {
  rows: Row[];
  columns: string[];
  section: string;
  statuses?: readonly string[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const filtered = rows.filter(
    (r) =>
      (!status || r.status === status) &&
      JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="records-panel">
      <div className="table-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search records"
            placeholder="Search records…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        {statuses && (
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
        <span className="muted small">{filtered.length} records</span>
      </div>
      <div
        className="table-scroll"
        role="region"
        aria-label="Records table. Scroll horizontally for more columns."
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c.replaceAll("_", " ")}</th>
              ))}
              <th>
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice((page - 1) * 25, page * 25).map((r) => (
              <tr key={r.id}>
                {columns.map((c) => (
                  <td key={c}>
                    {typeof r[c] === "boolean" ? (
                      <Badge>{r[c] ? "Yes" : "No"}</Badge>
                    ) : c === "status" || c === "kind" ? (
                      <Badge>{String(r[c] ?? "—")}</Badge>
                    ) : c.endsWith("_at") && r[c] ? (
                      dateTime(String(r[c]))
                    ) : c === "quantity" &&
                      Number(r.quantity) <= Number(r.reorder_threshold) ? (
                      <Badge>{String(r.quantity)} · Low stock</Badge>
                    ) : ["amount", "daily_rate", "deposit", "price"].includes(
                        c,
                      ) && r[c] != null ? (
                      money(Number(r[c]))
                    ) : (
                      String(r[c] ?? "—")
                    )}
                  </td>
                ))}
                <td>
                  <Link
                    className="table-action"
                    href={`/admin/${section}?edit=${r.id}`}
                    aria-label={`Open ${r.title || r.name || r.reference || "record"}`}
                  >
                    <ArrowUpRight size={17} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <h3>{search || status ? "No matching records" : "A clean slate."}</h3>
          <p>
            {search || status
              ? "Try another search or filter."
              : "New records will appear here as your studio gets to work."}
          </p>
        </div>
      )}
      <div className="table-pagination">
        <span>
          Page {page} of {Math.max(1, Math.ceil(filtered.length / 25))}
        </span>
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          ← Previous
        </button>
        <button
          disabled={page * 25 >= filtered.length}
          onClick={() => setPage(page + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
