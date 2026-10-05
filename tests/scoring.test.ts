import test from "node:test";
import assert from "node:assert/strict";
import {
  calculate,
  emptyResult,
  completedUnitNumbers,
  schemaImpact,
  validateResult,
} from "../src/utils/scores";
import { seed } from "../src/mock/fixtures";
import { expired } from "../src/features/auth/storage";
test("7 kỹ năng: 23.1/35 = 66%; không lấy trung bình tỷ lệ", () => {
  const db = seed(),
    a = db.assessments[0],
    r = db.results[a.id][0];
  const t = calculate(r, a.skills);
  assert.equal(t.score, 23.1);
  assert.equal(t.max, 35);
  assert.equal(t.percentage, 66);
  assert.equal(t.complete, true);
});
test("subset, null khác 0, tổng tạm tính và điểm thập phân", () => {
  const a = seed().assessments[1],
    r = emptyResult("x", a.skills);
  assert.equal(calculate(r, a.skills).score, null);
  r.attendance = "PRESENT";
  r.skillResults[0].score = 0;
  let t = calculate(r, a.skills);
  assert.equal(t.score, 0);
  assert.equal(t.percentage, 0);
  assert.equal(t.entered, 1);
  assert.equal(t.complete, false);
  r.skillResults[1].score = 2.1;
  t = calculate(r, a.skills);
  assert.equal(t.max, 14);
  assert.equal(t.percentage, 15);
  assert.equal(t.complete, true);
  assert.deepEqual(validateResult(r, a.skills), {});
});
test("giới hạn, thập phân, tham gia, thiếu kỹ năng và thay schema", () => {
  const db = seed(),
    a = db.assessments[0],
    r = structuredClone(db.results[a.id][0]);
  r.skillResults[0].score = 4.1;
  assert.ok(validateResult(r, a.skills).VOCABULARY);
  r.skillResults[0].score = 0.5;
  assert.ok(validateResult(r, a.skills).VOCABULARY);
  r.attendance = "ABSENT";
  assert.ok(validateResult(r, a.skills).attendance);
  r.attendance = "UNSET";
  assert.ok(validateResult(r, a.skills).attendance);
  assert.ok(
    schemaImpact(
      a.skills.map((s) => ({ ...s, maxQuestions: 1 })),
      [r],
    ).length,
  );
  r.skillResults.pop();
  assert.ok(validateResult(r, a.skills).skills);
});
test("tiến độ đếm Unit hoàn thành riêng biệt; tạo nháp không tăng", () =>
  assert.deepEqual(
    completedUnitNumbers([
      { unitNumber: 1, status: "COMPLETED" },
      { unitNumber: 1, status: "COMPLETED" },
      { unitNumber: 2, status: "DRAFT" },
      { unitNumber: null, status: "COMPLETED" },
    ]),
    [1],
  ));
test("hết phiên theo expiresAt hoặc JWT exp", () => {
  const teacher = { id: "x", name: "X" };
  assert.equal(
    expired({
      accessToken: "demo",
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      teacher,
    }),
    false,
  );
  assert.equal(
    expired({ accessToken: "demo", expiresAt: "invalid", teacher }),
    true,
  );
  const token = "x." + btoa(JSON.stringify({ exp: 1 })) + ".x";
  assert.equal(
    expired({
      accessToken: token,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      teacher,
    }),
    true,
  );
});
