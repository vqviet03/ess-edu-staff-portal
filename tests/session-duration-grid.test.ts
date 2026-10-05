import test from "node:test";
import assert from "node:assert/strict";
import { emptyDuration, sessionExpiry } from "../src/features/management/session-duration";
import { profileGridRow, profileGridErrors } from "../src/features/management/grid-rows";
test("Thời hạn theo lịch: năm nhuận, cuối tháng, giờ/phút, tối đa 10 năm", () => {
  assert.equal(sessionExpiry("2024-02-29T10:00:00Z", { ...emptyDuration, years: 1 }), "2025-02-28T10:00:00.000Z");
  assert.equal(sessionExpiry("2026-01-31T10:00:00Z", { ...emptyDuration, months: 1, days: 2, hours: 3, minutes: 4 }), "2026-03-02T13:04:00.000Z");
  assert.equal(sessionExpiry("2024-02-29T10:00:00Z", { ...emptyDuration, years: 10 }), "2034-02-28T10:00:00.000Z");
  for (const d of [emptyDuration, { ...emptyDuration, years: 10, minutes: 1 }, { ...emptyDuration, months: -1 }, { ...emptyDuration, hours: 1.5 }]) assert.throws(() => sessionExpiry("2026-01-31T10:00:00Z", d));
});
test("Bảng tạo: ID trống hợp lệ, boolean và vai trò đúng kiểu, giữ số 0", () => {
  const raw = { id: "", fullName: "Vũ Quốc Việt", createAccount: "TRUE", roles: "TEACHER|MANAGER", notes: "Tiếng Việt\nDòng hai" };
  const row = profileGridRow(raw, "CREATE");
  assert.equal(row.id, ""); assert.equal(row.createAccount, true); assert.deepEqual(row.roles, ["TEACHER", "MANAGER"]); assert.deepEqual(profileGridErrors("teachers", raw, "CREATE"), {});
  assert.equal(profileGridRow({ createAccount: "FALSE" }, "CREATE").createAccount, false);
  assert.equal(profileGridRow({ createAccount: "0" }, "CREATE").createAccount, false);
  assert(!("createAccount" in profileGridRow({ createAccount: "" }, "CREATE")));
  assert(profileGridErrors("teachers", { fullName: "Giảng viên", createAccount: "invalid" }, "CREATE").createAccount);
});
test("Bảng cập nhật: bắt buộc ID, ô trống giữ dữ liệu cũ, không tự kích hoạt hồ sơ", () => {
  assert.deepEqual(profileGridRow({ id: "vq.viet", fullName: "", status: "", notes: "Mới" }, "UPDATE"), { id: "vq.viet", notes: "Mới" });
  assert.deepEqual(profileGridErrors("teachers", { id: "vq.viet", notes: "Mới" }, "UPDATE"), {});
  assert(profileGridErrors("students", { fullName: "Học sinh" }, "UPDATE").id);
  assert.deepEqual(profileGridErrors("students", { id: "", fullName: "" }, "UPDATE"), {});
  assert(profileGridErrors("students", { id: "ab", createAccount: "TRUE" }, "UPDATE").createAccount);
});
