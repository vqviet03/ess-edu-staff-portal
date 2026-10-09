import { test } from "node:test";
import assert from "node:assert/strict";
import {
  absenceWarning,
  calendarCells,
  shiftMonth,
} from "../src/features/attendance/models";
import { rewardNoticeTags } from "../src/features/rewards/realtime";
test("absence thresholds use original planned sessions and include exactly 20 percent in warning", () => {
  assert.equal(absenceWarning(1, 20).warning, "ACCEPTABLE");
  assert.equal(absenceWarning(2, 20).warning, "WARNING");
  assert.equal(absenceWarning(4, 20).warning, "WARNING");
  assert.equal(absenceWarning(5, 20).warning, "DANGER");
  assert.equal(absenceWarning(0, 0).percentage, null);
  assert.equal(absenceWarning(0, 0).warning, "NO_PLAN");
});
test("calendar starts Monday, covers leap days, month transitions and real dates", () => {
  const cells = calendarCells("2028-02");
  assert.equal(cells[0], "2028-01-31");
  assert.ok(cells.includes("2028-02-29"));
  assert.equal(cells.length, 42);
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
});
test("attendance events refresh attendance and reward projections only", () =>
  assert.deepEqual(rewardNoticeTags("ATTENDANCE", "c"), [
    { type: "Attendance", id: "c" },
    { type: "Rewards", id: "c" },
  ]));
