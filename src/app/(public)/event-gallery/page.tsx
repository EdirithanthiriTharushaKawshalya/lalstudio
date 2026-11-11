import { ActionForm, Field } from "@/components/ui/form";
import { findGallery } from "@/features/galleries/actions";
export const metadata = {
  title: "Your event gallery",
  robots: { index: false, follow: false },
};
export default function GalleryAccess() {
  return (
    <section className="section inner-page gallery-access">
      <span className="eyebrow">YOUR MOMENTS ARE WAITING</span>
      <h1>
        A little link.
        <br />A lot of memories.
      </h1>
      <p>
        Enter the private gallery link or access code sent by LAL STUDIO. Your
        photographs are never listed publicly here.
      </p>
      <ActionForm action={findGallery} submit="Find my gallery ↗">
        <Field label="Gallery link or access code" name="code" required />
      </ActionForm>
      <p className="small muted">
        Can’t find your link? Contact the studio and we’ll help you get back to
        your memories.
      </p>
    </section>
  );
}
