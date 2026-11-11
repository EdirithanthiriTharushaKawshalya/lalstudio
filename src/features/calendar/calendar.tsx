"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Row } from "@/lib/studio";
import { dateTime } from "@/lib/studio";
type Event = {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: string;
  href: string;
  pending: boolean;
};
export function Calendar({
  bookings,
  rentals,
  manual,
}: {
  bookings: Row[];
  rentals: Row[];
  manual: Row[];
}) {
  const [today] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }),
  );
  const [date, setDate] = useState(today);
  const [view, setView] = useState("Month");
  const [filter, setFilter] = useState("All");
  const events: Event[] = [
    ...bookings
      .filter((x) => ["Pending", "Confirmed"].includes(String(x.status)))
      .map((x) => ({
        id: x.id,
        title: `${x.name} · ${x.service}`,
        start: String(x.starts_at),
        end: String(x.ends_at),
        kind: "Bookings",
        href: `/admin/bookings?edit=${x.id}`,
        pending: x.status === "Pending",
      })),
    ...rentals
      .filter((x) =>
        ["Approved", "Ready for Pickup", "Collected"].includes(
          String(x.status),
        ),
      )
      .flatMap((x) => [
        {
          id: x.id,
          title: `Rental · ${x.name}`,
          start: String(x.starts_at),
          end: String(x.ends_at),
          kind: "Rentals",
          href: `/admin/rentals?edit=${x.id}`,
          pending: false,
        },
        {
          id: x.id + "-pickup",
          title: `Pickup · ${x.name}`,
          start: String(x.starts_at),
          end: String(x.starts_at),
          kind: "Rentals",
          href: `/admin/rentals?edit=${x.id}`,
          pending: false,
        },
        {
          id: x.id + "-return",
          title: `Return · ${x.name}`,
          start: String(x.ends_at),
          end: String(x.ends_at),
          kind: "Rentals",
          href: `/admin/rentals?edit=${x.id}`,
          pending: false,
        },
      ]),
    ...manual.map((x) => ({
      id: x.id,
      title: String(x.title),
      start: String(x.starts_at),
      end: String(x.ends_at),
      kind: "Manual",
      href: `/admin/calendar?edit=${x.id}`,
      pending: false,
    })),
  ].filter((e) => filter === "All" || e.kind === filter);
  const key = (s: string) =>
    new Date(s).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
  const base = new Date(date + "T12:00:00Z");
  const start = new Date(base);
  if (view === "Month") {
    start.setUTCDate(1);
    start.setUTCDate(1 - ((start.getUTCDay() + 6) % 7));
  } else if (view === "Week")
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const count = view === "Month" ? 42 : view === "Week" ? 7 : 1;
  const cells = Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const shift = (n: number) => {
    const d = new Date(base);
    if (view === "Month") d.setUTCMonth(d.getUTCMonth() + n);
    else d.setUTCDate(d.getUTCDate() + n * (view === "Week" ? 7 : 1));
    setDate(d.toISOString().slice(0, 10));
  };
  return (
    <section className="calendar-panel">
      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button aria-label="Previous period" onClick={() => shift(-1)}>
            <ChevronLeft size={18} />
          </button>
          <strong>
            {base.toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
              ...(view !== "Month" ? { day: "numeric" } : {}),
            })}
          </strong>
          <button aria-label="Next period" onClick={() => shift(1)}>
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setDate(today)}>Today</button>
        </div>
        <div className="filter-tabs">
          {["Month", "Week", "Day", "Agenda"].map((v) => (
            <button
              className={view === v ? "active" : ""}
              key={v}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <select
          aria-label="Calendar source"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {["All", "Bookings", "Rentals", "Manual"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <p className="small muted calendar-legend">
        ● Bookings <span>● Pending requests (dashed)</span>{" "}
        <span className="rental-color">● Rentals</span>{" "}
        <span className="manual-color">● Studio time</span> · Asia/Colombo
      </p>
      {view === "Agenda" ? (
        <div className="agenda">
          {events
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((e) => (
              <Link
                key={e.id}
                href={e.href}
                className={`agenda-event ${e.kind.toLowerCase()}`}
              >
                <span>{dateTime(e.start)}</span>
                <strong>{e.title}</strong>
                <span>{e.kind}</span>
              </Link>
            ))}
          {!events.length && (
            <p className="empty-state">No events to display.</p>
          )}
        </div>
      ) : (
        <div
          className="calendar-scroll"
          role="region"
          aria-label={`${view} calendar. Scroll horizontally to see all dates.`}
          tabIndex={0}
        >
          <div className={`calendar-grid calendar-${view.toLowerCase()}`}>
            {view === "Month" &&
              ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="calendar-weekday">
                  {d}
                </div>
              ))}
            {cells.map((d) => (
              <div
                key={d}
                className={`calendar-cell ${d === today ? "today" : ""}`}
              >
                <Link
                  className="day-number"
                  href={`/admin/calendar?new=1&date=${d}`}
                  aria-label={`Create appointment on ${d}`}
                >
                  {new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", {
                    weekday: view !== "Month" ? "short" : undefined,
                    day: "numeric",
                  })}{" "}
                  <span>+</span>
                </Link>
                {events
                  .filter((e) => key(e.start) <= d && key(e.end) >= d)
                  .map((e) => (
                    <Link
                      href={e.href}
                      key={e.id}
                      className={`calendar-event ${e.kind.toLowerCase()} ${e.pending ? "pending" : ""}`}
                    >
                      {e.title}
                    </Link>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="small muted">
        Select an entry to edit its source. Select a date to add studio time.{" "}
        <Link href="/bookings">Create a photography request ↗</Link>
      </p>
    </section>
  );
}
