import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
const source =
  "https://images.squarespace-cdn.com/content/v1/58c3b233b3db2b34ddf8bf37/1526276019516-8HOP9WQFAG0ESLY8Z99V/_DSC8309.jpg?format=1500w";
const response = await fetch(source);
if (!response.ok)
  throw new Error(`Framing image download failed (${response.status}).`);
if (!response.headers.get("content-type")?.startsWith("image/"))
  throw new Error("The source did not return an image.");
await mkdir("public/photos", { recursive: true });
const bytes = Buffer.from(await response.arrayBuffer());
const meta = await sharp(bytes).metadata();
if (!["jpeg", "png", "webp"].includes(meta.format))
  throw new Error("Unsupported source image format.");
const path = `public/photos/printing-framing.${meta.format === "jpeg" ? "jpg" : meta.format}`;
await writeFile(path, bytes);
console.log(
  JSON.stringify({
    path,
    width: meta.width,
    height: meta.height,
    format: meta.format,
  }),
);
console.log(
  "Saved the framing photograph from the supplied Anna Curtius article.",
);
