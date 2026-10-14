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
