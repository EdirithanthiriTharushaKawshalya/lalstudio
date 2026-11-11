import { mkdir, writeFile } from "node:fs/promises";
const samples = {
  hero: "1511285560929-80b456fea0bc",
  wedding: "1537633552985-df8429e8048b",
  portrait: "1508214751196-bcfd4ca60f91",
  family: "1511895426328-dc8714191300",
  couple: "1522673607200-164d1b6ce486",
  event: "1511795409834-ef04bbd61622",
  camera: "1516035069371-29a1b244cc32",
};
await mkdir("public/photos", { recursive: true });
await Promise.all(
  Object.entries(samples)
    .filter(([name]) => !process.argv.includes("--hero") || name === "hero")
    .map(async ([name, id]) => {
      const response = await fetch(
        `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${name === "hero" ? 2400 : 1400}&q=85`,
      );
      if (!response.ok) throw new Error(`${name}: ${response.status}`);
      await writeFile(
        `public/photos/${name === "hero" ? "hero-celebration" : name}.jpg`,
        Buffer.from(await response.arrayBuffer()),
      );
      console.log(`Saved sample ${name}`);
    }),
);
