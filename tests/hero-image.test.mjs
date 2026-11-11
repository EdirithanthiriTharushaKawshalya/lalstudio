import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { prepareUpload } from "../src/lib/image-processing.mts";

async function photo(width, height, orientation) {
  let image = sharp({
    create: { width, height, channels: 3, background: "#aab2ba" },
  });
  if (orientation) image = image.withMetadata({ orientation });
  return new File([await image.jpeg().toBuffer()], "client-photo.jpg", {
    type: "image/jpeg",
  });
}
test("Hero upload decodes a landscape photograph into a metadata-free WebP", async () => {
  const output = await prepareUpload(await photo(1600, 900), {
    landscape: true,
  });
  const meta = await sharp(output).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 1600);
  assert.equal(meta.height, 900);
  assert.equal(meta.exif, undefined);
});
test("Hero dimensions account for camera EXIF rotation", async () => {
  const output = await prepareUpload(await photo(900, 1600, 6), {
    landscape: true,
  });
  const meta = await sharp(output).metadata();
  assert.equal(meta.width, 1600);
  assert.equal(meta.height, 900);
  assert.equal(meta.orientation, undefined);
  assert.equal(meta.exif, undefined);
});
test("Portrait and undersized images cannot replace the landscape hero", async () => {
  await assert.rejects(
    prepareUpload(await photo(900, 1600), { landscape: true }),
    /landscape/,
  );
  await assert.rejects(
    prepareUpload(await photo(1200, 800), { landscape: true }),
    /1600/,
  );
});
test("Upload validates actual content, declared type and size before storage", async () => {
  await assert.rejects(
    prepareUpload(
      new File([Buffer.alloc(100)], "fake.jpg", { type: "image/jpeg" }),
      { landscape: true },
    ),
  );
  await assert.rejects(
    prepareUpload(
      new File([Buffer.alloc(100)], "bad.svg", { type: "image/svg+xml" }),
      { landscape: true },
    ),
    /JPEG/,
  );
  await assert.rejects(
    prepareUpload(
      new File([Buffer.alloc(5 * 1024 * 1024 + 1)], "large.jpg", {
        type: "image/jpeg",
      }),
      { landscape: true },
    ),
    /5 MB/,
  );
});
