import test from "node:test";
import assert from "node:assert/strict";
import {
  compressImage,
  MAX_IMAGE_BYTES,
} from "../src/features/materials/image-compression";
test("small images and other files keep original bytes/name", async () => {
  for (const file of [
    new File(["small"], "image.png", { type: "image/png" }),
    new File(["audio"], "audio.mp3", { type: "audio/mpeg" }),
  ])
    assert.equal(await compressImage(file), file);
});
test("large image becomes a bounded WebP before upload metadata is generated", async () => {
  const documentBefore = Object.getOwnPropertyDescriptor(
      globalThis,
      "document",
    ),
    bitmapBefore = Object.getOwnPropertyDescriptor(
      globalThis,
      "createImageBitmap",
    );
  let closed = false;
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    value: async () => ({
      width: 500,
      height: 400,
      close: () => {
        closed = true;
      },
    }),
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: () => {} }),
        toBlob: (callback: (b: Blob) => void) =>
          callback(new Blob(["compressed"], { type: "image/webp" })),
      }),
    },
  });
  try {
    const result = await compressImage(
      new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "original.png", {
        type: "image/png",
      }),
    );
    assert.equal(result.type, "image/webp");
    assert.equal(result.name, "original.webp");
    assert(result.size <= MAX_IMAGE_BYTES);
    assert(closed);
  } finally {
    for (const [name, before] of [
      ["document", documentBefore],
      ["createImageBitmap", bitmapBefore],
    ] as const) {
      if (before) Object.defineProperty(globalThis, name, before);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
