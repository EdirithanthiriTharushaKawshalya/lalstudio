import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { StudioSettings } from "@/lib/studio";
import { StudioLogo } from "./studio-logo";
export function PublicFooter({ studio }: { studio: StudioSettings }) {
  return (
    <footer className="public-footer">
      <div className="footer-top">
        <div>
          <StudioLogo className="footer-wordmark" />
          <p>Since 1982 · Ambalangoda, Sri Lanka</p>
        </div>
        <div>
          <span className="eyebrow">Come say hello</span>
          <a href={`tel:${studio.international_phone.replace(/\s/g, "")}`}>
            {studio.international_phone}
          </a>
          <a href={`mailto:${studio.email}`}>{studio.email}</a>
          <p>{studio.address}</p>
        </div>
        <div>
          <span className="eyebrow">Find your way</span>
          <Link href="/portfolio">
            Our work <ArrowUpRight size={14} />
          </Link>
          <Link href="/bookings">
            Book a session <ArrowUpRight size={14} />
          </Link>
          <Link href="/event-gallery">
            Event Gallery <ArrowUpRight size={14} />
          </Link>
          <Link href="/admin/login">
            Admin sign in <ArrowUpRight size={14} />
          </Link>
          {studio.social_facebook && (
            <a href={studio.social_facebook} target="_blank" rel="noreferrer">
              Facebook ↗
            </a>
          )}
          {studio.social_instagram && (
            <a href={studio.social_instagram} target="_blank" rel="noreferrer">
              Instagram ↗
            </a>
          )}
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} LAL STUDIO. All rights reserved.
        </span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <span>Made for the memories.</span>
        </div>
      </div>
    </footer>
  );
}
