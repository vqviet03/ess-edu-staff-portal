import test from "node:test";
import assert from "node:assert/strict";
import { deadlineUrgency } from "../src/features/materials/deadline";
const now = Date.parse("2026-10-14T00:00:00Z"),
  hour = 3600000;
test("deadline urgency distinguishes absent, future, 72h, 24h and overdue boundaries", () => {
  assert.equal(deadlineUrgency(null, now), "none");
  assert.equal(deadlineUrgency("invalid", now), "none");
  for (const [hours, expected] of [
    [73, "normal"],
    [72, "soon"],
    [25, "soon"],
    [24, "urgent"],
    [1, "urgent"],
    [0, "overdue"],
    [-1, "overdue"],
  ] as const) {
    assert.equal(
      deadlineUrgency(new Date(now + hours * hour).toISOString(), now),
      expected,
    );
  }
});
test("equivalent timezone offsets produce the same urgency", () => {
  assert.equal(deadlineUrgency("2026-10-15T07:00:00+07:00", now), "urgent");
});
