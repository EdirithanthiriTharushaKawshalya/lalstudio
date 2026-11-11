import type { Metadata } from "next";
import Link from "next/link";
import { publicRows } from "@/lib/data";
import { PortfolioCard } from "@/features/portfolio/components";
export const metadata: Metadata = { title: "Our work" };
export default async function Portfolio({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const q = await searchParams;
  const rows = await publicRows("portfolio");
  const categories = ["All", ...new Set(rows.map((r) => String(r.category)))];
  const filtered = rows.filter(
    (r) => !q.category || q.category === "All" || r.category === q.category,
  );
  const page = Math.max(1, Number(q.page) || 1);
  return (
    <section className="section inner-page">
      <span className="eyebrow">THE LAL STUDIO COLLECTION</span>
      <div className="section-heading">
        <h1>Stories, in photographs.</h1>
        <p>
          Weddings. Portraits. Your kind of moments.
          <br />
          Explore our work, one story at a time.
        </p>
      </div>
      <div className="filter-tabs" aria-label="Portfolio categories">
        {categories.map((c) => (
          <Link
            href={`/portfolio?category=${encodeURIComponent(c)}`}
            className={(q.category || "All") === c ? "active" : ""}
            key={c}
          >
            {c}
          </Link>
        ))}
      </div>
      <div className="portfolio-grid">
        {filtered.slice((page - 1) * 8, page * 8).map((p, i) => (
          <PortfolioCard key={p.id} item={p} index={i} />
        ))}
      </div>
      {!filtered.length && (
        <p className="empty-state">
          New stories are on their way. Please check back soon.
        </p>
      )}
      <div className="pagination">
        {page > 1 && (
          <Link href={`?category=${q.category || "All"}&page=${page - 1}`}>
            ← Previous
          </Link>
        )}
        {filtered.length > page * 8 && (
          <Link href={`?category=${q.category || "All"}&page=${page + 1}`}>
            More stories →
          </Link>
        )}
      </div>
      <p className="muted small">
        Published studio work opens its full Facebook album in a new tab. Sample
        photographs are illustrative and do not represent LAL STUDIO client
        work.
      </p>
    </section>
  );
}
