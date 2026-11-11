import { accessibleGallery } from "@/features/galleries/server";
import { unlockGallery } from "@/features/galleries/actions";
import { GalleryDelivery } from "@/features/galleries/delivery";
import { ActionForm, Field } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
export const metadata = {
  title: "Private client gallery",
  robots: { index: false, follow: false, noarchive: true },
};
export const dynamic = "force-dynamic";
export default async function Gallery({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const gallery = await accessibleGallery(token);
  if (!gallery)
    return (
      <section className="section inner-page gallery-access">
        <h1>This gallery is unavailable.</h1>
        <p>
          The link may have expired or been revoked. Please contact the studio
          for help.
        </p>
        <Button href="/about">Contact the studio</Button>
      </section>
    );
  if (gallery.locked)
    return (
      <section className="section inner-page gallery-access">
        <span className="eyebrow">A PRIVATE COLLECTION</span>
        <h1>Just for you.</h1>
        <p>Enter the passcode supplied by the studio to open your gallery.</p>
        <ActionForm
          action={unlockGallery.bind(null, token)}
          submit="Open my gallery ↗"
        >
          <Field
            name="passcode"
            label="Gallery passcode"
            type="password"
            required
          />
        </ActionForm>
      </section>
    );
  return <GalleryDelivery gallery={gallery} />;
}
