import test from "node:test";
import assert from "node:assert/strict";
import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import { createMockAdapter } from "../src/mock/adapter";
import type { Database } from "../src/mock/fixtures";
import { seed } from "../src/mock/fixtures";
import type { Assessment, AuthSession, Envelope, Publication, StudentResult } from "../src/types";
import { operationCommand } from "../src/mock/operations";

async function harness(login = "GV0001") {
  let value = JSON.stringify(seed()); let token = "";
  const mock = createMockAdapter({ getItem: () => value, setItem: (_key, next) => { value = next; } }, 0);
  const runtime = { signal: new AbortController().signal, dispatch: () => {}, getState: () => ({}) } as unknown as BaseQueryApi;
  const request = (url: string, method = "GET", body?: unknown) => mock({ url, method, body, headers: { Authorization: `Bearer ${token}` } }, runtime, {});
  const call = async <T>(url: string, method = "GET", body?: unknown) => { const result = await request(url, method, body); assert(!result.error, JSON.stringify(result.error)); return (result.data as Envelope<T>).data; };
  token = (await call<AuthSession>("/auth/login", "POST", { teacherId: login, password: "Demo123!" })).accessToken;
  const complete = async (id = "assessment-seven") => {
    const a = await call<Assessment>(`/assessments/${id}`);
    const rows = await call<StudentResult[]>(`/assessments/${id}/results`);
    for (const row of rows) await call(`/assessments/${id}/results/${row.studentId}`, "PUT", { ...row, attendance: "PRESENT", skillResults: a.skills.map(s => ({ skillCode: s.skillCode, score: s.allowDecimal ? 2.1 : 0, comment: "Nhận xét\nTiếng Việt", advice: "Luyện tập" })) });
    return call<Assessment>(`/assessments/${id}`, "PATCH", { ...a, status: "COMPLETED" });
  };
  return { call, request, complete, db: () => JSON.parse(value) as Database, reload: () => createMockAdapter({ getItem: () => value, setItem: (_key, next) => { value = next; } }, 0), runtime };
}

test("Hoàn thành riêng với công bố; snapshot giữ 0/thập phân/nhận xét, persist và gỡ để sửa", async () => {
  const h = await harness(), path = "/assessments/assessment-seven";
  let a = await h.call<Assessment>(path);
  assert.equal((await h.call<Publication>(path + "/publication")).isPublished, false);
  assert.equal((await h.request(path + "/publish", "POST", { version: a.version })).error?.status, 409);
  a = await h.complete(); assert.equal((await h.call<Publication>(path + "/publication")).isPublished, false);
  await h.call(path + "/publish", "POST", { version: a.version });
  const p = await h.call<Publication>(path + "/publication"); assert(p.isPublished); assert.equal(p.sourceAssessmentId, a.id); assert(p.publishedAt);
  const snapshot = Object.values(h.db().publications!)[0]; assert.equal(snapshot.results[0].skillResults[0].score, 0); assert.equal(snapshot.results[0].skillResults.find(s => s.skillCode === "SPEAKING")?.score, 2.1); assert.equal(snapshot.results[0].skillResults[0].comment, "Nhận xét\nTiếng Việt");
  const login = await h.reload()({ url: "/auth/login", method: "POST", body: { teacherId: "GV0001", password: "Demo123!" } }, h.runtime, {}); const session = (login.data as Envelope<AuthSession>).data;
  const reloaded = await h.reload()({ url: path + "/publication", headers: { Authorization: `Bearer ${session.accessToken}` } }, h.runtime, {}); assert((reloaded.data as Envelope<Publication>).data.isPublished);
  assert.equal((await h.request(path, "PATCH", { ...a, version: a.version + 1, status: "DRAFT" })).error?.status, 409);
  assert.equal((await h.request(path + "/unpublish", "POST", { version: a.version })).error?.status, 409);
  a = await h.call<Assessment>(path); await h.call(path + "/unpublish", "POST", { version: a.version }); assert.equal((await h.call<Publication>(path + "/publication")).isPublished, false);
  a = await h.call<Assessment>(path); await h.call(path, "PATCH", { ...a, status: "DRAFT" });
});

test("Quản lý chỉ xem công bố; dual không phụ trách không được công bố", async () => {
  for (const login of ["MG0001", "BOTH0001"]) {
    const h = await harness(login); const a = await h.call<Assessment>("/assessments/assessment-seven");
    await h.call<Publication>(`/assessments/${a.id}/publication`);
    assert.equal((await h.request(`/assessments/${a.id}/publish`, "POST", { version: a.version })).error?.status, 403);
  }
});

test("Một Unit chỉ có một nguồn công bố; bài cũ hiện nguồn thay thế và không gỡ bài khác", async () => {
  const h = await harness(); let first = await h.complete(); await h.call(`/assessments/${first.id}/publish`, "POST", { version: first.version });
  const second = await h.call<Assessment>(`/sessions/${first.sessionId}/assessments`, "POST", { name: "Nguồn báo cáo mới", type: first.type, skills: first.skills });
  const done = await h.complete(second.id); await h.call(`/assessments/${second.id}/publish`, "POST", { version: done.version });
  const previous = await h.call<Publication>(`/assessments/${first.id}/publication`); assert.equal(previous.isPublished, false); assert.equal(previous.sourceAssessmentId, second.id);
  first = await h.call<Assessment>(`/assessments/${first.id}`); assert.equal((await h.request(`/assessments/${first.id}/unpublish`, "POST", { version: first.version })).error?.status, 409);
  assert.equal(operationCommand(`/assessments/${second.id}/publish`, "POST"), "Staff.Publish"); assert.equal(operationCommand(`/assessments/${second.id}/unpublish`, "POST"), "Staff.Unpublish");
});
