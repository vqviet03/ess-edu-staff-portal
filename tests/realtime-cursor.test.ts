import test from "node:test";
import assert from "node:assert/strict";
import { earlierCursor } from "../src/shared/realtime-socket";
test("joining without history preserves owner replay; stale tabs replay from earliest cursor", () => {
  assert.equal(earlierCursor("42", undefined), "42");
  assert.equal(earlierCursor("42", "0"), "0");
  assert.equal(earlierCursor(undefined, "12"), "12");
  assert.equal(earlierCursor("42", "99"), "42");
  assert.equal(earlierCursor("42", "invalid"), "42");
  assert.equal(earlierCursor(undefined, undefined), undefined);
  assert.equal(
    earlierCursor("10000000000000001", "10000000000000000"),
    "10000000000000000",
  );
});
