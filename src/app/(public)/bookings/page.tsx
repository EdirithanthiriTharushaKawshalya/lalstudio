import type { Metadata } from "next";
import { BookingForm } from "@/features/bookings/form";
import { settings, publicRows } from "@/lib/data";
export const metadata: Metadata = { title: "Book a session" };
export const dynamic = "force-dynamic";
export default async function Bookings({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const [s, serviceRows] = await Promise.all([
    settings(),
    publicRows("services"),
  ]);
  return (
    <section className="section inner-page">
      <span className="eyebrow">LET’S MAKE SOMETHING MEANINGFUL</span>
      <h1>
        A date. A story.
        <br />
        Let’s start here.
      </h1>
      <div className="request-layout">
        <aside>
          <h3>Your moment, our care.</h3>
          <p>
            Tell us a little about what you’re planning. We’ll review your
            request and contact you to talk through availability and the
            details.
          </p>
          <hr />
          <span className="eyebrow">PREFER A CONVERSATION?</span>
          <p>
            <a href={`tel:${s.international_phone.replace(/\s/g, "")}`}>
              {s.international_phone}
            </a>
            <br />
            <a href={`mailto:${s.email}`}>{s.email}</a>
          </p>
          {s.booking_availability && <p>{s.booking_availability}</p>}
          <p className="small muted">All session times are in Asia/Colombo.</p>
        </aside>
        <BookingForm
          services={serviceRows.map((x) => String(x.name))}
          preferredDate={
            date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined
          }
        />
      </div>
    </section>
  );
}
