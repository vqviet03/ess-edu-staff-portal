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
import { requestHeaders } from "@/api/headers";
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
      const headers = requestHeaders(req.headers);
      const token = headers.get("Authorization")?.replace(/^Bearer /, "");
      const envelope = (data: unknown, meta?: unknown) => ({
        data: { data, ...(meta ? { meta } : {}) },
      });
      if (path === "/auth/login" && method === "POST") {
        const b = object(body);
        if (b.teacherId !== "GV0001" || b.password !== "Demo123!")
          return fail(
            401,
            "INVALID_CREDENTIALS",
            "ID giảng viên hoặc mật khẩu không đúng.",
          );
        const session: AuthSession = {
          accessToken: `demo-${id()}`,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          teacher: { id: "GV0001", name: "Nguyễn Minh Anh" },
        };
        db.tokens[session.accessToken] = session;
        save(db);
        return envelope(session);
      }
      if (path === "/auth/link/exchange" && method === "POST") {
        const code = object(body).code;
        if (code === "expired-demo")
          return fail(410, "CODE_EXPIRED", "Liên kết đã hết hạn.");
        if (code !== "teacher-demo")
          return fail(400, "INVALID_CODE", "Mã đăng nhập không hợp lệ.");
        if (db.usedCodes.includes(code))
          return fail(410, "CODE_USED", "Liên kết đã được sử dụng.");
        db.usedCodes.push(code);
        const session: AuthSession = {
          accessToken: `demo-${id()}`,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          teacher: { id: "GV0001", name: "Nguyễn Minh Anh" },
        };
        db.tokens[session.accessToken] = session;
        save(db);
        return envelope(session);
      }
      if (
        !token ||
        !db.tokens[token] ||
        Date.parse(db.tokens[token].expiresAt) <= Date.now()
      )
        return fail(401, "UNAUTHORIZED", "Phiên đăng nhập đã hết hạn.");
      if (path === "/auth/me") return envelope(db.tokens[token].teacher);
      if (path === "/auth/logout" && method === "POST") {
        delete db.tokens[token];
        save(db);
        return envelope({loggedOut: true});
      }
      const classView = (c: Class) => ({
        ...c,
        studentCount: db.students[c.id]?.length ?? 0,
        completedUnits: completedUnitNumbers(
          db.sessions.filter((s) => s.classId === c.id),
        ).length,
      });
      const classCheck = (classId: string) =>
        db.classes.find((c) => c.id === classId) ??
        fail(403, "FORBIDDEN", "Bạn không có quyền truy cập lớp này.");
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
        if (method === "GET") return envelope(students);
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
        const parsed = checked(studentInput, {
          ...b,
          dateOfBirth: b.dateOfBirth ?? "",
        });
        Object.assign(student, {
          ...parsed,
          dateOfBirth: parsed.dateOfBirth || null,
          version: student.version + 1,
        });
        save(db);
        return envelope(student);
      }
      m = path.match(/^\/classes\/([^/]+)\/sessions$/);
      if (m) {
        const c = classCheck(m[1]);
        if (method === "GET")
          return envelope(db.sessions.filter((s) => s.classId === c.id));
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
        save(db);
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
        const parsed = checked(sessionInput, { ...s, ...b });
        if (
          parsed.unitNumber &&
          parsed.unitNumber > classCheck(s.classId).totalUnits
        )
          return fail(422, "INVALID_UNIT", "Unit vượt số Unit của lớp.");
        Object.assign(s, parsed, { version: s.version + 1 });
        save(db);
        return envelope(s);
      }
      m = path.match(/^\/sessions\/([^/]+)\/assessments$/);
      if (m) {
        const s = sessionCheck(m[1]);
        if (method === "GET")
          return envelope(db.assessments.filter((a) => a.sessionId === s.id));
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
        save(db);
        return envelope(a);
      }
      m = path.match(/^\/assessments\/([^/]+)$/);
      if (m) {
        const a = assessmentCheck(m[1]);
        if (method === "GET") return envelope(a);
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
        save(db);
        return envelope(a);
      }
      m = path.match(/^\/assessments\/([^/]+)\/results(?:\/(.+))?$/);
      if (m) {
        const a = assessmentCheck(m[1]),
          s = sessionCheck(a.sessionId),
          rows = db.results[a.id];
        if (method === "GET") return envelope(rows);
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
          save(db);
          return envelope({ saved, rowErrors });
        }
        if (m[2] !== object(body).studentId)
          return fail(422, "INVALID_STUDENT", "ID học sinh không khớp.");
        const saved = apply(body);
        save(db);
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
        save(db);
        return envelope(preview);
      }
      m = path.match(/^\/assessments\/([^/]+)\/import\/commit$/);
      if (m) {
        const a = assessmentCheck(m[1]),
          b = object(body),
          key = headers.get("Idempotency-Key");
        if (!key)
          return fail(422, "IDEMPOTENCY_REQUIRED", "Thiếu Idempotency-Key.");
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
        save(db);
        return envelope(data);
      }
      return fail(404, "NOT_FOUND", "Endpoint không tồn tại.");
    } catch (e) {
      if (e instanceof MockFailure)
        return {
          error: {
            status: e.status,
            data: {
              error: {
                code: e.code,
                message: e.message,
                fieldErrors: e.fieldErrors,
                rowErrors: e.rowErrors,
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
  return (args, api, options) => {
    const task = queue.then(() => handler(args, api));
    queue = task.catch(() => undefined);
    void options;
    return task;
  };
}
