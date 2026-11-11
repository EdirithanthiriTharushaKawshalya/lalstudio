import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, MapPin, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortfolioCard } from "@/features/portfolio/components";
import { publicRows, settings } from "@/lib/data";
import { photos } from "@/lib/studio";
export default async function Home() {
  const [studio, portfolio] = await Promise.all([
    settings(),
    publicRows("portfolio"),
  ]);
  return (
    <>
      <section className="hero">
        <Image
          src={studio.hero_image || photos.hero}
          alt={studio.hero_image_alt || "A wedding celebration at LAL STUDIO"}
          fill
          preload
          quality={90}
          sizes="100vw"
        />
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-content">
          <span className="eyebrow">
            SINCE 1982 <span className="tiny-line" /> AMBALANGODA, SRI LANKA
          </span>
          <h1>{studio.hero_headline}</h1>
          <p>
            Life moves. A photograph stays.
            <br />
            Let’s make something worth remembering.
          </p>
          <div className="hero-actions">
            <Button href="/portfolio" variant="light">
              Explore Our Work <ArrowUpRight size={16} />
            </Button>
            <Link className="text-link light-link" href="/bookings">
              Book a Session <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        <div className="hero-bottom">
          <span>WEDDINGS · PORTRAITS · LIFE</span>
          <a href="#story">
            SCROLL TO DISCOVER <ArrowDown size={14} />
          </a>
          <span>01 — 05</span>
        </div>
      </section>
      <section className="section story-section" id="story">
        <div className="section-kicker">
          <span className="eyebrow">01 / OUR STORY</span>
          <span className="eyebrow">A LITTLE ABOUT US</span>
        </div>
        <div className="story-grid">
          <div className="story-copy">
            <h2>
              A part of your story.
              <br />
              Since 1982.
            </h2>
            <p>{studio.introduction}</p>
            <p>
              From a portrait in our studio to a wedding day surrounded by loved
              ones, we bring decades of experience and a personal eye to every
              frame.
            </p>
            <Link className="text-link" href="/about">
              Get to know our studio <ArrowUpRight size={17} />
            </Link>
            <div className="story-footnote">
              ROOTED IN AMBALANGODA.
              <br />
              HERE FOR YOUR NEXT CHAPTER.
            </div>
          </div>
          <div className="story-collage">
            <div className="collage-main">
              <Image
                src={photos.portrait}
                alt="Illustrative studio portrait"
                fill
                sizes="45vw"
              />
            </div>
            <div className="collage-small">
              <Image
                src={photos.couple}
                alt="Illustrative couple portrait"
                fill
                sizes="30vw"
              />
            </div>
            <span className="collage-note">Some things are worth keeping.</span>
          </div>
        </div>
      </section>
      <section className="section work-section">
        <div className="section-kicker">
          <span className="eyebrow">02 / SELECTED WORK</span>
          <span className="eyebrow">A FEW MOMENTS, FOREVER</span>
        </div>
        <div className="section-heading">
          <h2>
            Every frame,
            <br />a feeling.
          </h2>
          <div>
            <p>
              Real connections. Beautiful details.
              <br />
              Stories that feel like you.
            </p>
            <Link className="text-link" href="/portfolio">
              View all work <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <div className="work-mosaic">
          {portfolio
            .filter((p) => p.featured)
            .slice(0, 4)
            .map((p, i) => (
              <PortfolioCard key={p.id} item={p} index={i} />
            ))}
        </div>
      </section>
      <section className="section process-section">
        <div>
          <span className="eyebrow">03 / THE EXPERIENCE</span>
          <h2>
            Good photographs.
            <br />A simple process.
          </h2>
          <p>
            We’ll guide you from the first hello
            <br />
            to the photographs you’ll keep.
          </p>
        </div>
        <div className="process-rows">
          {[
            [
              "Get in touch",
              "Tell us what you have in mind. A date, an occasion, a little inspiration.",
            ],
            [
              "Make a plan",
              "We’ll talk through the details and find what works for you.",
            ],
            [
              "Be in the moment",
              "Come as you are. We’ll take care of the photographs.",
            ],
            [
              "Keep it forever",
              "Receive your photographs and relive it all, again and again.",
            ],
          ].map(([title, text], i) => (
            <div className="process-row" key={title}>
              <span>0{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
              <ArrowUpRight size={20} />
            </div>
          ))}
        </div>
      </section>
      <section className="section services-section">
        <div className="section-kicker">
          <span className="eyebrow">04 / WHAT WE DO</span>
          <Link className="text-link" href="/services">
            All services <ArrowUpRight size={16} />
          </Link>
        </div>
        <h2>For life, in all its forms.</h2>
        <div className="service-grid">
          {[
            [
              "Weddings & celebrations",
              photos.wedding,
              "The beginning of your forever.",
              "/bookings",
            ],
            [
              "Portraits & families",
              photos.family,
              "Your people. Your kind of beautiful.",
              "/bookings",
            ],
            [
              "Printing & framing",
              photos.printing,
              "Made to hold, hang and treasure.",
              "/services",
            ],
            [
              "Camera rentals",
              photos.camera,
              "The right tools for your next story.",
              "/rentals",
            ],
          ].map(([title, img, text, href], i) => (
            <Link href={href} key={title} className="service-card">
              <div className="service-image">
                <Image
                  src={img}
                  alt={title}
                  fill
                  sizes="(max-width:640px) 50vw, 25vw"
                />
              </div>
              <div className="service-name">
                <h3>{title}</h3>
                <ArrowUpRight size={18} />
              </div>
              <p>{text}</p>
              <span className="eyebrow">0{i + 1}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="photo-break">
        <Image
          src={photos.couple}
          alt="A quiet moment together"
          fill
          sizes="100vw"
        />
        <div>
          <span className="eyebrow">THE LITTLE MOMENTS. THE BIG DAYS.</span>
          <p>
            Today, a moment.
            <br />
            Tomorrow, a memory.
          </p>
        </div>
      </section>
      <section className="section contact-section">
        <div>
          <span className="eyebrow">05 / LET’S MAKE MEMORIES</span>
          <h2>
            Your next chapter
            <br />
            starts with a hello.
          </h2>
          <p>
            Visit us in the heart of Ambalangoda.
            <br />
            We’d love to hear your story.
          </p>
          <div className="contact-details">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.map_destination)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={18} />
              <span>
                {studio.address} <ArrowUpRight size={14} />
              </span>
            </a>
            <a href={`tel:${studio.international_phone.replace(/\s/g, "")}`}>
              <Phone size={18} />
              {studio.international_phone}
            </a>
            <a href={`mailto:${studio.email}`}>
              <Mail size={18} />
              {studio.email}
            </a>
          </div>
          <Button href="/bookings">
            Book a Session <ArrowUpRight size={16} />
          </Button>
        </div>
        <div className="contact-image">
          <Image
            src={photos.family}
            alt="A family together outdoors — sample photograph"
            fill
            sizes="(max-width:640px) 100vw, 45vw"
          />
          <span>COME AS YOU ARE. WE’LL KEEP THE MOMENT.</span>
        </div>
      </section>
    </>
  );
}
