import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { settings } from "@/lib/data";
export const metadata: Metadata = { title: "Our story & contact" };
export default async function About() {
  const s = await settings();
  return (
    <section className="section inner-page">
      <span className="eyebrow">OUR STORY · SINCE 1982</span>
      <h1>
        Part of Ambalangoda.
        <br />
        Part of your memories.
      </h1>
      <div className="about-grid">
        <div className="prose">
          <h2>
            A familiar place.
            <br />A lifetime of stories.
          </h2>
          <p>{s.introduction}</p>
          <p>
            We offer studio portraits, wedding and event photography, photo
            printing, and camera rentals. Our work begins with getting to know
            you, and with the experience of a studio that has called Ambalangoda
            home for decades.
          </p>
          <p>
            Whether you’re marking a milestone or simply bringing everyone
            together, we’d love to help you keep the moment.
          </p>
          <Button href="/bookings">Let’s plan your photographs ↗</Button>
          <hr />
          <h3>Visit the studio</h3>
          <p>{s.address}</p>
          <p>
            <a href={`tel:${s.international_phone.replace(/\s/g, "")}`}>
              {s.international_phone}
            </a>
            <br />
            <a href={`mailto:${s.email}`}>{s.email}</a>
          </p>
          {s.opening_hours && <p>{s.opening_hours}</p>}
          <a
            className="text-link"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.map_destination)}`}
            target="_blank"
            rel="noreferrer"
          >
            Find us on the map ↗
          </a>
        </div>
      </div>
    </section>
  );
}
