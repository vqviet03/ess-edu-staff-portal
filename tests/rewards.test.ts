import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dateWindow,
  vietnamToday,
  validateSchedule,
  type ScheduleConfig,
} from "../src/features/rewards/models";
import { rewardNoticeTags } from "../src/features/rewards/realtime";
import { capabilities } from "../src/features/access/capabilities";
import type { Teacher } from "../src/types";
import type { ClassAccess } from "../src/features/management/models";
test("only active manager workspace can edit schedule; teacher assignment never grants schedule edit", () => {
  const teacher: Teacher = { id: "t", name: "Teacher", roles: ["TEACHER"], profileStatus: "ACTIVE", accountStatus: "ACTIVE" };
  const access: ClassAccess = { classId: "c", canView: true, assignmentStatus: "ACTIVE", assignmentConfirmed: true, classStatus: "ACTIVE", profileStatus: "ACTIVE", accountStatus: "ACTIVE" };
  const manager: Teacher = { ...teacher, roles: ["MANAGER"] };
  assert.equal(capabilities(teacher, "teacher", access).editSchedule, false);
  assert.equal(capabilities(manager, "manager", { ...access, assignmentStatus: null }).editSchedule, true);
  assert.equal(capabilities(manager, "manager", access).editLearning, false);
  assert.equal(capabilities({ ...manager, roles: ["MANAGER", "TEACHER"] }, "teacher", access).editSchedule, false);
  assert.equal(capabilities({ ...manager, profileStatus: "INACTIVE" }, "manager", access).editSchedule, false);
  assert.equal(capabilities({ ...manager, accountStatus: "LOCKED" }, "manager", access).editSchedule, false);
  assert.equal(capabilities(manager, "manager", { ...access, canView: false }).editSchedule, false);
});
test("reward dates use Vietnam midnight and real daily spacing", () => {
  assert.equal(vietnamToday(new Date("2026-10-08T17:01:00Z")), "2026-10-09");
  assert.deepEqual(dateWindow("2026-03-01", 1), {
    from: "2026-02-28",
    to: "2026-03-01",
  });
});
test("schedule validation covers week, month, duplicate days and flexible hours", () => {
  const config: ScheduleConfig = {
    mode: "FIXED",
    cycle: "WEEKLY",
    timeMode: "SHARED",
    startTime: "17:00",
    endTime: "18:30",
    slots: [{ day: 1, date: null, startTime: null, endTime: null }],
  };
  assert.equal(validateSchedule(config), null);
  assert.notEqual(validateSchedule({ ...config, slots: [] }), null);
  assert.notEqual(
    validateSchedule({ ...config, slots: [config.slots[0], config.slots[0]] }),
    null,
  );
  assert.notEqual(validateSchedule({ ...config, endTime: "16:00" }), null);
  assert.equal(
    validateSchedule({
      ...config,
      cycle: "MONTHLY",
      slots: [{ ...config.slots[0], day: 31 }],
    }),
    null,
  );
  assert.notEqual(
    validateSchedule({ ...config, slots: [{ ...config.slots[0], day: 8 }] }),
    null,
  );
  assert.equal(
    validateSchedule({
      ...config,
      mode: "FLEXIBLE",
      timeMode: "FLEXIBLE",
      slots: [{ ...config.slots[0], day: null, date: "2026-10-09" }],
    }),
    null,
  );
});
test("reward signals refresh only affected resources, no academic score requests", () => {
  assert.deepEqual(rewardNoticeTags("REWARD", "class-1"), [
    { type: "Rewards", id: "class-1" },
  ]);
  assert.deepEqual(rewardNoticeTags("SCHEDULE", "class-1"), [
    { type: "Schedule", id: "class-1" },
    { type: "Rewards", id: "class-1" },
  ]);
  assert.equal(rewardNoticeTags("MATERIAL", "class-1"), null);
});
