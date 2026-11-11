import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Row } from "@/lib/studio";
export function PortfolioCard({
  item,
  index = 0,
}: {
  item: Row;
  index?: number;
}) {
  const content = (
    <>
      <div className="portfolio-image">
        <Image
          src={String(item.thumbnail)}
          alt={String(item.title)}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
        />
        <span className="image-arrow">
          <ArrowUpRight size={22} />
        </span>
        {!item.facebook_url && (
          <span className="sample-tag">Sample photograph</span>
        )}
      </div>
      <div className="portfolio-caption">
        <div>
          <span className="eyebrow">
            {String(item.category)}
            {item.event_date ? ` · ${item.event_date}` : ""}
          </span>
          <h3>{String(item.title)}</h3>
        </div>
        <span className="photo-index">0{index + 1}</span>
      </div>
      <p className="card-description">{String(item.description)}</p>
    </>
  );
  return item.facebook_url ? (
    <a
      className="portfolio-card"
      href={String(item.facebook_url)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${item.title} — open Facebook album in a new tab`}
    >
      {content}
    </a>
  ) : (
    <article className="portfolio-card">{content}</article>
  );
}
