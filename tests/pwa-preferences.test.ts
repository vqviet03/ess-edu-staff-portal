import test from "node:test";
import assert from "node:assert/strict";
import { wantsNotification } from "../src/features/pwa/models";
test("mute low-priority spam by default, preserve important signals and explicit choice", () => {
  for (const type of ["REACTION", "SYSTEM", "PRESENCE", "VIEW", "REWARD"]) {
    assert.equal(wantsNotification(type, "NORMAL"), false);
    assert.equal(wantsNotification(type, "IMPORTANT"), true);
  }
  for (const type of ["POST", "COMMENT", "GRADE", "ATTENDANCE", "APPROVAL"])
    assert.equal(wantsNotification(type, "NORMAL"), true);
  assert.equal(
    wantsNotification("APPROVAL", "IMPORTANT", { APPROVAL: false }),
    false,
  );
  assert.equal(
    wantsNotification("REACTION", "NORMAL", { REACTION: true }),
    true,
  );
});

import { downloadName } from "../src/features/materials/utils";
test("processed images download with their real encoding and other document names stay unchanged", () => {
  assert.equal(
    downloadName({ displayName: "Buổi học.png", mimeType: "image/avif" }),
    "Buổi học.avif",
  );
  assert.equal(
    downloadName({ displayName: "Ảnh.jpeg", mimeType: "image/jpeg" }),
    "Ảnh.jpeg",
  );
  assert.equal(
    downloadName({
      displayName: "Giáo trình.pdf",
      mimeType: "application/pdf",
    }),
    "Giáo trình.pdf",
  );
});

import {
  applicationKey,
  invalidPushKeyMessage,
} from "../src/features/pwa/platform";
import { generateKeyPairSync } from "node:crypto";
test("VAPID public key decodes the exact P-256 point, padded or unpadded", () => {
  const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = publicKey.export({ format: "jwk" });
  const bytes = Buffer.concat([
    Buffer.from([4]),
    Buffer.from(jwk.x!, "base64url"),
    Buffer.from(jwk.y!, "base64url"),
  ]);
  for (const value of [
    bytes.toString("base64url"),
    bytes.toString("base64url") + "=",
  ]) {
    assert.deepEqual(applicationKey(value), new Uint8Array(bytes));
  }
});
test("invalid VAPID config reports a Vietnamese error instead of browser atob exception", () => {
  for (const value of [
    "_",
    "",
    "undefined",
    "not a key",
    '"public-key"',
    "A".repeat(87),
    "B".repeat(86),
    "B".repeat(87) + "==",
  ]) {
    assert.throws(() => applicationKey(value), {
      message: invalidPushKeyMessage,
    });
  }
});
