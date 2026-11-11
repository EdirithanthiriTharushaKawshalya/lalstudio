import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { photos, money } from "@/lib/studio";
import { publicRows } from "@/lib/data";
export const metadata: Metadata = { title: "Our services" };
const descriptions = [
  "From the first look to the last dance. Considered photography for your wedding day.",
  "Celebrations, milestones and gatherings, photographed with care.",
  "A little time in our studio. A portrait that feels like you.",
  "The people you love, just as they are. Individual and family sessions.",
  "Bring your photographs to life with prints you can hold.",
  "Choose a frame or enlargement to make your photographs part of your home.",
  "Cameras, lenses and accessories for your next creative project.",
];
export default async function Services() {
  const rows = await publicRows("services");
  return (
    <section className="section inner-page">
      <span className="eyebrow">WHAT WE DO</span>
      <h1>
        Life gives you moments.
        <br />
        We help you keep them.
      </h1>
      <div className="wide-editorial-image">
        <Image
          src={photos.event}
          alt="An event setting — illustrative photograph"
          fill
          sizes="90vw"
        />
      </div>
      <div className="service-list">
        {rows.map((service, i) => (
          <div className="service-list-row" key={service.id}>
            <span className="eyebrow">0{i + 1}</span>
            <h2>{String(service.name)}</h2>
            <div>
              <p>
                {String(
                  service.description ||
                    descriptions[i] ||
                    "Contact the studio to plan the details.",
                )}
              </p>
              <p className="small muted">
                {service.price != null
                  ? money(Number(service.price))
                  : "Contact us for pricing"}
              </p>
            </div>
            <Link
              aria-label={`Enquire about ${service.name}`}
              className="circle-link"
              href={i === 6 ? "/rentals" : i >= 4 ? "/about" : "/bookings"}
            >
              <ArrowUpRight />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
