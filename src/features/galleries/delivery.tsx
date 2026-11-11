import Image from "next/image";
import { ArrowUpRight, Download } from "lucide-react";
type Gallery = {
  title: string;
  description: string;
  client_name: string;
  event_date: string | null;
  studio_message: string;
  facebook_url: string | null;
  drive_url: string | null;
  cover?: string;
};
export function GalleryDelivery({ gallery: g }: { gallery: Gallery }) {
  return (
    <section className="gallery-delivery">
      {g.cover && (
        <div className="gallery-cover">
          <Image src={g.cover} alt={g.title} fill sizes="100vw" unoptimized />
        </div>
      )}
      <div className="section gallery-content">
        <span className="eyebrow">LAL STUDIO · A STORY WORTH KEEPING</span>
        <h1>{g.title}</h1>
        <p className="lead">
          For {g.client_name}
          {g.event_date
            ? ` · ${new Date(g.event_date + "T12:00:00Z").toLocaleDateString("en-GB", { dateStyle: "long" })}`
            : ""}
        </p>
        <p>{g.description}</p>
        {g.studio_message && (
          <p className="studio-message">{g.studio_message}</p>
        )}
        <div className="gallery-actions">
          {g.facebook_url && (
            <a
              className="button button-primary"
              href={g.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Facebook Album <ArrowUpRight size={17} />
            </a>
          )}
          {g.drive_url && (
            <a
              className="button button-secondary"
              href={g.drive_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Access High-Quality Photos <Download size={17} />
            </a>
          )}
        </div>
        <p className="small muted">
          Facebook and Google Drive permissions control access to photos hosted
          on those platforms. Please contact the studio if you need help opening
          your photographs.
        </p>
      </div>
    </section>
  );
}
