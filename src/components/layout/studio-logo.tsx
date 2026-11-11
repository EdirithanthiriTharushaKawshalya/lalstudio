import Link from "next/link";

/** One wordmark for the public website and staff workspace. */
export function StudioLogo({
  href = "/",
  className = "",
  onNavigate,
}: {
  href?: string;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onNavigate={onNavigate}
      className={`studio-logo ${className}`}
      aria-label="LAL STUDIO home"
    >
      <span className="studio-logo-name">LAL STUDIO</span>
      <span className="studio-logo-tagline">Photographs become memories.</span>
    </Link>
  );
}
