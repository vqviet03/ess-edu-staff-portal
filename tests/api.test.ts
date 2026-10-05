import test from "node:test";
import assert from "node:assert/strict";
import type { BaseQueryApi, FetchArgs } from "@reduxjs/toolkit/query";
import { createMockAdapter, MOCK_KEY } from "../src/mock/adapter";
import { createAppBaseQuery } from "../src/api/base-query";
import { seed, type Database } from "../src/mock/fixtures";
import type {
  AuthSession,
  Envelope,
  Class,
  ImportPreview,
  BatchResponse,
} from "../src/types";
const teacher = { id: "GV0001", name: "Demo" };
function harness() {
  let value = JSON.stringify(seed());
  const storage = {
      getItem: () => value,
      setItem: (_: string, next: string) => {
        value = next;
      },
    },
    actions: unknown[] = [];
  const runtime = {
    signal: new AbortController().signal,
    abort: () => {},
    dispatch: (a: unknown) => {
      actions.push(a);
      return a;
    },
    getState: () => ({
      auth: { session: null, status: "guest", message: null },
    }),
    extra: undefined,
    endpoint: "test",
    type: "query",
  } as BaseQueryApi;
  const mock = createMockAdapter(storage, 0);
  let token = "";
  return {
    runtime,
    actions,
    db: () => JSON.parse(value) as Database,
    write: (db: Database) => storage.setItem(MOCK_KEY, JSON.stringify(db)),
    request: async <T>(
      url: string,
      method = "GET",
      body?: unknown,
      headers?: HeadersInit,
    ) => {
      const h = new Headers(headers);
      if (token) h.set("Authorization", "Bearer " + token);
      return (await mock({ url, method, body, headers: h }, runtime, {})) as {
        data?: Envelope<T>;
        error?: { status: number | string; data?: unknown };
      };
    },
    login: async () => {
      const r = await mock(
        {
          url: "/auth/login",
          method: "POST",
          body: { teacherId: "GV0001", password: "Demo123!" },
        },
        runtime,
        {},
      );
      token = (r.data as Envelope<AuthSession>).data.accessToken;
      return token;
    },
  };
}
test("login sai, link hết hạn / dùng một lần, token hết hạn", async () => {
  const h = harness();
  assert.equal(
    (
      await h.request("/auth/login", "POST", {
        teacherId: "bad",
        password: "wrong",
      })
    ).error?.status,
    401,
  );
  assert.equal(
    (await h.request("/auth/link/exchange", "POST", { code: "expired-demo" }))
      .error?.status,
    410,
  );
  assert.ok(
    (await h.request("/auth/link/exchange", "POST", { code: "teacher-demo" }))
      .data,
  );
  assert.equal(
    (await h.request("/auth/link/exchange", "POST", { code: "teacher-demo" }))
      .error?.status,
    410,
  );
  const token = await h.login(),
    db = h.db();
  db.tokens[token].expiresAt = "2000-01-01T00:00:00Z";
  h.write(db);
  assert.equal((await h.request("/auth/me")).error?.status, 401);
});
test("tạo phiên nháp không tăng tiến độ; Unit trùng không đếm lại", async () => {
  const h = harness();
  await h.login();
  const before = (await h.request<Class>("/classes/class-green")).data!.data
    .completedUnits;
  const created = await h.request("/classes/class-green/sessions", "POST", {
    name: "Buổi mới",
    unitNumber: 3,
    date: "2026-10-03",
    note: "",
    status: "DRAFT",
  });
  assert.ok(created.data);
  assert.equal(
    (await h.request<Class>("/classes/class-green")).data!.data.completedUnits,
    before,
  );
  assert.equal(before, 2);
});
test("batch chỉ cập nhật dòng hợp lệ, conflict riêng dòng, payload sai trả 422", async () => {
  const h = harness();
  await h.login();
  const rows = structuredClone(h.db().results["assessment-seven"]);
  rows[0].overallComment = "Mới";
  rows[1].version = 99;
  const r = await h.request<BatchResponse>(
    "/assessments/assessment-seven/results/batch",
    "PATCH",
    { rows: rows.slice(0, 2) },
  );
  assert.equal(r.data!.data.saved.length, 1);
  assert.ok(r.data!.data.rowErrors[rows[1].studentId]);
  assert.equal(h.db().results["assessment-seven"][2].version, rows[2].version);
  const malformed = {
    ...rows[0],
    version: rows[0].version + 1,
    skillResults: [{ skillCode: "VOCABULARY", score: "bad" }],
  };
  assert.equal(
    (
      await h.request(
        "/assessments/assessment-seven/results/" + rows[0].studentId,
        "PUT",
        malformed,
      )
    ).error?.status,
    422,
  );
});
test("sửa học sinh / schema có version và không nhận giới hạn xung đột", async () => {
  const h = harness();
  await h.login();
  const db = h.db(),
    s = db.students["class-green"][0];
  assert.equal(
    (
      await h.request("/classes/class-green/students/" + s.id, "PATCH", {
        ...s,
        name: "Đổi tên",
      })
    ).data !== undefined,
    true,
  );
  assert.equal(
    (await h.request("/classes/class-green/students/" + s.id, "PATCH", s)).error
      ?.status,
    409,
  );
  const a = db.assessments[0];
  assert.equal(
    (
      await h.request("/assessments/" + a.id, "PATCH", {
        ...a,
        skills: a.skills.map((s) => ({ ...s, maxQuestions: 1 })),
        confirmSchemaChange: true,
      })
    ).error?.status,
    422,
  );
});
test("import nguyên tử khi version đổi; idempotency không cập nhật hai lần", async () => {
  const h = harness();
  await h.login();
  const db = h.db(),
    a = db.assessments[0],
    rows = db.results[a.id],
    changes = rows
      .slice(0, 2)
      .map((r) => ({
        studentId: r.studentId,
        before: structuredClone(r),
        after: { ...structuredClone(r), overallAdvice: "Mới" },
      }));
  const p: ImportPreview = {
    previewId: "p",
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    errors: [],
    mode: "MERGE_NON_EMPTY",
    changes,
  };
  db.previews.p = {
    preview: p,
    assessmentId: a.id,
    schemaVersion: a.schemaVersion,
  };
  db.results[a.id][1].version++;
  h.write(db);
  const body = { previewId: "p", mode: p.mode };
  assert.equal(
    (
      await h.request("/assessments/" + a.id + "/import/commit", "POST", body, {
        "Idempotency-Key": "x",
      })
    ).error?.status,
    409,
  );
  assert.equal(h.db().results[a.id][0].version, rows[0].version);
  const fresh = h.db();
  fresh.results[a.id][1].version--;
  h.write(fresh);
  assert.ok(
    (
      await h.request("/assessments/" + a.id + "/import/commit", "POST", body, {
        "Idempotency-Key": "x",
      })
    ).data,
  );
  const version = h.db().results[a.id][0].version;
  await h.request("/assessments/" + a.id + "/import/commit", "POST", body, {
    "Idempotency-Key": "x",
  });
  assert.equal(h.db().results[a.id][0].version, version);
  assert.equal(
    (
      await h.request(
        "/assessments/" + a.id + "/import/commit",
        "POST",
        { ...body, previewId: "other" },
        { "Idempotency-Key": "x" },
      )
    ).error?.status,
    409,
  );
});
test("real gọi URL thật + Bearer, thiếu URL không fallback, 401 xóa phiên/cache, 403 giữ phiên", async () => {
  const h = harness(),
    session = {
      accessToken: "test-token",
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      teacher,
    };
  h.runtime.getState = () => ({
    auth: { session, status: "authenticated", message: null },
  });
  let seen: Request | undefined,
    status = 200,
    calls = 0;
  const query = createAppBaseQuery({
    mock: false,
    url: "https://example.test/v1",
    fetchFn: async (request) => {
      seen = request as Request;
      calls++;
      return new Response(
        JSON.stringify(
          status === 200
            ? { data: teacher }
            : { error: { code: "ERROR", message: "Error" } },
        ),
        { status, headers: { "Content-Type": "application/json" } },
      );
    },
  });
  await query("/auth/me", h.runtime, {});
  assert.equal(seen!.url, "https://example.test/v1/auth/me");
  assert.equal(seen!.headers.get("Authorization"), "Bearer test-token");
  status = 403;
  await query("/auth/me", h.runtime, {});
  assert.equal(h.actions.length, 0);
  status = 401;
  await query("/auth/me", h.runtime, {});
  assert.deepEqual(
    h.actions.map((a) => (a as { type: string }).type),
    ["auth/signedOut", "staffApi/resetApiState"],
  );
  const missing = createAppBaseQuery({
    mock: false,
    fetchFn: async () => {
      throw new Error("Must not call");
    },
  });
  assert.ok((await missing("/auth/me", h.runtime, {})).error);
  assert.equal(calls, 3);
});
test("mock mode không gọi API thật và dữ liệu rỗng được hỗ trợ", async () => {
  const h = harness();
  await h.login();
  const db = h.db();
  db.classes = [];
  h.write(db);
  h.runtime.getState = () => ({auth: {session: {accessToken: "demo-test", expiresAt: new Date(Date.now() + 60000).toISOString(), teacher}, status: "authenticated", message: null}});
  const query = createAppBaseQuery({
    mock: true,
    mockAdapter: async (args) =>
      h.request((args as FetchArgs).url) as ReturnType<
        ReturnType<typeof createMockAdapter>
      >,
    fetchFn: async () => {
      throw new Error("Must not call");
    },
  });
  const response = await query("/classes", h.runtime, {});
  assert.ok(response.data);
  const list = await h.request<Class[]>("/classes");
  assert.deepEqual(list.data!.data, []);
});
