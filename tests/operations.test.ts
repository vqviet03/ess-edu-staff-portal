import test from "node:test";
import assert from "node:assert/strict";
import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import { createMockAdapter } from "../src/mock/adapter";
import { createAppBaseQuery } from "../src/api/base-query";
import { seed, type Database } from "../src/mock/fixtures";
import { nameIdentifier, availableIdentifier } from "../src/features/management/identifiers";
import { businessMutation, relatedTags, type Operation } from "../src/features/operations/models";
import type { BulkPreview } from "../src/features/management/models";
import type { AuthSession, Envelope } from "../src/types";
import { profileWorkbook, readProfiles } from "../src/features/management/excel-workbook";

function harness() {
  let stored = JSON.stringify(seed()), session: AuthSession | null = null;
  const storage = { getItem: () => stored, setItem: (_: string, value: string) => { stored = value; } };
  const mock = createMockAdapter(storage, 0);
  const dispatched: unknown[] = [];
  const runtime = { signal: new AbortController().signal, dispatch: (a: unknown) => { dispatched.push(a); }, getState: () => ({ auth: { session } }), endpoint: "test", type: "mutation" } as unknown as BaseQueryApi;
  const call = async <T>(url: string, method = "GET", body?: unknown, async = false, key = "test") => {
    const r = await mock({ url, method, body, headers: { Authorization: `Bearer ${session?.accessToken ?? ""}`, ...(async ? { Prefer: "respond-async", "Idempotency-Key": key } : {}) } }, runtime, {});
    assert(!r.error, JSON.stringify(r.error)); return (r.data as Envelope<T>).data;
  };
  return { mock, storage, runtime, dispatched, call, session: () => session!, db: () => JSON.parse(stored) as Database, login: async () => { session = await call<AuthSession>("/auth/login", "POST", { teacherId: "MG0001", password: "Demo123!" }); }, preview: (rows: Record<string, unknown>[], entity = "students") => call<BulkPreview>("/manager/changes/preview", "POST", { entity, rows, mode: "CREATE" }) };
}
const commit = (p: BulkPreview) => ({ previewId: p.previewId, version: p.version, confirmations: p.requiredConfirmations, reason: "Kiểm thử" });
test("ID tiếng Việt, custom, phân biệt hoa thường và hậu tố tự nhiên", () => {
  assert.equal(nameIdentifier("Vũ Quốc Việt"), "vq.viet"); assert.equal(nameIdentifier("Nguyễn Trung Anh"), "nt.anh"); assert.equal(nameIdentifier("  Đỗ   Hải Đăng "), "dh.dang");
  assert.equal(availableIdentifier("vq.viet", new Set(["vq.viet", "vq.viet1"])), "vq.viet2");
  assert.equal(availableIdentifier("Custom.ID", new Set(["custom.id", "custom.id1"])), "Custom.ID2");
  assert.equal(availableIdentifier("a".repeat(64), new Set(["a".repeat(64)])), "a".repeat(63) + "1");
});
test("Bảng nhập cấp ID trống/trùng, giữ số 0 và ID tùy chỉnh", async () => {
  const h = harness(); await h.login();
  const p = await h.preview([{ id: "", fullName: "Vũ Quốc Việt" }, { id: "vq.viet", fullName: "Vũ Quốc Việt" }, { id: "", fullName: "Vũ Quốc Việt" }]);
  assert.deepEqual(p.errors, []); assert.deepEqual(p.changes.map((x) => x.id), ["vq.viet", "vq.viet1", "vq.viet2"]);
  const ack = await h.call<Operation>("/manager/changes/commit", "POST", commit(p), true, "once");
  assert.equal(ack.status, "IN_PROGRESS");
  const repeated = await h.call<Operation>("/manager/changes/commit", "POST", commit(p), true, "once"); assert.equal(repeated.operationId, ack.operationId);
  const done = await h.call<Operation>(`/operations/${ack.operationId}`); assert.equal(done.status, "DONE"); assert.equal(h.db().operationEvents?.length, 1);
  const suggestion = await h.call<{ id: string; isAvailable: boolean }>("/manager/identifiers/check", "POST", { entity: "teachers", id: "vq.viet" }); assert.equal(suggestion.id, "vq.viet3"); assert.equal(suggestion.isAvailable, false);
});
test("Operation được phục hồi từ dữ liệu mock persist sau reload", async () => {
  const h = harness(); await h.login(); const p = await h.preview([{ fullName: "Nguyễn Trung Anh" }]);
  const job = await h.call<Operation>("/manager/changes/commit", "POST", commit(p), true);
  const fresh = createMockAdapter(h.storage, 0), r = await fresh({ url: `/operations/${job.operationId}`, headers: { Authorization: `Bearer ${h.session().accessToken}` } }, h.runtime, {});
  assert.equal((r.data as Envelope<Operation>).data.status, "DONE"); assert(h.db().management?.students.some((s) => s.id === "nt.anh"));
});
test("Conflict trả FAILED, giữ dữ liệu cũ và không tự retry mutation", async () => {
  const h = harness(); await h.login(); const p = await h.preview([{ fullName: "Nguyễn Trung Anh" }]); const job = await h.call<Operation>("/manager/changes/commit", "POST", commit(p), true);
  const db = h.db(); db.management!.revision++; h.storage.setItem("", JSON.stringify(db));
  const failed = await h.call<Operation>(`/operations/${job.operationId}`); assert.equal(failed.status, "FAILED"); assert.equal(failed.error?.code, "VERSION_CONFLICT"); assert(!h.db().management?.students.some((s) => s.id === "nt.anh"));
});
test("Mock baseQuery xử lý trực tiếp, không tạo polling hoặc yêu cầu socket", async () => {
  const h = harness(); await h.login(); const p = await h.preview([{ fullName: "Nguyễn Lan" }]);
  const base = createAppBaseQuery({ mock: true, mockAdapter: h.mock });
  const r = await base({ url: "/manager/changes/commit", method: "POST", body: commit(p), headers: { "Idempotency-Key": "rtk-one" } }, h.runtime, {});
  assert(!r.error, JSON.stringify(r.error)); assert.equal((r.data as Envelope<{ updated: number }>).data.updated, 1);
  assert.equal(h.dispatched.length, 0);
});
test("Mã lớp cấp ess21, ess22; sửa hậu tố giữ nguyên ID", async () => {
  const h = harness(); await h.login(); const p = await h.preview([{ nameSuffix: "a1", schedule: "Thứ 3", totalUnits: 5 }], "classes");
  assert.deepEqual(p.errors, []); assert.equal(p.changes[0].id, "ess21"); assert.equal("name" in p.changes[0].after && p.changes[0].after.name, "ess21-a1");
  const job = await h.call<Operation>("/manager/changes/commit", "POST", commit(p), true); assert.equal((await h.call<Operation>(`/operations/${job.operationId}`)).status, "DONE");
  assert.equal((await h.call<{ id: string }>("/manager/identifiers/suggest", "POST", { entity: "classes" })).id, "ess22");
  const update = await h.call<BulkPreview>("/manager/changes/preview", "POST", { entity: "classes", mode: "UPDATE", rows: [{ id: "ess21", version: 1, nameSuffix: "b2" }] });
  assert.equal(update.changes[0].id, "ess21"); assert.equal("name" in update.changes[0].after && update.changes[0].after.name, "ess21-b2");
});
test("Excel CREATE cho phép ID rỗng/trùng; UPDATE vẫn yêu cầu ID ổn định và không trùng", async () => {
  const file = await profileWorkbook("students", [{ fullName: "Nguyễn An", id: "" }, { fullName: "Nguyễn Anh", id: "" }, { fullName: "Vũ Quốc Việt", id: "vq.viet" }, { fullName: "Vũ Quốc Việt", id: "vq.viet" }]);
  const created = await readProfiles(file, "students", "CREATE"); assert.equal(created.rows.length, 4); assert.deepEqual(created.errors, []);
  const updated = await readProfiles(file, "students", "UPDATE"); assert.equal(updated.errors.length, 3);
});
test("Chỉ mutation nghiệp vụ dùng hàng đợi; thông báo invalidate đúng nhóm query", () => {
  assert(businessMutation("/manager/changes/commit", "POST")); assert(businessMutation("/assessments/a/results/batch", "PATCH")); assert(!businessMutation("/manager/changes/preview", "POST")); assert(!businessMutation("/auth/login", "POST"));
  for(const path of ["/classes/c/attendance/calendar","/classes/c/notification-settings","/classes/c/schedule","/classes/c/rewards"])assert(!businessMutation(path,"PUT"));
  assert(!relatedTags(["teachers"]).includes("ClassAccess")); assert(!relatedTags(["accounts"]).includes("Auth")); assert(relatedTags(["results"]).includes("Results")); assert(!relatedTags(["labels"]).includes("Results"));
});
