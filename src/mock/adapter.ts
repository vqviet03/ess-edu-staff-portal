import { sessionExpiry } from "@/features/management/session-duration";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import {
  type Assessment,
  type Class,
  type StudentResult,
  type AuthSession,
  type ImportPreview,
} from "@/types";
import {
  calculate,
  completedUnitNumbers,
  emptyResult,
  resultInput,
  schemaInput,
  sessionInput,
  studentInput,
  validateResult,
} from "@/utils/scores";
import { seed, type Database } from "./fixtures";
import {
  management,
  actor,
  assertLearning,
  accessFor,
  managementRequest,
  ManagementError,
} from "./management-engine";
import { accountStaff } from "@/features/management/models";
import { requestHeaders } from "@/api/headers";
import { businessMutation } from "@/features/operations/models";
import { publicOperation, operationCommand, operationEntities } from "./operations";
import { capabilities } from "@/features/access/capabilities";
export const MOCK_KEY = "learnleaf.staff.mock.v1";
interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
class MockFailure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>,
    public rowErrors?: Record<string, string>,
  ) {
    super(message);
  }
}
const fail = (status: number, code: string, message: string): never => {
  throw new MockFailure(status, code, message);
};
const checked = <T>(
  parser: {
    safeParse(value: unknown):
      | { success: true; data: T }
      | {
          success: false;
          error: { issues: { path: PropertyKey[]; message: string }[] };
        };
  },
  value: unknown,
): T => {
  const p = parser.safeParse(value);
  if (!p.success)
    throw new MockFailure(
      422,
      "VALIDATION_ERROR",
      "Dữ liệu không hợp lệ.",
      Object.fromEntries(
        p.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    );
  return p.data;
};
const id = () => crypto.randomUUID();
const passwordHash = async (value: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail(422, "INVALID_BODY", "Payload không hợp lệ.");
  return value as Record<string, unknown>;
}
export function createMockAdapter(
  storage?: StoragePort,
  delay = 130,
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  let memory: Database | undefined,
    queue: Promise<unknown> = Promise.resolve();
  const read = () => {
    const port =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    if (port) {
      const raw = port.getItem(MOCK_KEY);
      if (raw) {
        try {
          return JSON.parse(raw) as Database;
        } catch {
          throw new MockFailure(
            500,
            "MOCK_STORAGE",
            "Dữ liệu demo bị lỗi. Dùng nút reset demo.",
          );
        }
      }
    }
    return memory ?? seed();
  };
  const save = (db: Database) => {
    const port =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    port?.setItem(MOCK_KEY, JSON.stringify(db));
    memory = db;
  };
  const handler = async (
    args: string | FetchArgs,
    api: Parameters<BaseQueryFn>[1],
  ) => {
    if (delay) await new Promise<void>((resolve) => setTimeout(resolve, delay));
    if (api.signal.aborted)
      return {
        error: { status: "CUSTOM_ERROR" as const, error: "Yêu cầu đã hủy" },
      };
    const req = typeof args === "string" ? { url: args } : args,
      path = req.url.split("?")[0],
      method = req.method ?? "GET",
      body = req.body as unknown;
    try {
      if (path === "/demo/reset" && method === "POST") {
        save(seed());
        return { data: { data: { reset: true } } };
      }
      const db = structuredClone(read());
      const managed = management(db);
      const headers = requestHeaders(req.headers);
      const token = headers.get("Authorization")?.replace(/^Bearer /, "");
      const envelope = (data: unknown, meta?: unknown) => ({
        data: { data, ...(meta ? { meta } : {}) },
      });
      if (path === "/auth/login" && method === "POST") {
        const b = object(body);
        const account = managed.accounts.find(
          (a) =>
            a.loginId === b.teacherId &&
            a.kind === "STAFF" &&
            a.status === "ACTIVE",
        );
        const profile = managed.teachers.find(
          (t) => t.id === account?.profileId && t.status === "ACTIVE",
        );
        if (
          !account ||
          !profile ||
          (managed.passwordHashes?.[account.id]
            ? (await passwordHash(String(b.password))) !==
              managed.passwordHashes[account.id]
            : b.password !==
              (["GV0001", "MG0001", "BOTH0001", "GV0002"].includes(
                account.loginId,
              )
                ? "Demo123!"
                : null))
        )
          return fail(
            401,
            "INVALID_CREDENTIALS",
            "ID giảng viên hoặc mật khẩu không đúng.",
          );
        const session: AuthSession = {
          accessToken: `demo-${id()}`,
          expiresAt: sessionExpiry(new Date().toISOString(), account.sessionDuration, account.sessionLifetimeMinutes ?? 60),
          teacher: accountStaff(account!, profile!),
        };
        const history = management(db); history.loginHistory ??= [];
        if (account) history.loginHistory.push({ accountId: account.id, loggedInAt: new Date().toISOString(), expiresAt: session.expiresAt, revokedAt: null, ipAddress: null, device: "Thiết bị demo", browser: "Trình duyệt demo", operatingSystem: null });
        db.tokens[session.accessToken] = session;
        save(db);
        return envelope(session);
      }
      if (path === "/auth/link/exchange" && method === "POST") {
        const code = object(body).code;
        if (code === "expired-demo")
          return fail(410, "CODE_EXPIRED", "Liên kết đã hết hạn.");
        if (
          !["teacher-demo", "manager-demo", "dual-demo"].includes(String(code))
        )
          return fail(400, "INVALID_CODE", "Mã đăng nhập không hợp lệ.");
        if (db.usedCodes.includes(String(code)))
          return fail(410, "CODE_USED", "Liên kết đã được sử dụng.");
        db.usedCodes.push(String(code));
        const teacher = actor(db, code === "manager-demo" ? "MG0001" : code === "dual-demo" ? "BOTH0001" : "GV0001");
        const account = management(db).accounts.find((a) => a.kind === "STAFF" && a.profileId === teacher.id);
        const session: AuthSession = {
          accessToken: `demo-${id()}`,
          expiresAt: sessionExpiry(new Date().toISOString(), account?.sessionDuration, account?.sessionLifetimeMinutes ?? 60),
          teacher: actor(
            db,
            code === "manager-demo"
              ? "MG0001"
              : code === "dual-demo"
                ? "BOTH0001"
                : "GV0001",
          ),
        };
        const history = management(db); history.loginHistory ??= [];
        if (account) history.loginHistory.push({ accountId: account.id, loggedInAt: new Date().toISOString(), expiresAt: session.expiresAt, revokedAt: null, ipAddress: null, device: "Thiết bị demo", browser: "Trình duyệt demo", operatingSystem: null });
        db.tokens[session.accessToken] = session;
        save(db);
        return envelope(session);
      }
      if (path === "/auth/activate" && method === "POST") {
        const b = object(body),
          item = managed.activations[String(b.code)];
        if (!item || item.used || Date.parse(item.expiresAt) <= Date.now())
          return fail(
            410,
            "ACTIVATION_EXPIRED",
            "Link không hợp lệ, hết hạn hoặc đã dùng.",
          );
        if (
          typeof b.password !== "string" ||
          b.password.length < 10 ||
          b.password.length > 128
        )
          return fail(422, "PASSWORD_INVALID", "Mật khẩu từ 10 đến 128 ký tự.");
        const account = managed.accounts.find((a) => a.id === item.accountId)!;
        if (account.status === "LOCKED")
          return fail(403, "ACCOUNT_LOCKED", "Tài khoản bị khóa.");
        item.used = true;
        account.status = "ACTIVE";
        account.updatedAt = new Date().toISOString();
        account.version++;
        managed.revision++;
        for (const [jwt, session] of Object.entries(db.tokens))
          if (
            account.kind === "STAFF" &&
            session.teacher.id === account.profileId
          )
            delete db.tokens[jwt];
        managed.audit.unshift({
          id: id(),
          at: account.updatedAt,
          actorId: account.profileId,
          action: "ACCOUNT_ACTIVATED",
          entity: "accounts",
          ids: [account.id],
          reason: "Kích hoạt qua link dùng một lần",
          changes: [{ id: account.id, fields: ["status"] }],
        });
        (managed.passwordHashes ??= {})[account.id] = await passwordHash(
          b.password,
        );
        save(db);
        return envelope({ activated: true });
      }
      if (
        !token ||
        !db.tokens[token] ||
        Date.parse(db.tokens[token].expiresAt) <= Date.now()
      )
        return fail(401, "UNAUTHORIZED", "Phiên đăng nhập đã hết hạn.");
      const staff = actor(db, db.tokens[token].teacher.id);
      if (path === "/auth/me") return envelope(staff);
      const managedResponse = await managementRequest(
        db,
        staff,
        { ...req, headers },
        save,
      );
      if (managedResponse) return managedResponse;
      const accessMatch = path.match(/^\/classes\/([^/]+)\/access$/);
      if (accessMatch)
        return envelope(
          accessFor(db, staff, decodeURIComponent(accessMatch[1])),
        );
      const learningSave = () => {
        managed.revision++;
        save(db);
      };

      if (path === "/auth/logout" && method === "POST") {
        const loggedOut = db.tokens[token];
        const accountId = management(db).accounts.find((a) => a.kind === "STAFF" && a.profileId === loggedOut?.teacher.id)?.id;
        for (const entry of management(db).loginHistory ?? []) if (entry.accountId === accountId && entry.expiresAt === loggedOut?.expiresAt && !entry.revokedAt) entry.revokedAt = new Date().toISOString();
        delete db.tokens[token];
        save(db);
        return envelope({ loggedOut: true });
      }
      const classView = (c: Class) => ({
        ...c,
        studentCount: db.students[c.id]?.length ?? 0,
        completedUnits: completedUnitNumbers(
          db.sessions.filter((s) => s.classId === c.id),
        ).length,
      });
      const classCheck = (classId: string) => {
        assertLearning(db, staff, classId);
        return (
          db.classes.find((c) => c.id === classId) ??
          fail(404, "NOT_FOUND", "Lớp không tồn tại.")
        );
      };
      const sessionCheck = (sessionId: string) => {
        const s =
          db.sessions.find((s) => s.id === sessionId) ??
          fail(404, "NOT_FOUND", "Phiên học không tồn tại.");
        classCheck(s.classId);
        return s;
      };
      const assessmentCheck = (assessmentId: string) => {
        const a =
          db.assessments.find((a) => a.id === assessmentId) ??
          fail(404, "NOT_FOUND", "Bài đánh giá không tồn tại.");
        sessionCheck(a.sessionId);
        return a;
      };
      if (path === "/classes") {
        const p = new URLSearchParams(req.url.split("?")[1]);
        const page = Math.max(1, Number(p.get("page")) || 1),
          pageSize = Math.min(
            100,
            Math.max(1, Number(p.get("pageSize")) || 10),
          );
        const search = p.get("search")?.toLocaleLowerCase("vi") ?? "",
          status = p.get("status");
        const rows = db.classes.filter(
          (c) =>
            accessFor(db, staff, c.id).canView &&
            (p.get("workspace") !== "teacher" ||
              managed.assignments.some(
                (a) => a.teacherId === staff.id && a.classId === c.id,
              )) &&
            (!status || c.status === status) &&
            `${c.name} ${c.code}`.toLocaleLowerCase("vi").includes(search),
        );
        return envelope(
          rows.slice((page - 1) * pageSize, page * pageSize).map(classView),
          { page, pageSize, total: rows.length },
        );
      }
      let m = path.match(/^\/classes\/([^/]+)$/);
      if (m) return envelope(classView(classCheck(decodeURIComponent(m[1]))));
      m = path.match(/^\/classes\/([^/]+)\/students(?:\/([^/]+))?$/);
      if (m) {
        const c = classCheck(decodeURIComponent(m[1])),
          students = db.students[c.id];
        if (method === "GET") {
          if (
            new URLSearchParams(req.url.split("?")[1]).get("includeHistory") ===
            "true"
          )
            return envelope(
              managed.enrollments
                .filter((e) => e.classId === c.id)
                .flatMap((e) => {
                  const p = managed.students.find((s) => s.id === e.studentId);
                  return p
                    ? [
                        {
                          id: p.id,
                          name: p.fullName,
                          nickname: p.nickname,
                          dateOfBirth: p.dateOfBirth,
                          status: e.status === "ACTIVE" ? p.status : "INACTIVE",
                          version: p.version,
                        },
                      ]
                    : [];
                }),
            );
          return envelope(students);
        }
        assertLearning(db, staff, c.id, true);
        const b = object(body),
          student =
            students.find((s) => s.id === m![2]) ??
            fail(404, "NOT_FOUND", "Học sinh không tồn tại.");
        if (b.version !== student.version)
          return fail(
            409,
            "VERSION_CONFLICT",
            "Thông tin học sinh đã thay đổi. Tải lại trước khi sửa.",
          );
        if (b.status !== student.status)
          return fail(
            422,
            "STATUS_PREVIEW_REQUIRED",
            "Đổi trạng thái học sinh phải dùng luồng quản lý preview/commit.",
          );
        const parsed = checked(studentInput, {
          ...b,
          dateOfBirth: b.dateOfBirth ?? "",
        });
        Object.assign(student, {
          ...parsed,
          dateOfBirth: parsed.dateOfBirth || null,
          version: student.version + 1,
        });
        const profile = managed.students.find((s) => s.id === student.id);
        if (profile)
          Object.assign(profile, {
            fullName: student.name,
            nickname: student.nickname,
            dateOfBirth: student.dateOfBirth,
            version: student.version,
            updatedAt: new Date().toISOString(),
          });
        for (const list of Object.values(db.students))
          for (const linked of list)
            if (linked.id === student.id) Object.assign(linked, student);
        learningSave();
        return envelope(student);
      }
      m = path.match(/^\/classes\/([^/]+)\/sessions$/);
      if (m) {
        const c = classCheck(m[1]);
        if (method === "GET")
          return envelope(db.sessions.filter((s) => s.classId === c.id));
        assertLearning(db, staff, c.id, true);
        const parsed = checked(sessionInput, body);
        if (parsed.status !== "DRAFT")
          return fail(
            422,
            "INVALID_STATUS",
            "Phiên mới phải ở trạng thái nháp.",
          );
        if (parsed.unitNumber && parsed.unitNumber > c.totalUnits)
          return fail(422, "INVALID_UNIT", "Unit vượt số Unit của lớp.");
        const s = { ...parsed, id: id(), classId: c.id, version: 1 };
        db.sessions.push(s);
        learningSave();
        return envelope(s);
      }
      m = path.match(/^\/sessions\/([^/]+)$/);
      if (m && method === "PATCH") {
        const s = sessionCheck(m[1]),
          b = object(body);
        if (b.version !== s.version)
          return fail(
            409,
            "VERSION_CONFLICT",
            "Phiên đã thay đổi. Tải lại trước khi sửa.",
          );
        assertLearning(db, staff, s.classId, true);
        const parsed = checked(sessionInput, { ...s, ...b });
        if (
          parsed.unitNumber &&
          parsed.unitNumber > classCheck(s.classId).totalUnits
        )
          return fail(422, "INVALID_UNIT", "Unit vượt số Unit của lớp.");
        Object.assign(s, parsed, { version: s.version + 1 });
        learningSave();
        return envelope(s);
      }
      m = path.match(/^\/sessions\/([^/]+)\/assessments$/);
      if (m) {
        const s = sessionCheck(m[1]);
        if (method === "GET")
          return envelope(db.assessments.filter((a) => a.sessionId === s.id));
        assertLearning(db, staff, s.classId, true);
        const parsed = checked(schemaInput, body),
          a: Assessment = {
            ...parsed,
            id: id(),
            sessionId: s.id,
            status: "DRAFT",
            version: 1,
            schemaVersion: 1,
          };
        db.assessments.push(a);
        db.results[a.id] = db.students[s.classId].map((student) =>
          emptyResult(student.id, a.skills),
        );
        learningSave();
        return envelope(a);
      }
      m = path.match(/^\/assessments\/([^/]+)\/(publication|publish|unpublish)$/);
      if (m) {
        const a = assessmentCheck(m[1]), s = sessionCheck(a.sessionId);
        const key = `${s.classId}:${s.unitNumber}`;
        const source = db.publications?.[key];
        if (m[2] === "publication" && method === "GET") return envelope({ unitId: s.unitNumber === null ? null : `unit-${s.classId}-${s.unitNumber}`, unitNumber: s.unitNumber, isPublished: source?.assessmentId === a.id, sourceAssessmentId: source?.assessmentId ?? null, publishedAt: source?.publishedAt ?? null });
        if (method !== "POST" || m[2] === "publication") return fail(405, "METHOD_NOT_ALLOWED", "Phương thức không hợp lệ.");
        assertLearning(db, staff, s.classId, true);
        if (object(body).version !== a.version) return fail(409, "VERSION_CONFLICT", "Bài đánh giá đã thay đổi. Tải lại trước khi công bố.");
        if (s.unitNumber === null) return fail(422, "VALIDATION_ERROR", "Phiên cần liên kết Unit để công bố.");
        db.publications ??= {};
        const publish = m[2] === "publish";
        if (publish) {
          if (a.status !== "COMPLETED") return fail(409, "ASSESSMENT_LOCKED", "Chỉ công bố bài đánh giá đã hoàn thành.");
          const rows = db.results[a.id].filter(r => db.students[s.classId].some(student => student.id === r.studentId && student.status === "ACTIVE"));
          if (rows.some(r => r.attendance === "UNSET" || (r.attendance === "PRESENT" && !calculate(r, a.skills).complete))) return fail(422, "INCOMPLETE_RESULTS", "Bài còn điểm chưa hoàn tất.");
          db.publications[key] = { assessmentId: a.id, publishedAt: new Date().toISOString(), results: structuredClone(rows), skills: structuredClone(a.skills) };
        } else {
          if (source?.assessmentId !== a.id) return fail(409, "VALIDATION_ERROR", "Bài này chưa được công bố.");
          delete db.publications[key];
        }
        a.version++; learningSave(); return envelope({ published: publish });
      }
      m = path.match(/^\/assessments\/([^/]+)$/);
      if (m) {
        const a = assessmentCheck(m[1]);
        if (method === "GET") return envelope(a);
        assertLearning(db, staff, sessionCheck(a.sessionId).classId, true);
        if (Object.values(db.publications ?? {}).some(p => p.assessmentId === a.id)) return fail(409, "PUBLISHED_ASSESSMENT", "Gỡ công bố báo cáo trước khi sửa bài đánh giá.");
        const b = object(body);
        if (b.version !== a.version || b.schemaVersion !== a.schemaVersion)
          return fail(
            409,
            "VERSION_CONFLICT",
            "Bài đánh giá đã thay đổi. Tải lại trước khi sửa.",
          );
        const parsed = checked(schemaInput, { ...a, ...b }),
          changed = JSON.stringify(parsed.skills) !== JSON.stringify(a.skills);
        const results = db.results[a.id];
        if (changed) {
          if (a.status === "COMPLETED")
            return fail(
              403,
              "ASSESSMENT_LOCKED",
              "Chuyển về nháp trước khi sửa schema.",
            );
          if (
            results.some((r) => r.skillResults.some((s) => s.score !== null)) &&
            b.confirmSchemaChange !== true
          )
            return fail(
              422,
              "SCHEMA_CONFIRM_REQUIRED",
              "Xác nhận tác động thay đổi schema.",
            );
          const invalid = results.flatMap((r) =>
            r.skillResults
              .filter((r) => r.score !== null)
              .filter((r) => {
                const n = parsed.skills.find(
                  (s) => s.skillCode === r.skillCode,
                );
                return (
                  n &&
                  (r.score! > n.maxQuestions ||
                    (!n.allowDecimal && !Number.isInteger(r.score)))
                );
              }),
          );
          if (invalid.length)
            return fail(
              422,
              "SCHEMA_SCORE_CONFLICT",
              "Sửa điểm vượt giới hạn mới trước khi lưu schema.",
            );
          results.forEach((r) => {
            r.skillResults = parsed.skills.map(
              (s) =>
                r.skillResults.find((r) => r.skillCode === s.skillCode) ?? {
                  skillCode: s.skillCode,
                  score: null,
                  comment: "",
                  advice: "",
                },
            );
            r.version++;
          });
          a.schemaVersion++;
        }
        const nextStatus = b.status ?? a.status;
        if (!["DRAFT", "COMPLETED"].includes(String(nextStatus)))
          return fail(422, "INVALID_STATUS", "Trạng thái không hợp lệ.");
        if (
          nextStatus === "COMPLETED" &&
          results.some(
            (r) =>
              r.attendance !== "ABSENT" &&
              !calculate(r, parsed.skills).complete,
          )
        )
          return fail(
            422,
            "INCOMPLETE_RESULTS",
            "Cần nhập đủ điểm hoặc xác nhận vắng cho từng học sinh.",
          );
        Object.assign(a, parsed, {
          status: nextStatus,
          version: a.version + 1,
        });
        learningSave();
        return envelope(a);
      }
      m = path.match(/^\/assessments\/([^/]+)\/results(?:\/(.+))?$/);
      if (m) {
        const a = assessmentCheck(m[1]),
          s = sessionCheck(a.sessionId),
          rows = db.results[a.id];
        if (method === "GET") return envelope(rows);
        assertLearning(db, staff, s.classId, true);
        if (a.status === "COMPLETED")
          return fail(
            403,
            "ASSESSMENT_LOCKED",
            "Chuyển bài đánh giá về nháp trước khi sửa điểm.",
          );
        const apply = (input: unknown) => {
          const r = checked(resultInput(a), input);
          if (
            !db.students[s.classId].some(
              (student) => student.id === r.studentId,
            )
          )
            return fail(403, "FORBIDDEN", "Học sinh không thuộc lớp.");
          const old =
            rows.find((o) => o.studentId === r.studentId) ??
            emptyResult(r.studentId, a.skills);
          if (r.version !== old.version)
            return fail(
              409,
              "VERSION_CONFLICT",
              "Điểm đã thay đổi. Tải lại trước khi sửa.",
            );
          if (
            !Array.isArray(r.skillResults) ||
            typeof r.overallComment !== "string" ||
            typeof r.overallAdvice !== "string"
          )
            return fail(422, "INVALID_RESULT", "Dữ liệu điểm không hợp lệ.");
          const errors = validateResult(r, a.skills);
          if (Object.keys(errors).length)
            throw new MockFailure(
              422,
              "VALIDATION_ERROR",
              "Điểm không hợp lệ.",
              errors,
            );
          const saved = { ...structuredClone(r), version: old.version + 1 };
          const index = rows.findIndex((o) => o.studentId === r.studentId);
          if (index >= 0) rows[index] = saved;
          else rows.push(saved);
          return saved;
        };
        if (m[2] === "batch") {
          const incoming = object(body).rows;
          if (!Array.isArray(incoming) || incoming.length > 1000)
            return fail(422, "INVALID_ROWS", "Danh sách dòng không hợp lệ.");
          if (
            new Set(incoming.map((r) => object(r).studentId)).size !==
            incoming.length
          )
            return fail(422, "DUPLICATE_ROWS", "ID dòng bị trùng.");
          const saved: StudentResult[] = [],
            rowErrors: Record<string, string> = {};
          for (const r of incoming) {
            try {
              saved.push(apply(r));
            } catch (e) {
              rowErrors[String(object(r).studentId)] =
                e instanceof Error ? e.message : "Lỗi lưu dòng";
            }
          }
          learningSave();
          return envelope({ saved, rowErrors });
        }
        if (m[2] !== object(body).studentId)
          return fail(422, "INVALID_STUDENT", "ID học sinh không khớp.");
        const saved = apply(body);
        learningSave();
        return envelope(saved);
      }
      m = path.match(/^\/assessments\/([^/]+)\/excel-template$/);
      if (m) {
        const a = assessmentCheck(m[1]),
          s = sessionCheck(a.sessionId);
        const { createTemplate } = await import("@/features/excel/workbook");
        return {
          data: await createTemplate(
            { classId: s.classId, sessionId: s.id, assessmentId: a.id },
            a,
            db.students[s.classId],
            db.results[a.id],
          ),
        };
      }
      m = path.match(/^\/assessments\/([^/]+)\/import\/preview$/);
      if (m) {
        const a = assessmentCheck(m[1]),
          s = sessionCheck(a.sessionId);
        assertLearning(db, staff, sessionCheck(a.sessionId).classId, true);
        if (a.status === "COMPLETED")
          return fail(403, "ASSESSMENT_LOCKED", "Bài đánh giá đã khóa.");
        if (!(body instanceof FormData) || !(body.get("file") instanceof Blob))
          return fail(422, "INVALID_FILE", "Chọn file Excel.");
        const mode =
          body.get("mode") === "REPLACE_ALL"
            ? "REPLACE_ALL"
            : "MERGE_NON_EMPTY";
        const { parseWorkbook } = await import("@/features/excel/workbook");
        let parsed;
        try {
          parsed = await parseWorkbook(
            body.get("file") as Blob,
            { classId: s.classId, sessionId: s.id, assessmentId: a.id },
            a,
            db.students[s.classId],
            db.results[a.id],
            mode,
          );
        } catch (e) {
          return fail(
            422,
            "INVALID_TEMPLATE",
            e instanceof Error ? e.message : "File không hợp lệ.",
          );
        }
        const preview: ImportPreview = {
          ...parsed,
          previewId: id(),
          expiresAt: new Date(Date.now() + 600000).toISOString(),
        };
        db.previews[preview.previewId] = {
          preview,
          assessmentId: a.id,
          schemaVersion: a.schemaVersion,
        };
        learningSave();
        return envelope(preview);
      }
      m = path.match(/^\/assessments\/([^/]+)\/import\/commit$/);
      if (m) {
        const a = assessmentCheck(m[1]),
          b = object(body),
          key = headers.get("Idempotency-Key");
        if (!key)
          return fail(422, "IDEMPOTENCY_REQUIRED", "Thiếu Idempotency-Key.");
        assertLearning(db, staff, sessionCheck(a.sessionId).classId, true);
        const previous = db.commits[key];
        if (previous) {
          if (previous.previewId !== b.previewId || previous.mode !== b.mode)
            return fail(
              409,
              "IDEMPOTENCY_CONFLICT",
              "Key đã dùng cho yêu cầu khác.",
            );
          return envelope(previous.data);
        }
        assertLearning(db, staff, sessionCheck(a.sessionId).classId, true);
        if (a.status === "COMPLETED")
          return fail(403, "ASSESSMENT_LOCKED", "Bài đánh giá đã khóa.");
        const item =
          db.previews[String(b.previewId)] ??
          fail(404, "PREVIEW_NOT_FOUND", "Preview không tồn tại.");
        if (item.assessmentId !== a.id)
          return fail(403, "FORBIDDEN", "Preview sai bài đánh giá.");
        if (Date.parse(item.preview.expiresAt) < Date.now())
          return fail(410, "PREVIEW_EXPIRED", "Preview đã hết hạn.");
        if (item.schemaVersion !== a.schemaVersion)
          return fail(409, "SCHEMA_CONFLICT", "Schema đã thay đổi.");
        if (item.preview.errors.length || item.preview.mode !== b.mode)
          return fail(
            422,
            "INVALID_PREVIEW",
            "Preview chưa hợp lệ hoặc sai chế độ.",
          );
        const rows = db.results[a.id];
        for (const c of item.preview.changes) {
          const current =
            rows.find((r) => r.studentId === c.studentId) ??
            emptyResult(c.studentId, a.skills);
          if (current.version !== c.before.version)
            return fail(
              409,
              "VERSION_CONFLICT",
              "Có điểm mới được lưu. Tạo preview lại.",
            );
          if (Object.keys(validateResult(c.after, a.skills)).length)
            return fail(422, "INVALID_SCORES", "Điểm không hợp lệ.");
        }
        for (const c of item.preview.changes) {
          const saved = { ...c.after, version: c.before.version + 1 },
            index = rows.findIndex((r) => r.studentId === c.studentId);
          if (index >= 0) rows[index] = saved;
          else rows.push(saved);
        }
        const data = { updated: item.preview.changes.length };
        db.commits[key] = {
          previewId: String(b.previewId),
          mode: String(b.mode),
          data,
        };
        learningSave();
        return envelope(data);
      }
      return fail(404, "NOT_FOUND", "Endpoint không tồn tại.");
    } catch (e) {
      if (e instanceof MockFailure || e instanceof ManagementError)
        return {
          error: {
            status: e.status,
            data: {
              error: {
                code: e.code,
                message: e.message,
                fieldErrors: e.fieldErrors,
                rowErrors: "rowErrors" in e ? e.rowErrors : undefined,
              },
            },
          },
        };
      return {
        error: {
          status: 500,
          data: {
            error: {
              code: "MOCK_ERROR",
              message: e instanceof Error ? e.message : "Lỗi dữ liệu demo.",
            },
          },
        },
      };
    }
  };
  const processPending = async (runtime: Parameters<typeof handler>[1]) => {
    const pending = Object.values(read().operations ?? {}).filter((j) => j.status === "IN_PROGRESS");
    for (const job of pending) {
      const result = await handler(job.request, runtime);
      const db = structuredClone(read()), current = db.operations?.[job.operationId];
      if (!current || current.status !== "IN_PROGRESS") continue;
      current.completedAt = new Date().toISOString();
      if ("error" in result && result.error) {
        const detail = result.error.data as { error?: { code?: string; message?: string } } | undefined;
        current.status = "FAILED"; current.error = { status: typeof result.error.status === "number" ? result.error.status : 500, code: detail?.error?.code ?? "OPERATION_FAILED", message: detail?.error?.message ?? "Tác vụ thất bại." };
      } else { current.status = "DONE"; current.result = "data" in result ? result.data : undefined; }
      const events = db.operationEvents ??= [];
      events.push({ eventId: String(Number(events.at(-1)?.eventId ?? 0) + 1), operationId: current.operationId, actorId: current.actorId, status: current.status, command: current.command, entities: operationEntities(current.command), completedAt: current.completedAt, error: current.error });
      if (events.length > 1000) events.splice(0, events.length - 1000);
      save(db);
    }
  };
  const wrapped = async (args: string | FetchArgs, runtime: Parameters<typeof handler>[1]) => {
    const request = typeof args === "string" ? { url: args } : args;
    const path = request.url.split("?")[0], method = request.method ?? "GET", headers = requestHeaders(request.headers);
    const asynchronous = headers.get("Prefer") === "respond-async" && businessMutation(path, method);
    if (!asynchronous && !path.startsWith("/operations")) return handler(args, runtime);
    try {
      const db = structuredClone(read()), token = headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
      const session = db.tokens[token];
      if (!session || Date.parse(session.expiresAt) <= Date.now()) fail(401, "UNAUTHORIZED", "Phiên đăng nhập hết hạn.");
      const staff = actor(db, session.teacher.id);
      if (asynchronous) {
        if (path.startsWith("/manager/")) { if (!capabilities(staff, "manager").manage) fail(403, "FORBIDDEN", "Cần vai trò MANAGER hoạt động."); }
        else {
          let classId = path.match(/^\/classes\/([^/]+)/)?.[1];
          const sid = path.match(/^\/sessions\/([^/]+)/)?.[1], aid = path.match(/^\/assessments\/([^/]+)/)?.[1];
          if (sid) classId = db.sessions.find((s) => s.id === sid)?.classId;
          if (aid) { const assessment = db.assessments.find((a) => a.id === aid); classId = db.sessions.find((s) => s.id === assessment?.sessionId)?.classId; }
          assertLearning(db, staff, classId ?? "", true);
        }
        const key = headers.get("Idempotency-Key") ?? id(), digest = JSON.stringify({ path, method, body: request.body });
        if (key.length > 128) fail(400, "INVALID_KEY", "Idempotency-Key không hợp lệ.");
        const jobs = db.operations ??= {};
        const old = Object.values(jobs).find((j) => j.actorId === staff.id && j.key === key);
        if (old) { if (old.digest !== digest) fail(409, "IDEMPOTENCY_CONFLICT", "Khóa đã dùng cho request khác."); return { data: { data: publicOperation(old, staff.id) } }; }
        const operationId = id();
        jobs[operationId] = { operationId, actorId: staff.id, token, key, digest, status: "IN_PROGRESS", command: operationCommand(path, method), createdAt: new Date().toISOString(), completedAt: null, request: { ...request, headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": key } } };
        save(db);
        setTimeout(() => { const work = queue.then(() => processPending(runtime)); queue = work.catch(() => undefined); }, Math.max(50, delay * 2));
        return { data: { data: publicOperation(jobs[operationId], staff.id) } };
      }
      if (path === "/operations/events") {
        const after = new URLSearchParams(request.url.split("?")[1]).get("after") ?? "0";
        return { data: { data: { items: (db.operationEvents ?? []).filter((e) => BigInt(e.eventId) > BigInt(after) && (staff.roles?.includes("MANAGER") || e.actorId === staff.id)).slice(0, 100) } } };
      }
      if (path === "/operations") return { data: { data: { items: Object.values(db.operations ?? {}).filter((j) => j.actorId === staff.id).slice(-100).map((j) => publicOperation(j, staff.id)) } } };
      const opId = path.split("/")[2], owned = db.operations?.[opId];
      if (!owned || (owned.actorId !== staff.id && !staff.roles?.includes("MANAGER"))) return fail(404, "OPERATION_NOT_FOUND", "Không tìm thấy tác vụ.");
      if (owned.status === "IN_PROGRESS") await processPending(runtime);
      return { data: { data: publicOperation(read().operations![opId], staff.id) } };
    } catch (e) {
      return { error: { status: e instanceof MockFailure || e instanceof ManagementError ? e.status : 500, data: { error: { code: e instanceof MockFailure || e instanceof ManagementError ? e.code : "MOCK_ERROR", message: e instanceof Error ? e.message : "Tác vụ thất bại." } } } };
    }
  };
  return (args, api, options) => {
    const task = queue.then(() => wrapped(args, api));
    queue = task.catch(() => undefined);
    void options;
    return task;
  };
}
