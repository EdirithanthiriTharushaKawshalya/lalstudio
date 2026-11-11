import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import { publicRows, settings } from "@/lib/data";
import { money, photos } from "@/lib/studio";
import { RentalRequestForm } from "@/features/rentals/form";
export const metadata: Metadata = { title: "Camera & equipment rentals" };
export default async function Rentals({
  searchParams,
}: {
  searchParams: Promise<{ item?: string }>;
}) {
  const [equipment, studio, q] = await Promise.all([
    publicRows("equipment"),
    settings(),
    searchParams,
  ]);
  const selected = equipment.find((e) => e.id === q.item);
  return (
    <section className="section inner-page">
      <span className="eyebrow">TOOLS FOR YOUR NEXT STORY</span>
      <h1>
        You bring the vision.
        <br />
        We’ll help with the kit.
      </h1>
      <p className="lead">
        Choose an item to request a rental. After submitting your details, call
        the studio to confirm availability for your dates.
      </p>
      <div className="rental-steps" aria-label="How rental requests work">
        <span>
          <b>01</b> Choose your equipment
        </span>
        <span>
          <b>02</b> Send your request
        </span>
        <span>
          <b>03</b> Call us to confirm
        </span>
      </div>
      <div className="equipment-grid">
        {equipment.map((e) => (
          <Link
            className={`equipment-card rental-card ${selected?.id === e.id ? "selected" : ""}`}
            key={e.id}
            href={`/rentals?item=${encodeURIComponent(e.id)}#request`}
            aria-label={`Request a rental: ${e.name}`}
            aria-current={selected?.id === e.id ? "true" : undefined}
          >
            <div className="equipment-image">
              <Image
                src={String(e.thumbnail || photos.camera)}
                alt={String(e.name)}
                fill
                sizes="(max-width:640px) 100vw, 33vw"
              />
            </div>
            <span className="eyebrow">{String(e.category)}</span>
            <h3>{String(e.name)}</h3>
            <p>{String(e.description)}</p>
            <p className="small muted">
              Includes:{" "}
              {String(e.accessories || "Contact the studio for kit details")}
            </p>
            <p>
              {e.daily_rate != null
                ? `${money(Number(e.daily_rate))} / day`
                : "Contact us for pricing"}
              {e.deposit != null
                ? ` · Refundable deposit ${money(Number(e.deposit))}`
                : ""}
            </p>
            <span className="text-link">
              Request this item <ArrowUpRight size={16} />
            </span>
          </Link>
        ))}
      </div>
      {!equipment.length && (
        <p className="empty-state">
          Our online catalog is being prepared. Call the studio to discuss
          equipment.
        </p>
      )}
      {q.item && !selected && (
        <p className="message">
          That item is no longer listed. Please choose another item or call the
          studio.
        </p>
      )}
      {selected && (
        <div className="request-layout rental-request" id="request">
          <aside>
            <span className="eyebrow">YOUR RENTAL REQUEST</span>
            <h2>{String(selected.name)}</h2>
            <p>
              Send your preferred pickup and return times and your details. Your
              request is not a confirmed reservation.
            </p>
            <h3>Then, give us a call.</h3>
            <p>
              Call with your request reference so we can check availability and
              arrange collection. Please wait for our confirmation before coming
              to collect.
            </p>
            <a
              className="text-link"
              href={`tel:${studio.international_phone.replace(/\s/g, "")}`}
            >
              <Phone size={16} />
              {studio.international_phone}
            </a>
            <p className="small muted">
              Our team records the handover when you collect the equipment, and
              records the return when you bring it back.
            </p>
          </aside>
          <RentalRequestForm
            equipment={selected}
            phone={studio.international_phone}
          />
        </div>
      )}
    </section>
  );
}
