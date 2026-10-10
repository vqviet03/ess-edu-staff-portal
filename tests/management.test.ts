import test from "node:test";
import assert from "node:assert/strict";
import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import { createMockAdapter } from "../src/mock/adapter";
import { seed, seedEmptyStudents, type Database } from "../src/mock/fixtures";
import { managementSeed } from "../src/mock/management-fixtures";
import { verifiedStaff, verifiedSession } from "../src/features/auth/contract";
import {
  capabilities,
  validWorkspace,
  workspaces,
} from "../src/features/access/capabilities";
import type { Teacher, Envelope, AuthSession } from "../src/types";
import type {
  BulkPreview,
  Enrollment,
  Entity,
  ManagedList,
  Impact,
  TeacherClassAssignment,
  ProfileDetail,
} from "../src/features/management/models";
import {
  profileWorkbook,
  readProfiles,
  columns,
} from "../src/features/management/excel-workbook";
function harness(initial = seed()) {
  let value = JSON.stringify(initial),
    token = "";
  const mock = createMockAdapter(
    {
      getItem: () => value,
      setItem: (_, v) => {
        value = v;
      },
    },
    0,
  );
  const runtime = {
    signal: new AbortController().signal,
    dispatch: () => {},
    getState: () => ({}),
    endpoint: "management",
    type: "query",
  } as unknown as BaseQueryApi;
  const request = async <T>(
    url: string,
    method = "GET",
    body?: unknown,
    key?: string,
  ) =>
    (await mock(
      {
        url,
        method,
        body,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(key ? { "Idempotency-Key": key } : {}),
        },
      },
      runtime,
      {},
    )) as {
      data?: Envelope<T>;
      error?: {
        status: number | string;
        data: { error: { message: string; code: string } };
      };
    };
  const data = async <T>(
    url: string,
    method = "GET",
    body?: unknown,
    key?: string,
  ) => {
    const r = await request<T>(url, method, body, key);
    assert(!r.error, JSON.stringify(r.error));
    return r.data!.data;
  };
  return {
    request,
    data,
    db: () => JSON.parse(value) as Database,
    login: async (id = "MG0001") => {
      const r = await data<AuthSession>("/auth/login", "POST", {
        teacherId: id,
        password: "Demo123!",
      });
      token = r.accessToken;
      return r;
    },
    preview: (
      entity: Entity,
      rows: Record<string, unknown>[],
      mode = "UPDATE",
    ) =>
      data<BulkPreview>("/manager/changes/preview", "POST", {
        entity,
        rows,
        mode,
      }),
    commit: (p: BulkPreview) =>
      data<{ updated: number }>(
        "/manager/changes/commit",
        "POST",
        {
          previewId: p.previewId,
          version: p.version,
          confirmations: p.requiredConfirmations,
          reason: "Kiểm thử thay đổi đã xác nhận",
        },
        `test-${p.previewId}`,
      ),
  };
}
test("đổi ID quản lý giữ enrollment/phân công, check trùng; tên lớp nhập tự do", async () => {
  const h = harness(); await h.login();
  const before = h.db().management!;
  const student = before.students[0], teacher = before.teachers.find(t => t.id === "GV0001")!, label = before.labels[0], room = before.classes.find(c => c.id === "class-green")!;
  for (const [entity, row, newId] of [["students", student, "student.new"], ["teachers", teacher, "teacher.new"], ["labels", label, "label.new"], ["classes", room, "class.new"]] as const) {
    const check = await h.data<{ isAvailable: boolean }>("/manager/identifiers/check", "POST", { entity, id: newId, excludeId: row.id }); assert(check.isAvailable);
    const preview = await h.preview(entity, [{ id: row.id, newId, version: row.version }]); assert.equal(preview.errors.length, 0, JSON.stringify(preview.errors)); assert.equal(preview.count, 1); await h.commit(preview);
    assert(h.db().management![entity].some(r => r.id === newId)); assert(!h.db().management![entity].some(r => r.id === row.id));
  }
  const after = h.db().management!; assert(after.enrollments.some(e => e.studentId === "student.new" && e.classId === "class.new")); assert(after.assignments.some(a => a.teacherId === "teacher.new" && a.classId === "class.new"));
  const edit = await h.preview("classes", [{ id: "class.new", name: "Tiếng Anh hè", code: "SUMMER", version: 2 }]); assert.equal(edit.errors.length, 0); await h.commit(edit); assert.equal(h.db().management!.classes.find(c => c.id === "class.new")?.name, "Tiếng Anh hè");
  const duplicate = await h.preview("students", [{ id: "student.new", newId: "teacher.new", version: 2 }]); assert(duplicate.errors.length);
});
test("audit phân trang đúng phạm vi và có tên/ID người thao tác", async () => {
  const initial = seed(); initial.management = managementSeed(initial);
  for (let i = 0; i < 25; i++) initial.management.audit.push({ id: String(i), at: new Date().toISOString(), actorId: "MG0001", entity: "materials", action: "DELETE", ids: ["f"], reason: "", changes: [] });
  const h = harness(initial); await h.login();
  const first = await h.data<{ items: import("../src/features/management/models").AuditEvent[]; total: number }>("/manager/audit?page=1&pageSize=10&search=Nguyễn Mai");
  const second = await h.data<typeof first>("/manager/audit?page=2&pageSize=10&search=Nguyễn Mai");
  assert.equal(first.total, 25); assert.equal(first.items.length, 10); assert.equal(first.items[0].actorUserId, "MG0001"); assert(first.items[0].actorName?.includes("Nguyễn Mai")); assert(!first.items.some(a => second.items.some(b => a.id === b.id)));
});
test("tên / tiền tố chỉ áp dụng sau quản lý khác đồng ý, không cho tự duyệt", async () => {
  const h = harness(); await h.login();
  const p = await h.data<{ id: string; status: string }>("/manager/settings/proposals", "POST", { appName: "Leaf", classIdPrefix: "leaf", version: 1, reason: "Tên mới" }); assert.equal(p.status, "PENDING");
  const own = await h.request(`/manager/settings/proposals/${p.id}/decision`, "POST", { decision: "APPROVED", version: 1 }); assert.equal(own.error?.status, 403);
  assert.equal((await h.data<import("../src/features/settings/models").ApplicationSettings>("/application-settings")).appName, "ESS");
  await h.login("BOTH0001");
  const decided = await h.data<{ status: string }>(`/manager/settings/proposals/${p.id}/decision`, "POST", { decision: "APPROVED", version: 1 }); assert.equal(decided.status, "APPLIED");
  const settings = await h.data<import("../src/features/settings/models").ApplicationSettings>("/application-settings"); assert.equal(settings.appName, "Leaf"); assert.equal(settings.version, 2);
  const check = await h.data<{ id: string }>("/manager/identifiers/suggest", "POST", { entity: "classes" }); assert(check.id.startsWith("leaf"));
});
test("ma trận quyền: role, trạng thái, workspace và phân công của chính lớp đều bắt buộc", () => {
  const base: Teacher = {
    id: "t",
    name: "Teacher",
    roles: ["TEACHER"],
    profileStatus: "ACTIVE",
    accountStatus: "ACTIVE",
  };
  const access = {
    classId: "c",
    canView: true,
    assignmentStatus: "ACTIVE" as const,
    classStatus: "ACTIVE" as const,
    profileStatus: "ACTIVE" as const,
    accountStatus: "ACTIVE" as const,
  };
  assert(capabilities(base, "teacher", access).editLearning);
  for (const profileStatus of ["PAUSED", "INACTIVE"] as const)
    assert(
      !capabilities({ ...base, profileStatus }, "teacher", access).editLearning,
    );
  for (const accountStatus of ["PENDING", "LOCKED"] as const)
    assert(
      !capabilities({ ...base, accountStatus }, "teacher", access).editLearning,
    );
  for (const classStatus of [
    "DRAFT",
    "PAUSED",
    "COMPLETED",
    "INACTIVE",
  ] as const)
    assert(
      !capabilities(base, "teacher", { ...access, classStatus }).editLearning,
    );
  for (const assignmentStatus of [null, "ENDED", "COMPLETED"] as const)
    assert(
      !capabilities({ ...base, roles: ["TEACHER", "MANAGER"] }, "teacher", {
        ...access,
        assignmentStatus,
      }).editLearning,
    );
  assert(
    !capabilities({ ...base, roles: ["MANAGER"] }, "teacher", access)
      .editLearning,
  );
  assert(
    !capabilities({ ...base, roles: ["TEACHER", "MANAGER"] }, "manager", access)
      .editLearning,
  );
  assert.deepEqual(workspaces(base), ["teacher"]);
  assert.equal(validWorkspace(base, "manager"), "teacher");
  assert(
    !capabilities(
      { ...base, profileStatus: undefined, accountStatus: undefined },
      "teacher",
      access,
    ).editLearning,
  );
});
test("mock kiểm tra quyền lại: manager và dual không được sửa phiên/schema/điểm lớp không phụ trách", async () => {
  const h = harness();
  await h.login();
  assert.equal(
    (await h.request("/classes/class-green/sessions", "POST", {})).error
      ?.status,
    403,
  );
  assert.equal(
    (await h.request("/assessments/assessment-seven", "PATCH", {})).error
      ?.status,
    403,
  );
  assert.equal(
    (
      await h.request("/assessments/assessment-seven/results/batch", "PATCH", {
        rows: [],
      })
    ).error?.status,
    403,
  );
  assert.equal(
    (await h.data<unknown[]>("/assessments/assessment-seven/results")).length,
    8,
  );
  await h.login("BOTH0001");
  assert.equal(
    (await h.request("/classes/class-green/sessions", "POST", {})).error
      ?.status,
    403,
  );
  await h.login("GV0001");
  assert.equal((await h.request("/manager/dashboard")).error?.status, 403);
  assert.equal((await h.request("/classes/class-empty")).error?.status, 403);
  assert.equal(
    (await h.request("/classes/class-sun/sessions", "POST", {})).error?.status,
    403,
  );
  assert.equal(
    (
      await h.request("/auth/login", "POST", {
        teacherId: "HV1001",
        password: "Demo123!",
      })
    ).error?.status,
    401,
  );
});
test("ngừng giảng viên: giữ điểm/lịch sử, lớp còn người không trống; restore không tự phân công", async () => {
  const h = harness();
  await h.login();
  const original = h.db().results,
    teacher = h.db().management!.teachers.find((t) => t.id === "GV0001")!;
  const p = await h.preview("teachers", [{ ...teacher, status: "INACTIVE" }]);
  assert.equal(p.impacts.length, 2);
  assert.equal(
    p.impacts.find((i) => i.classId === "class-green")?.afterUnstaffed,
    false,
  );
  assert.equal(
    p.impacts.find((i) => i.classId === "class-single")?.afterUnstaffed,
    true,
  );
  assert.equal(
    (
      await h.request(
        "/manager/changes/commit",
        "POST",
        { previewId: p.previewId, version: 1, confirmations: [], reason: "" },
        "missing-confirm",
      )
    ).error?.status,
    422,
  );
  await h.commit(p);
  assert.deepEqual(h.db().results, original);
  assert(
    (await h.data<Impact[]>("/manager/warnings")).some(
      (i) => i.classId === "class-single",
    ),
  );
  assert(
    !(await h.data<Impact[]>("/manager/warnings")).some(
      (i) => i.classId === "class-green",
    ),
  );
  const old = h
    .db()
    .management!.assignments.find(
      (a) => a.classId === "class-single" && a.teacherId === "GV0001",
    )!;
  assert.equal(old.status, "ENDED");
  assert(old.history.length >= 2);
  const restored = await h.preview("teachers", [
    {
      ...h.db().management!.teachers.find((t) => t.id === "GV0001"),
      status: "ACTIVE",
    },
  ]);
  await h.commit(restored);
  assert(
    (await h.data<Impact[]>("/manager/warnings")).some(
      (i) => i.classId === "class-single",
    ),
  );
  const assign = await h.data<BulkPreview>(
    "/manager/assignments/preview",
    "POST",
    {
      classId: old.classId,
      teacherId: old.teacherId,
      labelId: old.labelId,
      status: "ACTIVE",
      version: old.version,
    },
  );
  await h.commit(assign);
  const assignments = await h.data<TeacherClassAssignment[]>(
    "/manager/assignments?classId=class-single",
  );
  assert.equal(assignments.filter((a) => a.teacherId === "GV0001").length, 1);
  assert.equal(assignments.find((a) => a.teacherId === "GV0001")?.id, old.id);
  assert(
    !(await h.data<Impact[]>("/manager/warnings")).some(
      (i) => i.classId === "class-single",
    ),
  );
});
test("ngừng học sinh ẩn roster hiện tại, giữ điểm/ghi danh; restore cần xác nhận ghi danh riêng", async () => {
  const h = harness();
  await h.login();
  const student = h.db().management!.students[0],
    results = h.db().results;
  const p = await h.preview("students", [{ ...student, status: "INACTIVE" }]);
  assert.equal(p.impacts.length, 1);
  await h.commit(p);
  assert(
    !(await h.data<{ id: string }[]>("/classes/class-green/students")).some(
      (s) => s.id === student.id,
    ),
  );
  assert.deepEqual(h.db().results, results);
  assert(
    (
      await h.data<{ id: string }[]>(
        "/classes/class-green/students?includeHistory=true",
      )
    ).some((s) => s.id === student.id),
  );
  await h.commit(
    await h.preview("students", [
      { ...h.db().management!.students[0], status: "ACTIVE" },
    ]),
  );
  assert(
    !(await h.data<{ id: string }[]>("/classes/class-green/students")).some(
      (s) => s.id === student.id,
    ),
  );
  const e = h
      .db()
      .management!.enrollments.find((e) => e.studentId === student.id)!,
    restore = await h.data<BulkPreview>(
      "/manager/enrollments/preview",
      "POST",
      {
        classId: e.classId,
        studentId: e.studentId,
        status: "ACTIVE",
        version: e.version,
      },
    );
  await h.commit(restore);
  assert(
    (await h.data<{ id: string }[]>("/classes/class-green/students")).some(
      (s) => s.id === student.id,
    ),
  );
  assert.equal(
    h.db().management!.enrollments.find((e) => e.studentId === student.id)?.id,
    e.id,
  );
});
test("hoàn thành lớp: xác nhận ngoại lệ, ACTIVE → COMPLETED; lịch sử khác giữ, mở lại không tự cấp quyền", async () => {
  const h = harness();
  await h.login();
  const c = h.db().management!.classes.find((c) => c.id === "class-green")!,
    ended = h
      .db()
      .management!.assignments.find((a) => a.teacherId === "BOTH0001")!;
  const p = await h.preview("classes", [{ ...c, status: "COMPLETED" }]);
  assert(p.requiredConfirmations.includes("INCOMPLETE_CLASS"));
  await h.commit(p);
  assert(
    h
      .db()
      .management!.assignments.filter(
        (a) => a.classId === c.id && a.teacherId !== "BOTH0001",
      )
      .every((a) => a.status === "COMPLETED"),
  );
  assert.deepEqual(
    h.db().management!.assignments.find((a) => a.id === ended.id),
    ended,
  );
  await h.commit(
    await h.preview("classes", [
      {
        ...h.db().management!.classes.find((x) => x.id === c.id),
        status: "ACTIVE",
      },
    ]),
  );
  assert(
    (await h.data<Impact[]>("/manager/warnings")).some(
      (i) => i.classId === c.id,
    ),
  );
});
test("tổng Unit không thấp hơn Unit đã dùng, preview mẫu số; tiến độ không đếm trùng", async () => {
  const h = harness();
  await h.login();
  const c = h.db().management!.classes.find((c) => c.id === "class-green")!;
  const invalid = await h.preview("classes", [{ ...c, totalUnits: 2 }]);
  assert(invalid.errors.some((e) => e.column === "totalUnits"));
  const valid = await h.preview("classes", [{ ...c, totalUnits: 4 }]);
  assert(valid.warnings.some((w) => w.includes("2/8 → 2/4")));
  await h.commit(valid);
  const after = await h.data<ProfileDetail>("/manager/classes/class-green");
  assert("completedUnits" in after.record && after.record.completedUnits === 2);
});
test("bulk FILTER qua nhiều trang, exclusions, version conflict và idempotency; server không tin client diff", async () => {
  const h = harness();
  await h.login();
  const list = await h.data<ManagedList>(
    "/manager/students?page=1&pageSize=10",
  );
  assert(list.total > list.items.length);
  const request = {
    entity: "students",
    selection: {
      mode: "FILTER",
      filter: { status: "ACTIVE" },
      excludedIds: [list.items[0].id],
    },
    patch: { notes: "Ghi chú chung" },
    mode: "UPDATE",
  };
  const p = await h.data<BulkPreview>(
    "/manager/changes/preview",
    "POST",
    request,
  );
  assert.equal(p.count, list.total - 1);
  await h.commit(
    await h.preview("labels", [
      { ...h.db().management!.labels[0], notes: "Có người vừa sửa" },
    ]),
  );
  assert.equal(
    (
      await h.request(
        "/manager/changes/commit",
        "POST",
        { previewId: p.previewId, version: 1, confirmations: [], reason: "" },
        `test-${p.previewId}`,
      )
    ).error?.status,
    409,
  );
  const fresh = await h.data<BulkPreview>(
    "/manager/changes/preview",
    "POST",
    request,
  );
  await h.commit(fresh);
  const audit = h.db().management!.audit.length;
  assert.equal((await h.commit(fresh)).updated, list.total - 1);
  assert.equal(h.db().management!.audit.length, audit);
  assert.equal(
    h.db().management!.students.find((s) => s.id === list.items[0].id)?.notes,
    "",
  );
  assert(
    h
      .db()
      .management!.students.filter((s) => s.id !== list.items[0].id)
      .every((s) => s.notes === "Ghi chú chung"),
  );
});
test("không mất quản lý cuối cùng; bỏ TEACHER dùng cùng preview ảnh hưởng, không phân quyền bằng nhãn", async () => {
  const h = harness();
  await h.login();
  const m = h.db().management!,
    dual = m.accounts.find((a) => a.profileId === "BOTH0001")!;
  await h.commit(
    await h.preview("accounts", [{ ...dual, roles: ["TEACHER"] }]),
  );
  const last = await h.preview("teachers", [
    {
      ...h.db().management!.teachers.find((t) => t.id === "MG0001"),
      status: "INACTIVE",
    },
  ]);
  assert(last.errors.some((e) => e.message.includes("cuối cùng")));
  const teacher = h
      .db()
      .management!.accounts.find((a) => a.profileId === "GV0001")!,
    p = await h.preview("accounts", [{ ...teacher, roles: ["MANAGER"] }]);
  assert(p.requiredConfirmations.includes("ASSIGNMENT_IMPACT"));
  assert.equal(p.impacts.length, 2);
  await h.commit(p);
  assert(
    h
      .db()
      .management!.assignments.filter(
        (a) =>
          a.teacherId === "GV0001" &&
          a.classId !== "class-sun" &&
          a.classId !== "class-sky",
      )
      .every((a) => a.status === "ENDED"),
  );
});
test("template nhóm rỗng: header/schema/instructions, không import ví dụ; validate version/cột/nhóm", async () => {
  const { Workbook } = (await import("exceljs")).default,
    blob = await profileWorkbook("teachers", []),
    book = new Workbook();
  await book.xlsx.load(await blob.arrayBuffer());
  assert.deepEqual((await readProfiles(blob, "teachers")).rows, []);
  assert.equal(book.getWorksheet("Data")!.getCell("A2").value, null);
  assert.equal(
    book.getWorksheet("Data")!.getCell("A1").value,
    columns.teachers[0],
  );
  assert(book.getWorksheet("Instructions")!.rowCount > 5);
  await assert.rejects(() => readProfiles(blob, "students"), /Sai nhóm/);
  book.getWorksheet("Schema")!.getCell("B1").value = "99";
  await assert.rejects(
    async () =>
      readProfiles(
        new Blob([
          Uint8Array.from(new Uint8Array(await book.xlsx.writeBuffer())),
        ]),
        "teachers",
      ),
    /version/,
  );
});
test("Excel import hoạt động: blank giữ cũ, clear rõ ràng, tiếng Việt/xuống dòng và physical row errors", async () => {
  const h = harness();
  await h.login();
  const s = h.db().management!.students[0],
    { Workbook } = (await import("exceljs")).default;
  const book = new Workbook();
  await book.xlsx.load(
    await (await profileWorkbook("students", [{ ...s }])).arrayBuffer(),
  );
  const sheet = book.getWorksheet("Data")!;
  sheet.getCell("C2").value = "";
  sheet.getCell("G2").value = "Nhận xét tiếng Việt\nDòng hai";
  const body = new FormData();
  body.set(
    "file",
    new Blob([Uint8Array.from(new Uint8Array(await book.xlsx.writeBuffer()))]),
    "students.xlsx",
  );
  body.set("mode", "UPDATE");
  const p = await h.data<BulkPreview>(
    "/manager/students/excel/preview",
    "POST",
    body,
  );
  assert.equal(p.errors.length, 0);
  assert.equal(p.count, 1);
  await h.commit(p);
  assert.equal(h.db().management!.students[0].nickname, s.nickname);
  assert.equal(
    h.db().management!.students[0].notes,
    "Nhận xét tiếng Việt\nDòng hai",
  );
  body.set("clearFields", "nickname");
  await h.commit(
    await h.data<BulkPreview>("/manager/students/excel/preview", "POST", body),
  );
  assert.equal(h.db().management!.students[0].nickname, "");
  sheet.getCell("A6").value = s.id;
  sheet.getCell("F6").value = "INVALID";
  const parsed = await readProfiles(
    new Blob([Uint8Array.from(new Uint8Array(await book.xlsx.writeBuffer()))]),
    "students",
    "UPDATE",
  );
  assert(parsed.errors.some((e) => e.row === 6));
});
test("import đổi trạng thái không bỏ qua ảnh hưởng; tạo profile/account PENDING và link dùng một lần", async () => {
  const h = harness();
  await h.login();
  const teacher = h.db().management!.teachers.find((t) => t.id === "GV0001")!;
  const book = await profileWorkbook("teachers", [
      { ...teacher, status: "INACTIVE", roles: ["TEACHER"] },
    ]),
    body = new FormData();
  body.set("file", book, "teachers.xlsx");
  body.set("mode", "UPDATE");
  const p = await h.data<BulkPreview>(
    "/manager/teachers/excel/preview",
    "POST",
    body,
  );
  assert(p.requiredConfirmations.includes("ASSIGNMENT_IMPACT"));
  assert(p.impacts.length === 2);
  const create = await h.preview(
    "teachers",
    [
      {
        id: "GVTEST99",
        fullName: "Giảng viên mới",
        email: "new@example.com",
        phone: "",
        notes: "",
        status: "ACTIVE",
        roles: ["TEACHER"],
        createAccount: true,
      },
    ],
    "CREATE",
  );
  assert.equal(create.errors.length, 0);
  await h.commit(create);
  const account = h
    .db()
    .management!.accounts.find((a) => a.profileId === "GVTEST99")!;
  assert.equal(account.status, "PENDING");
  const link = await h.data<{ code: string }>(
    `/manager/accounts/${account.id}/activation`,
    "POST",
  );
  await h.data("/auth/activate", "POST", {
    code: link.code,
    password: "NewTeacher123!",
  });
  assert.equal(
    (
      await h.request("/auth/activate", "POST", {
        code: link.code,
        password: "NewTeacher123!",
      })
    ).error?.status,
    410,
  );
  const login = await h.data<AuthSession>("/auth/login", "POST", {
    teacherId: "GVTEST99",
    password: "NewTeacher123!",
  });
  assert(login.teacher.roles?.includes("TEACHER"));
  assert(!JSON.stringify(h.db()).includes("NewTeacher123!"));
});

