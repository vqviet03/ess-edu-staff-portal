import test from "node:test";
import assert from "node:assert/strict";
import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import { createMockAdapter } from "../src/mock/adapter";
import { createAppBaseQuery } from "../src/api/base-query";
import { seed, type Database } from "../src/mock/fixtures";
import type { AuthSession, Envelope } from "../src/types";
import type { AccountSessionPolicy, SessionRevocation } from "../src/features/management/models";
import type { BulkPreview } from "../src/features/management/models";
import type { Operation } from "../src/features/operations/models";

function harness() {
  let stored = JSON.stringify(seed()), session: AuthSession | null = null;
  const storage = { getItem: () => stored, setItem: (_: string, value: string) => { stored = value; } };
  const mock = createMockAdapter(storage, 0);
  const runtime = { signal: new AbortController().signal, dispatch() {}, getState: () => ({ auth: { session } }), endpoint: "test", type: "mutation" } as unknown as BaseQueryApi;
  const request = (url: string, method = "GET", body?: unknown, token = session?.accessToken, async = false) => mock({ url, method, body, headers: { Authorization: `Bearer ${token ?? ""}`, ...(async ? { Prefer: "respond-async", "Idempotency-Key": "sessions-once" } : {}) } }, runtime, {});
  const call = async <T>(...args: Parameters<typeof request>) => { const r = await request(...args); assert(!r.error, JSON.stringify(r.error)); return (r.data as Envelope<T>).data; };
  const login = (teacherId: string) => call<AuthSession>("/auth/login", "POST", { teacherId, password: "Demo123!" });
  return { mock, runtime, storage, request, call, login, manager: async () => { session = await login("MG0001"); return session; }, db: () => JSON.parse(stored) as Database, edit: (f: (db: Database) => void) => { const db = JSON.parse(stored) as Database; f(db); stored = JSON.stringify(db); } };
}
const policy = "/manager/accounts/acc-GV0001/session-policy", revoke = "/manager/accounts/acc-GV0001/sessions/revoke";
test("Thu hồi tất cả phiên giảng viên, giữ quyền quản lý và cho phép đăng nhập lại", async () => {
  const h = harness(), manager = await h.manager(), first = await h.login("GV0001"), second = await h.login("GV0001"), other = await h.login("GV0002");
  const p = await h.call<AccountSessionPolicy>(policy); assert.equal(p.activeSessionCount, 2);
  const result = await h.call<SessionRevocation>(revoke, "POST", { version: p.version, reason: "Đăng nhập lại" }); assert.equal(result.revokedSessions, 2); assert.equal(result.policy.activeSessionCount, 0);
  for (const token of [first.accessToken, second.accessToken]) assert.equal((await h.request("/auth/me", "GET", undefined, token)).error?.status, 401);
  for (const token of [manager.accessToken, other.accessToken, (await h.login("GV0001")).accessToken]) assert(!(await h.request("/auth/me", "GET", undefined, token)).error);
  assert.equal(h.db().management!.accounts.find((a) => a.id === "acc-GV0001")!.status, "ACTIVE"); assert(h.db().management!.audit.some((e) => e.action === "REVOKE_SESSIONS"));
});
test("Quản lý thu hồi phiên học sinh; không thay đổi lớp hoặc dữ liệu học tập", async () => {
  const h = harness(); await h.manager(); const student = h.db().management!.accounts.find((a) => a.kind === "STUDENT")!;
  h.edit((db) => { db.management!.studentSessions = [1, 2].map((i) => ({ id: `student-session-${i}`, accountId: student.id, expiresAt: new Date(Date.now() + 60000).toISOString(), revokedAt: null })); });
  const before = h.db().management!.enrollments; const result = await h.call<SessionRevocation>(`/manager/accounts/${student.id}/sessions/revoke`, "POST", { version: student.version, reason: "Yêu cầu đăng nhập lại" });
  assert.equal(result.revokedSessions, 2); assert(h.db().management!.studentSessions!.every((s) => s.revokedAt)); assert.deepEqual(h.db().management!.enrollments, before);
});
test("MANAGER và tài khoản hai vai trò được bảo vệ; TEACHER không có quyền", async () => {
  const h = harness(); await h.manager();
  for (const id of ["MG0001", "BOTH0001"]) {
    const p = await h.call<AccountSessionPolicy>(`/manager/accounts/acc-${id}/session-policy`); assert(p.managerProtected);
    assert.equal((await h.request(`/manager/accounts/acc-${id}/sessions/revoke`, "POST", { version: p.version, reason: "Thử thu hồi" })).error?.status, 403);
  }
  const t = await h.login("GV0001"); assert.equal((await h.request(policy, "GET", undefined, t.accessToken)).error?.status, 403);
  assert.equal((await h.request(revoke, "POST", { version: 1, reason: "Thử" }, t.accessToken)).error?.status, 403);
});
test("Thời hạn riêng áp dụng cho mật khẩu/link, persist sau reload; null dùng mặc định", async () => {
  const h = harness(); await h.manager(); const old = await h.login("GV0001"), p = await h.call<AccountSessionPolicy>(policy);
  const updated = await h.call<AccountSessionPolicy>(policy, "PATCH", { sessionLifetimeMinutes: 7, version: p.version, reason: "Đặt 7 phút" });
  assert.equal(h.db().tokens[old.accessToken].expiresAt, old.expiresAt);
  const manual = await h.login("GV0001"), linked = await h.call<AuthSession>("/auth/link/exchange", "POST", { code: "teacher-demo" });
  for (const s of [manual, linked]) assert(Math.abs(Date.parse(s.expiresAt) - Date.now() - 420000) < 1000);
  const fresh = createMockAdapter(h.storage, 0), r = await fresh({ url: policy, headers: { Authorization: `Bearer ${h.db().tokens[Object.keys(h.db().tokens).find((k) => h.db().tokens[k].teacher.id === "MG0001")!].accessToken}` } }, h.runtime, {});
  assert(!r.error); assert.equal((r.data as Envelope<AccountSessionPolicy>).data.sessionLifetimeMinutes, 7);
  const reset = await h.call<AccountSessionPolicy>(policy, "PATCH", { sessionLifetimeMinutes: null, version: updated.version, reason: "Mặc định" }); assert.equal(reset.effectiveLifetimeMinutes, 60);
});
test("Validation thời hạn, lý do và version conflict không thay đổi phiên", async () => {
  const h = harness(); await h.manager(); await h.login("GV0001"); const before = h.db().tokens;
  for (const minutes of [0, -1, 43201, 2.5, "60"]) assert.equal((await h.request(policy, "PATCH", { sessionLifetimeMinutes: minutes, version: 1, reason: "Sai" })).error?.status, 422);
  assert.equal((await h.request(revoke, "POST", { version: 1, reason: "" })).error?.status, 422);
  assert.equal((await h.request(revoke, "POST", { version: 2, reason: "Cũ" })).error?.status, 409);
  assert.equal((await h.request(policy, "PATCH", { sessionLifetimeMinutes: 5, version: 2, reason: "Cũ" })).error?.status, 409); assert.deepEqual(h.db().tokens, before);
});
test("Chỉnh sửa hồ sơ tài khoản không làm mất hoặc ghi đè thời hạn riêng", async () => {
  const h = harness(); await h.manager();
  await h.call<AccountSessionPolicy>(policy, "PATCH", { sessionLifetimeMinutes: 7, version: 1, reason: "Thời hạn riêng" });
  const preview = await h.call<BulkPreview>("/manager/changes/preview", "POST", { entity: "accounts", mode: "UPDATE", rows: [{ id: "acc-GV0001", version: 2, roles: ["TEACHER"], status: "ACTIVE" }] }); assert.deepEqual(preview.errors, []);
  const op = await h.call<Operation>("/manager/changes/commit", "POST", { previewId: preview.previewId, version: preview.version, confirmations: preview.requiredConfirmations, reason: "Cập nhật tài khoản" }, undefined, true);
  assert.equal((await h.call<Operation>(`/operations/${op.operationId}`)).status, "DONE");
  assert.equal((await h.call<AccountSessionPolicy>(policy)).sessionLifetimeMinutes, 7);
});
test("Tác vụ async kiểm tra lại MANAGER tại commit và Idempotency-Key không chạy hai lần", async () => {
  const h = harness(); await h.manager(); const t = await h.login("GV0001"), body = { version: 1, reason: "Phải kiểm tra quyền mới" };
  const op = await h.call<Operation>(revoke, "POST", body, undefined, true); assert.equal(op.status, "IN_PROGRESS");
  const repeat = await h.call<Operation>(revoke, "POST", body, undefined, true); assert.equal(repeat.operationId, op.operationId);
  h.edit((db) => { db.management!.accounts.find((a) => a.id === "acc-GV0001")!.roles.push("MANAGER"); });
  const failed = await h.call<Operation>(`/operations/${op.operationId}`); assert.equal(failed.status, "FAILED"); assert.equal(failed.error?.code, "MANAGER_PROTECTED"); assert(h.db().tokens[t.accessToken]);
});
test("RTK Query xử lý 202, đợi kết quả rồi trả policy và notification", async () => {
  const h = harness(); await h.manager(); const base = createAppBaseQuery({ mock: true, mockAdapter: h.mock });
  const r = await base({ url: policy, method: "PATCH", body: { sessionLifetimeMinutes: 15, version: 1, reason: "Đổi thời hạn" } }, h.runtime, {});
  assert(!r.error, JSON.stringify(r.error)); assert.equal((r.data as Envelope<AccountSessionPolicy>).data.effectiveLifetimeMinutes, 15); assert.equal(h.db().operationEvents?.length, 1); assert(h.db().operationEvents![0].entities.includes("accounts"));
});
