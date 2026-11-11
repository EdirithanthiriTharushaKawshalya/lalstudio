import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { settings } from "@/lib/data";
import { live } from "@/lib/supabase";
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const studio = await settings();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <PublicHeader />
      <main id="main">{children}</main>
      {!live && (
        <div className="preview-label">
          SAMPLE PREVIEW · Illustrative photographs · Requests are not saved
        </div>
      )}
      <PublicFooter studio={studio} />
    </>
  );
}
