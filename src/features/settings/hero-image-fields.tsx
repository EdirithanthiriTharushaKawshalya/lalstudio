import Image from "next/image";
import { Field } from "@/components/ui/form";
import { photos, type StudioSettings } from "@/lib/studio";

export function HeroImageFields({ studio }: { studio: StudioSettings }) {
  return (
    <fieldset className="hero-image-settings">
      <legend>Homepage hero photograph</legend>
      <div className="hero-image-preview">
        <Image
          src={studio.hero_image || photos.hero}
          alt={studio.hero_image_alt || "Current homepage hero photograph"}
          fill
          sizes="(max-width:800px) 90vw, 700px"
          quality={90}
        />
      </div>
      <p className="small muted">
        {studio.hero_image ? "Your uploaded photograph" : "Default photograph"}.
        The homepage keeps its monochrome style and dark overlay when you change
        the image.
      </p>
      <Field
        name="hero_image_file"
        label="Upload a landscape photograph"
        type="file"
        help="JPEG, PNG or WebP · up to 5 MB · at least 1600 × 900 pixels. A 2400-pixel-wide landscape photograph is recommended. Leave empty to keep the current image."
      />
      <Field
        name="hero_image_alt"
        label="Describe the photograph"
        value={studio.hero_image_alt}
        help="A short description for people using screen readers."
      />
      {studio.hero_image && (
        <label className="check">
          <input type="checkbox" name="reset_hero_image" />
          <span>
            Restore the default hero photograph instead of uploading a
            replacement.
          </span>
        </label>
      )}
    </fieldset>
  );
}