test("legacy auth chỉ mở đọc; thiếu access / assignment chưa xác nhận không cấp quyền sửa", () => {
  const staff = verifiedStaff({
    id: "legacy",
    name: "Teacher",
    roles: ["TEACHER"],
  });
  assert.equal(staff.profileStatus, "ACTIVE");
  assert(!capabilities(staff, "teacher").editLearning);
  const access = {
    classId: "c",
    canView: true,
    assignmentStatus: "ACTIVE" as const,
    assignmentConfirmed: false,
    classStatus: "ACTIVE" as const,
    profileStatus: "ACTIVE" as const,
    accountStatus: "ACTIVE" as const,
  };
  assert(!capabilities(staff, "teacher", access).editLearning);
  assert.equal(
    verifiedStaff({ ...staff, profileStatus: "INACTIVE" }).profileStatus,
    "INACTIVE",
  );
  assert.equal(
    verifiedStaff({ id: "m", name: "Manager", roles: ["MANAGER"] })
      .profileStatus,
    undefined,
  );
  assert.throws(
    () =>
      verifiedSession({
        accessToken: "x",
        expiresAt: "2026-12-01T00:00:00Z",
        student: { id: "student" },
      } as unknown as AuthSession),
    /Staff/,
  );
});
test("tạm dừng rồi mở lại lớp vẫn chờ xác nhận phân công; nhãn ngừng không gắn mới", async () => {
  const h = harness();
  await h.login();
  let c = h.db().management!.classes.find((c) => c.id === "class-green")!;
  await h.commit(await h.preview("classes", [{ ...c, status: "PAUSED" }]));
  c = h.db().management!.classes.find((c) => c.id === "class-green")!;
  await h.commit(await h.preview("classes", [{ ...c, status: "ACTIVE" }]));
  await h.login("GV0001");
  assert.equal(
    (await h.request("/classes/class-green/sessions", "POST", {})).error
      ?.status,
    403,
  );
  await h.login();
  const a = h
    .db()
    .management!.assignments.find(
      (a) => a.teacherId === "GV0001" && a.classId === "class-green",
    )!;
  assert.equal(
    (
      await h.request("/manager/assignments/preview", "POST", {
        classId: a.classId,
        teacherId: a.teacherId,
        status: "ACTIVE",
        labelId: "label-old",
        version: a.version,
      })
    ).error?.status,
    422,
  );
  const p = await h.data<BulkPreview>("/manager/assignments/preview", "POST", {
    classId: a.classId,
    teacherId: a.teacherId,
    status: "ACTIVE",
    labelId: a.labelId,
    version: a.version,
  });
  await h.commit(p);
  await h.login("GV0001");
  assert.equal(
    (
      await h.data<{ assignmentConfirmed: boolean }>(
        "/classes/class-green/access",
      )
    ).assignmentConfirmed,
    true,
  );
});
test("fixture nhóm học sinh rỗng vẫn có manager; template trống .xlsx hoạt động", async () => {
  const h = harness(seedEmptyStudents());
  await h.login();
  assert.equal(
    (await h.data<ManagedList>("/manager/students?page=1&pageSize=10")).total,
    0,
  );
  const response = await h.request("/manager/students/excel/template");
  const blob = response.data as unknown as Blob;
  assert(blob instanceof Blob);
  assert.deepEqual((await readProfiles(blob, "students")).rows, []);
});
test("payload bulk sai bị từ chối; liên kết tài khoản phân biệt loại hồ sơ dù cùng ID", async () => {
  const db = seed();
  db.management = managementSeed(db);
  db.management!.students.push({
    ...db.management!.students[0],
    id: "GV0001",
    fullName: "Học sinh trùng ID hồ sơ Staff",
  });
  const h = harness(db);
  await h.login();
  for (const selection of [
    null,
    { mode: "IDS", ids: "HV1001" },
    { mode: "FILTER", filter: null, excludedIds: [] },
  ])
    assert.equal(
      (
        await h.request("/manager/selection/count", "POST", {
          entity: "students",
          selection,
        })
      ).error?.status,
      422,
    );
  assert.equal(
    (
      await h.request("/manager/changes/preview", "POST", {
        entity: "students",
        selection: { mode: "IDS", ids: ["HV1001"] },
        patch: { id: "HV1002" },
        mode: "UPDATE",
      })
    ).error?.status,
    422,
  );
  assert.equal(
    (await h.data<ProfileDetail>("/manager/students/GV0001")).accounts.length,
    0,
  );
  assert.equal(
    (await h.data<ProfileDetail>("/manager/teachers/GV0001")).accounts[0].kind,
    "STAFF",
  );
});

