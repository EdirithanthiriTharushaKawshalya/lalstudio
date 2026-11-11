import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  Wallet,
  Boxes,
  Clock,
  Plus,
} from "lucide-react";
import { adminRows } from "@/lib/data";
import { money, dateTime } from "@/lib/studio";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
export default async function Dashboard() {
  const [b, r, i, f] = await Promise.all(
    ["bookings", "rentals", "inventory", "financial_transactions"].map(
      adminRows,
    ),
  );
  const now = new Date();
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
  }).format(now);
  const tx = f.filter((x) => !x.voided && String(x.date).startsWith(month));
  const total = (kind: string) =>
    tx.filter((x) => x.kind === kind).reduce((s, x) => s + Number(x.amount), 0);
  const pendingB = b.filter((x) => x.status === "Pending");
  const pendingR = r.filter((x) => x.status === "Pending Review");
  const low = i.filter(
    (x) => Number(x.quantity) <= Number(x.reorder_threshold),
  );
  const overdue = r.filter(
    (x) => x.status === "Collected" && new Date(String(x.ends_at)) < now,
  );
  const upcoming = b
    .filter(
      (x) => x.status === "Confirmed" && new Date(String(x.starts_at)) >= now,
    )
    .sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)));
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">YOUR STUDIO, AT A GLANCE</span>
          <h1>A good day to make memories.</h1>
          <p>Here’s what’s happening at LAL STUDIO.</p>
        </div>
        <Button href="/admin/calendar">
          <Plus size={16} /> Studio appointment
        </Button>
      </div>
      <div className="stats-grid">
        {[
          [
            "Pending bookings",
            pendingB.length,
            "Awaiting your response",
            "bookings",
            CalendarDays,
          ],
          [
            "Rental requests",
            pendingR.length,
            "Ready for review",
            "rentals",
            Camera,
          ],
          [
            "Recorded income",
            money(total("Income")),
            "Optional entries · this month",
            "finances",
            Wallet,
          ],
          [
            "Low-stock items",
            low.length,
            "At or below reorder level",
            "inventory",
            Boxes,
          ],
        ].map(([label, value, sub, href, Icon]) => {
          const I = Icon as typeof CalendarDays;
          return (
            <Link
              href={`/admin/${href}`}
              className="stat-card"
              key={String(label)}
            >
              <div>
                <span>{String(label)}</span>
                <I size={18} />
              </div>
              <strong>{String(value)}</strong>
              <small>{String(sub)}</small>
            </Link>
          );
        })}
      </div>
      <div className="dashboard-grid">
        <section className="dashboard-panel">
          <div className="panel-heading">
            <h2>Upcoming sessions</h2>
            <Link href="/admin/calendar">
              View calendar <ArrowUpRight size={15} />
            </Link>
          </div>
          {upcoming.slice(0, 6).map((x) => (
            <Link
              className="dashboard-record"
              href={`/admin/bookings?edit=${x.id}`}
              key={x.id}
            >
              <span className="dashboard-icon">
                <CalendarDays size={19} />
              </span>
              <div>
                <strong>{String(x.name)}</strong>
                <small>
                  {x.service} · {dateTime(String(x.starts_at))}
                </small>
              </div>
              <Badge>{String(x.status)}</Badge>
            </Link>
          ))}
          {!upcoming.length && (
            <div className="empty-state">
              <CalendarDays size={30} />
              <h3>Room for the next story.</h3>
              <p>Confirmed upcoming sessions appear here.</p>
              <Link href="/admin/bookings">Manage bookings ↗</Link>
            </div>
          )}
        </section>
        <section className="dashboard-panel">
          <div className="panel-heading">
            <h2>Needs your attention</h2>
            <Clock size={17} />
          </div>
          {[
            [pendingB.length, "Booking requests", "bookings"],
            [pendingR.length, "Rentals to review", "rentals"],
            [overdue.length, "Overdue returns", "rentals"],
            [low.length, "Low-stock items", "inventory"],
          ].map(([n, label, href]) => (
            <Link
              className="attention-row"
              href={`/admin/${href}`}
              key={String(label)}
            >
              <span>{String(label)}</span>
              <strong>{String(n)}</strong>
              <ArrowUpRight size={15} />
            </Link>
          ))}
        </section>
        <section className="dashboard-panel">
          <div className="panel-heading">
            <h2>Rental desk</h2>
            <Link href="/admin/rentals">All rentals ↗</Link>
          </div>
          {r
            .filter((x) =>
              ["Approved", "Ready for Pickup", "Collected"].includes(
                String(x.status),
              ),
            )
            .slice(0, 6)
            .map((x) => (
              <Link
                className="dashboard-record"
                href={`/admin/rentals?edit=${x.id}`}
                key={x.id}
              >
                <Camera size={20} />
                <div>
                  <strong>{String(x.name)}</strong>
                  <small>
                    {x.status === "Collected" ? "Return" : "Pickup"} ·{" "}
                    {dateTime(
                      String(
                        x.status === "Collected" ? x.ends_at : x.starts_at,
                      ),
                    )}
                  </small>
                </div>
                <Badge>{String(x.status)}</Badge>
              </Link>
            ))}
          {!r.some((x) =>
            ["Approved", "Ready for Pickup", "Collected"].includes(
              String(x.status),
            ),
          ) && <p className="empty-state">No active pickups or returns.</p>}
        </section>
        <section className="dashboard-panel">
          <div className="panel-heading">
            <h2>Optional financial notes</h2>
            <span className="muted small">LKR</span>
          </div>
          <div className="financial-lines">
            <p>
              <span>Recorded income</span>
              <strong>{money(total("Income"))}</strong>
            </p>
            <p>
              <span>Recorded expenses</span>
              <strong>{money(total("Expense"))}</strong>
            </p>
            <p>
              <span>Net recorded income</span>
              <strong>{money(total("Income") - total("Expense"))}</strong>
            </p>
          </div>
          <p className="small muted">
            Record money only when you need to. These totals represent entries
            you added this month, not your studio’s complete accounts.
          </p>
          <Link className="text-link small" href="/admin/finances">
            Open financial records <ArrowUpRight size={14} />
          </Link>
        </section>
      </div>
      <div className="admin-note">
        LAL STUDIO · Since 1982{" "}
        <span>
          All scheduling in Asia/Colombo. Financial totals reflect recorded
          entries.
        </span>
      </div>
    </>
  );
}
