import sharp from "sharp";

/** Decode and normalize uploads before any storage write; no credentials or I/O. */
export async function prepareUpload(
  file: File,
  options: { landscape?: boolean } = {},
) {
  if (file.size > 5 * 1024 * 1024 || file.size < 20)
    throw new Error("Each photograph must be between 20 bytes and 5 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Use JPEG, PNG or WebP images.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const image = sharp(bytes, { limitInputPixels: 24_000_000, animated: false });
  const meta = await image.metadata();
  if (
    !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
    !meta.width ||
    !meta.height ||
    meta.width < 50 ||
    meta.height < 50
  )
    throw new Error("Upload a valid photograph at least 50 × 50 pixels.");
  if (options.landscape) {
    const rotated =
      meta.orientation !== undefined &&
      meta.orientation >= 5 &&
      meta.orientation <= 8;
    const width = rotated ? meta.height : meta.width;
    const height = rotated ? meta.width : meta.height;
    if (width <= height || width < 1600 || height < 900)
      throw new Error(
        "Choose a landscape hero photograph at least 1600 × 900 pixels.",
      );
  }
  // Re-encoding strips original metadata, including GPS and filenames.
  return image
    .rotate()
    .resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: options.landscape ? 90 : 88 })
    .toBuffer();
}