test("ngày tham gia: preview/commit cập nhật giai đoạn hiện tại, giữ ID và không thêm lịch sử giả", async () => {
  const h = harness();
  await h.login("MG0001");
  const original = structuredClone(
    h.db().management!.enrollments.find((e) => e.status === "ACTIVE")!,
  );
  const joinedOn = "2026-01-01";
  const body = {
    classId: original.classId,
    studentId: original.studentId,
    status: original.status,
    version: original.version,
    joinedOn,
  };
  const preview = await h.data<BulkPreview>(
    "/manager/enrollments/preview",
    "POST",
    body,
  );
  await h.commit(preview);
  const updated = h
    .db()
    .management!.enrollments.find((e) => e.id === original.id)!;
  assert.equal(updated.joinedOn, joinedOn);
  assert.equal(updated.history.length, original.history.length);
  assert.equal(updated.history.at(-1)!.startAt, "2025-12-31T17:00:00.000Z");
  const stale = await h.request("/manager/enrollments/preview", "POST", body);
  assert(stale.error);
  for (const day of ["1990-01-01", "2099-01-01"]) {
    const current = h.db().management!.enrollments.find((e) => e.id === original.id)!;
    const next = await h.data<BulkPreview>("/manager/enrollments/preview", "POST", {
      ...body, version: current.version, joinedOn: day,
    });
    await h.commit(next);
    const saved = h.db().management!.enrollments.find((e) => e.id === original.id)!;
    assert.equal(saved.joinedOn, day);
    assert.equal(saved.history.length, original.history.length);
    assert.equal(saved.status, original.status);
  }
});
