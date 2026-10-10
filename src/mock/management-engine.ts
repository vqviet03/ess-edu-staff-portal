import {validateEnrollmentDates, type EnrollmentDates, type EnrollmentDatesRequest} from "@/features/management/enrollment-dates";
import { sessionExpiry } from "@/features/management/session-duration";
import type { SessionDuration } from "@/features/management/session-duration";
import { requestHeaders } from "@/api/headers";
import { nameIdentifier, availableIdentifier, classPrefix } from "@/features/management/identifiers";
import type { FetchArgs } from "@reduxjs/toolkit/query";
import type { Database } from "./fixtures";
import { managementSeed } from "./management-fixtures";
import type { ManagementDatabase } from "./management-fixtures";
import {
  accountStaff,
  type Account,
  type BulkPreview,
  type ClassAccess,
  type Entity,
  type Impact,
  type ListFilter,
  type ManagedClass,
  type ManagedRecord,
  type PreviewRequest,
  type Selection,
  type Staff,
  type StatsFilter,
  type TeacherClassAssignment,
} from "@/features/management/models";
import {
  defaults,
  entitySchemas,
  parseRoles,
  rolesInput,
  selectionInput,
  previewRequestInput,
} from "@/features/management/validation";
import { capabilities } from "@/features/access/capabilities";
import { completedUnitNumbers, emptyResult } from "@/utils/scores";
import type { Teacher } from "@/types";
export class ManagementError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}
export function reject(status: number, code: string, message: string): never {
  throw new ManagementError(status, code, message);
}
export const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : reject(422, "INVALID_BODY", "Dữ liệu không hợp lệ.");
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
export function management(db: Database) {
  return (db.management ??= managementSeed(db));
}
export function actor(db: Database, profileId: string): Teacher {
  const m = management(db),
    profile = m.teachers.find((t) => t.id === profileId),
    account = m.accounts.find(
      (a) => a.kind === "STAFF" && a.profileId === profileId,
    );
  if (!profile || !account)
    return reject(
      403,
      "STAFF_REQUIRED",
      "Tài khoản học sinh không được truy cập Staff Portal.",
    );
  if (account.status !== "ACTIVE")
    return reject(401, "ACCOUNT_LOCKED", "Tài khoản không còn hoạt động.");
  return accountStaff(account, profile);
}
export function validTeachers(m: ManagementDatabase, classId: string) {
  return m.assignments
    .filter(
      (a) =>
        a.classId === classId &&
        a.status === "ACTIVE" &&
        !a.requiresReconfirmation,
    )
    .map((a) => m.teachers.find((t) => t.id === a.teacherId))
    .filter(
      (t): t is Staff =>
        !!t &&
        t.status === "ACTIVE" &&
        m.accounts.some(
          (a) =>
            a.profileId === t.id &&
            a.kind === "STAFF" &&
            a.status === "ACTIVE" &&
            a.roles.includes("TEACHER"),
        ),
    );
}
export function accessFor(
  db: Database,
  staff: Teacher,
  classId: string,
): ClassAccess {
  const m = management(db),
    c = m.classes.find((c) => c.id === classId);
  if (!c) return reject(404, "NOT_FOUND", "Lớp không tồn tại.");
  const assignment = m.assignments.find(
    (a) => a.classId === classId && a.teacherId === staff.id,
  );
  return {
    classId,
    canView:
      staff.profileStatus === "ACTIVE" &&
      staff.accountStatus === "ACTIVE" &&
      (!!staff.roles?.includes("MANAGER") ||
        (!!staff.roles?.includes("TEACHER") && !!assignment)),
    assignmentStatus: assignment?.status ?? null,
    assignmentConfirmed: !assignment?.requiresReconfirmation,
    classStatus: c.status,
    profileStatus: staff.profileStatus ?? "INACTIVE",
    accountStatus: staff.accountStatus ?? "LOCKED",
  };
}
export function assertLearning(
  db: Database,
  staff: Teacher,
  classId: string,
  edit = false,
) {
  const a = accessFor(db, staff, classId),
    can = capabilities(staff, "teacher", a);
  if (!(edit ? can.editLearning : can.viewLearning))
    reject(
      403,
      "FORBIDDEN",
      edit
        ? "Cần là giảng viên hoạt động đang được phân công ACTIVE trong lớp ACTIVE."
        : "Bạn không có quyền xem lớp này.",
    );
}
export function classView(db: Database, c: ManagedClass): ManagedClass {
  const m = management(db);
  return {
    ...c,
    studentCount: m.enrollments.filter(
      (e) =>
        e.classId === c.id &&
        e.status === "ACTIVE" &&
        m.students.some((s) => s.id === e.studentId && s.status === "ACTIVE"),
    ).length,
    completedUnits: completedUnitNumbers(
      db.sessions.filter((s) => s.classId === c.id),
    ).length,
  };
}
export function warningClasses(db: Database): Impact[] {
  const m = management(db);
  return m.classes
    .filter((c) => c.status === "ACTIVE" && validTeachers(m, c.id).length === 0)
    .map((c) => ({
      classId: c.id,
      className: c.name,
      remainingTeachers: [],
      afterUnstaffed: true,
      message: "Lớp đang học không có giảng viên hợp lệ đang phụ trách.",
    }));
}
export function matches(
  db: Database,
  entity: Entity,
  r: ManagedRecord,
  filter: ListFilter,
) {
  const m = management(db),
    values = Object.values(r)
      .filter((v) => typeof v === "string")
      .join(" ")
      .toLocaleLowerCase("vi");
  if (filter.search && !values.includes(filter.search.toLocaleLowerCase("vi")))
    return false;
  if (filter.status && r.status !== filter.status) return false;
  if (filter.classId && entity !== "classes") {
    const linked =
      entity === "students"
        ? m.enrollments.some(
            (e) =>
              e.studentId === r.id &&
              e.classId === filter.classId &&
              e.status === "ACTIVE",
          )
        : entity === "teachers"
          ? m.assignments.some(
              (a) =>
                a.teacherId === r.id &&
                a.classId === filter.classId &&
                a.status === "ACTIVE",
            )
          : false;
    if (!linked) return false;
  }
  if (filter.accountStatus || filter.role) {
    const a =
      entity === "accounts"
        ? (r as Account)
        : m.accounts.find(
            (a) =>
              a.profileId === r.id &&
              a.kind === (entity === "teachers" ? "STAFF" : "STUDENT"),
          );
    if (filter.accountStatus && a?.status !== filter.accountStatus)
      return false;
    if (filter.role && !a?.roles.includes(filter.role as "TEACHER" | "MANAGER"))
      return false;
  }
  return true;
}
export function selected(db: Database, entity: Entity, selection: Selection) {
  const parsed = selectionInput.safeParse(selection);
  if (!parsed.success)
    reject(422, "INVALID_SELECTION", "Phạm vi lựa chọn không hợp lệ.");
  selection = parsed.data;
  const m = management(db);
  if (selection.mode === "IDS") {
    if (
      !selection.ids.length ||
      new Set(selection.ids).size !== selection.ids.length
    )
      reject(422, "INVALID_SELECTION", "Chọn ít nhất một ID duy nhất.");
    const rows = m[entity].filter((r) => selection.ids.includes(r.id));
    if (rows.length !== selection.ids.length)
      reject(404, "NOT_FOUND", "Có bản ghi không tồn tại.");
    return rows;
  }
  if (selection.mode !== "FILTER" || !Array.isArray(selection.excludedIds))
    reject(422, "INVALID_SELECTION", "Phạm vi lựa chọn không hợp lệ.");
  return m[entity].filter(
    (r) =>
      matches(db, entity, r, selection.filter) &&
      !selection.excludedIds.includes(r.id),
  );
}
function setEntity(
  m: ManagementDatabase,
  entity: Entity,
  record: ManagedRecord,
  previousId = record.id,
) {
  // Parsing happens in buildPreview; this is the single typed entity write boundary.
  const rows = m[entity] as ManagedRecord[],
    i = rows.findIndex((r) => r.id === previousId);
  if (i < 0) rows.push(record);
  else rows[i] = record;
}
function renameReferences(db: Database, entity: Entity, oldId: string, newId: string) {
  if (oldId === newId) return;
  const m = management(db);
  if (entity === "students" || entity === "teachers") {
    for (const a of m.accounts) if (a.profileId === oldId && a.kind === (entity === "teachers" ? "STAFF" : "STUDENT")) { a.profileId = newId; if (a.loginId === oldId) { a.loginId = newId; a.version++; } }
    for (const a of m.assignments) if (entity === "teachers" && a.teacherId === oldId) a.teacherId = newId;
    for (const e of m.enrollments) if (entity === "students" && e.studentId === oldId) e.studentId = newId;
    if (entity === "students") { for (const students of Object.values(db.students)) for (const s of students) if (s.id === oldId) s.id = newId; for (const rows of Object.values(db.results)) for (const r of rows) if (r.studentId === oldId) r.studentId = newId; }
    if (entity === "teachers") for (const session of Object.values(db.tokens)) if (session.teacher.id === oldId) session.teacher.id = newId;
  }
  if (entity === "classes") {
    for (const a of m.assignments) if (a.classId === oldId) a.classId = newId;
    for (const e of m.enrollments) if (e.classId === oldId) e.classId = newId;
    for (const s of db.sessions) if (s.classId === oldId) s.classId = newId;
    if (db.students[oldId]) { db.students[newId] = db.students[oldId]; delete db.students[oldId]; }
    for (const key of Object.keys(db.publications ?? {})) if (key.startsWith(oldId + ":")) { db.publications![newId + key.slice(oldId.length)] = db.publications![key]; delete db.publications![key]; }
  }
  if (entity === "labels") for (const a of m.assignments) { if (a.labelId === oldId) a.labelId = newId; for (const h of a.history) if (h.labelId === oldId) h.labelId = newId; }
}
function effectivePatch(row: Record<string, unknown>, clear: string[] = []) {
  return Object.fromEntries(
    Object.entries(row).filter(
      ([key, v]) =>
        (v !== undefined && v !== null && v !== "") || clear.includes(key),
    ),
  );
}
function linkedRoles(m: ManagementDatabase, id: string) {
  return (
    m.accounts.find((a) => a.kind === "STAFF" && a.profileId === id)?.roles ??
    []
  );
}
function endAssignments(
  m: ManagementDatabase,
  ids: string[],
  reason: string,
  status: "ENDED" | "COMPLETED" = "ENDED",
  classMode = false,
) {
  for (const a of m.assignments)
    if (
      a.status === "ACTIVE" &&
      ids.includes(classMode ? a.classId : a.teacherId)
    ) {
      const at = now();
      a.status = status;
      a.endAt = at;
      a.version++;
      a.updatedAt = at;
      const p = a.history.at(-1);
      if (p?.status === "ACTIVE") {
        p.endAt = at;
        p.status = status;
        p.reason = reason;
      }
      // Keep every status transition, including the close event.
      a.history.push({
        startAt: at,
        endAt: at,
        status,
        labelId: a.labelId,
        reason,
      });
    }
}
function lifecycle(
  db: Database,
  entity: Entity,
  before: ManagedRecord | null,
  after: ManagedRecord,
  reason: string,
) {
  const m = management(db);
  if (
    entity === "teachers" &&
    before?.status === "ACTIVE" &&
    after.status !== "ACTIVE"
  )
    endAssignments(m, [after.id], reason);
  if (
    entity === "students" &&
    before?.status === "ACTIVE" &&
    after.status !== "ACTIVE"
  )
    for (const e of m.enrollments.filter(
      (e) => e.studentId === after.id && e.status === "ACTIVE",
    )) {
      const at = now();
      e.status = "ENDED";
      e.version++;
      e.updatedAt = at;
      const p = e.history.at(-1);
      if (p) {
        p.status = "ENDED";
        p.endAt = at;
        p.reason = reason;
      }
      e.history.push({ startAt: at, endAt: at, status: "ENDED", reason });
    }
  if (entity === "accounts") {
    const b = before as Account | null,
      a = after as Account;
    if (
      a.kind === "STAFF" &&
      b &&
      ((b.status === "ACTIVE" && a.status !== "ACTIVE") ||
        (b.roles.includes("TEACHER") && !a.roles.includes("TEACHER")))
    )
      endAssignments(m, [a.profileId], reason);
  }
  if (
    entity === "classes" &&
    before?.status !== after.status &&
    after.status === "PAUSED"
  )
    for (const a of m.assignments.filter(
      (a) => a.classId === after.id && a.status === "ACTIVE",
    )) {
      a.requiresReconfirmation = true;
      a.version++;
      a.updatedAt = now();
    }
  if (
    entity === "classes" &&
    before?.status !== after.status &&
    ["COMPLETED", "INACTIVE"].includes(after.status)
  ) {
    endAssignments(
      m,
      [after.id],
      reason,
      after.status === "COMPLETED" ? "COMPLETED" : "ENDED",
      true,
    );
    if (after.status === "COMPLETED")
      for (const e of m.enrollments.filter(
        (e) => e.classId === after.id && e.status === "ACTIVE",
      )) {
        e.status = "COMPLETED";
        e.version++;
        e.updatedAt = now();
        const p = e.history.at(-1);
        if (p) {
          p.status = "COMPLETED";
          p.endAt = now();
          p.reason = reason;
        }
      }
  }
}
function sync(db: Database) {
  const m = management(db);
  db.classes = m.classes.map((c) => classView(db, c));
  for (const c of m.classes)
    db.students[c.id] = m.enrollments
      .filter((e) => e.classId === c.id && e.status === "ACTIVE")
      .flatMap((e) => {
        const s = m.students.find((s) => s.id === e.studentId);
        return s?.status === "ACTIVE"
          ? [
              {
                id: s.id,
                name: s.fullName,
                nickname: s.nickname,
                dateOfBirth: s.dateOfBirth,
                status: s.status,
                version: s.version,
              },
            ]
          : [];
      });
}
function managers(m: ManagementDatabase) {
  return m.accounts.filter(
    (a) =>
      a.kind === "STAFF" &&
      a.roles.includes("MANAGER") &&
      a.status === "ACTIVE" &&
      m.teachers.some((t) => t.id === a.profileId && t.status === "ACTIVE"),
  ).length;
}
export function buildPreview(
  db: Database,
  staff: Teacher,
  request: PreviewRequest,
  allocateIdentifiers = true,
): BulkPreview {
  if (!capabilities(staff, "manager").manage)
    reject(403, "FORBIDDEN", "Chỉ quản lý hoạt động được thao tác.");
  const parsedRequest = previewRequestInput.safeParse(request);
  if (!parsedRequest.success)
    reject(422, "INVALID_BODY", parsedRequest.error.issues[0].message);
  request = parsedRequest.data;
  const m = management(db),
    entity = request.entity;
  if (!Object.hasOwn(entitySchemas, entity))
    reject(422, "INVALID_ENTITY", "Nhóm không hợp lệ.");
  const preview: BulkPreview = {
    previewId: uid(),
    version: 1,
    count: 0,
    scope:
      request.selection?.mode === "FILTER"
        ? "Toàn bộ kết quả bộ lọc (server chốt tại preview)"
        : request.selection
          ? "Các ID được chọn"
          : "Bảng nhập / hồ sơ",
    changes: [],
    impacts: [],
    warnings: [],
    errors: [],
    requiredConfirmations: [],
    expiresAt: new Date(Date.now() + 600000).toISOString(),
  };
  const inputRows: Record<string, unknown>[] =
    request.rows ??
    selected(db, entity, request.selection ?? { mode: "IDS", ids: [] }).map(
      (r) => ({ id: r.id, ...request.patch }),
    );
  if (!inputRows.length || inputRows.length > 5000)
    reject(422, "INVALID_ROWS", "Cần từ 1 đến 5000 bản ghi.");
  const ids = new Set<string>(), renamedIds = new Set<string>();
  const used = new Set([...m.students.map((s) => s.id), ...m.teachers.map((t) => t.id), ...m.accounts.map((a) => a.loginId)].map((x) => x.toLowerCase()));
  for (const [i, rawInput] of inputRows.entries()) {
    const row = Number(rawInput._excelRow) || i + 2;
    if (
      !Object.entries(rawInput).some(
        ([k, v]) =>
          !["_excelRow", "version"].includes(k) &&
          v !== "" &&
          v !== null &&
          v !== undefined,
      )
    )
      continue;
    const raw = obj(rawInput);
    if (request.mode === "CREATE" && allocateIdentifiers && (entity === "students" || entity === "teachers")) {
      try {
        const requested = String(raw.id ?? "").trim();
        raw.id = availableIdentifier(requested || nameIdentifier(String(raw.fullName ?? "")), used);
        used.add(String(raw.id).toLowerCase());
        if (requested && requested !== raw.id) preview.warnings.push(`Dòng ${row}: ID ${requested} → ${raw.id} để tránh trùng.`);
      } catch (e) { preview.errors.push({ row, column: "id", message: e instanceof Error ? e.message : "ID không hợp lệ" }); continue; }
    }
    if (request.mode === "CREATE" && allocateIdentifiers && entity === "classes" && !String(raw.id ?? "").trim()) {
      m.lastClassNumber = Math.max(20, m.lastClassNumber ?? 20, ...m.classes.map((c) => Number(c.code.match(/^ess(\d+)(?:-|$)/i)?.[1] ?? 0))) + 1;
      raw.id = `${m.settings?.classIdPrefix ?? "ess"}${m.lastClassNumber}`;
    }
    const recordId = String(raw.id ?? ""),
      before =
        (m[entity] as ManagedRecord[]).find((r) => r.id === recordId) ?? null;
    if (ids.has(recordId)) {
      preview.errors.push({
        row,
        column: "id",
        message: "ID trùng trong dữ liệu nhập.",
      });
      continue;
    }
    ids.add(recordId);
    if (request.mode === "CREATE" && before) {
      preview.errors.push({ row, column: "id", message: "ID đã tồn tại." });
      continue;
    }
    if (request.mode === "UPDATE" && !before) {
      preview.errors.push({
        row,
        column: "id",
        message: "ID không tồn tại để cập nhật.",
      });
      continue;
    }
    if (before && raw.version !== undefined && raw.version !== before.version) {
      preview.errors.push({
        row,
        column: "version",
        message: "Phiên bản đã thay đổi.",
      });
      continue;
    }
    const input: Record<string, unknown> = {
      ...defaults(entity, recordId),
      ...before,
      ...effectivePatch(raw, request.clearFields),
    };
    if (entity === "classes" && ((!before && !String(raw.name ?? "").trim()) || Object.hasOwn(raw, "nameSuffix") && !Object.hasOwn(raw, "name"))) {
      const prefix = before && "code" in before ? classPrefix(before.code) : recordId;
      let suffix = String(raw.nameSuffix ?? raw.name ?? "").trim().replace(/^-/, "");
      if (suffix.startsWith(prefix)) suffix = suffix.slice(prefix.length).replace(/^-/, "");
      input.nameSuffix = suffix; input.name = prefix + (suffix ? "-" + suffix : ""); input.code = raw.code || input.name;
    }
    if (entity === "classes" && !input.code) input.code = recordId;
    if (raw.newId !== undefined) {
      const newId = String(raw.newId).trim(), taken = entity === "students" || entity === "teachers" ? used : new Set((m[entity] as ManagedRecord[]).map(r => r.id.toLowerCase()));
      taken.delete(recordId.toLowerCase());
      if (!before || request.selection || entity === "accounts" || !/^[a-z0-9][a-z0-9_.-]{1,63}$/i.test(newId) || taken.has(newId.toLowerCase()) || renamedIds.has(newId.toLowerCase())) { preview.errors.push({ row, column: "id", message: "ID không hợp lệ hoặc đã tồn tại." }); continue; }
      renamedIds.add(newId.toLowerCase()); input.id = newId;
    }
    if (entity === "accounts" || entity === "teachers")
      input.roles = parseRoles(input.roles);
    const parsed = entitySchemas[entity].safeParse(input);
    if (!parsed.success) {
      preview.errors.push(
        ...parsed.error.issues.map((x) => ({
          row,
          column: x.path.join("."),
          message: x.message,
        })),
      );
      continue;
    }
    if (
      (entity === "teachers" || entity === "students") &&
      raw.createAccount !== undefined &&
      raw.createAccount !== "" &&
      raw.createAccount !== null &&
      ![true, false, "true", "false", "TRUE", "FALSE", 1, 0].includes(
        raw.createAccount as boolean,
      )
    ) {
      preview.errors.push({
        row,
        column: "createAccount",
        message: "TRUE / FALSE",
      });
      continue;
    }
    const after = {
      ...parsed.data,
      version: (before?.version ?? 0) + 1,
      createdAt: before?.createdAt ?? now(),
      updatedAt: now(),
    } as ManagedRecord;
    if (
      entity === "students" &&
      "dateOfBirth" in after &&
      after.dateOfBirth === ""
    )
      after.dateOfBirth = null;
    if (entity === "accounts" && !before && after.status !== "PENDING") {
      preview.errors.push({
        row,
        column: "status",
        message: "Tài khoản mới phải PENDING, kích hoạt bằng link.",
      });
      continue;
    }
    if (
      entity === "teachers" &&
      raw.roles !== undefined &&
      raw.roles !== "" &&
      !rolesInput.safeParse(parseRoles(raw.roles)).success
    ) {
      preview.errors.push({
        row,
        column: "roles",
        message: "Vai trò TEACHER / MANAGER, dùng | để nối.",
      });
      continue;
    }
    if (entity === "classes") {
      const c = after as ManagedClass,
        highest = Math.max(
          0,
          ...db.sessions
            .filter((s) => s.classId === c.id)
            .map((s) => s.unitNumber ?? 0),
        );
      if (c.totalUnits < highest) {
        preview.errors.push({
          row,
          column: "totalUnits",
          message: `Không được thấp hơn Unit ${highest} đã dùng.`,
        });
        continue;
      }
      c.studentCount =
        before && "studentCount" in before ? before.studentCount : 0;
      c.completedUnits = completedUnitNumbers(
        db.sessions.filter((s) => s.classId === c.id),
      ).length;
      if (
        before &&
        "totalUnits" in before &&
        before.totalUnits !== c.totalUnits
      )
        preview.warnings.push(
          `${c.name}: tiến độ ${c.completedUnits}/${before.totalUnits} → ${c.completedUnits}/${c.totalUnits} Unit.`,
        );
      if (
        before?.status !== c.status &&
        c.status === "COMPLETED" &&
        c.completedUnits < c.totalUnits
      )
        preview.requiredConfirmations.push("INCOMPLETE_CLASS");
    }
    if (entity === "accounts") {
      const a = after as Account;
      // The dedicated policy API owns this field; profile/role edits must retain it.
      a.sessionLifetimeMinutes = before && "roles" in before ? before.sessionLifetimeMinutes ?? null : null;
      a.sessionDuration = before && "roles" in before ? before.sessionDuration ?? null : null;
      if (
        !m[a.kind === "STAFF" ? "teachers" : "students"].some(
          (p) => p.id === a.profileId,
        )
      ) {
        preview.errors.push({
          row,
          column: "profileId",
          message: "Hồ sơ không tồn tại / sai loại.",
        });
        continue;
      }
      if (
        before &&
        "kind" in before &&
        (before.kind !== a.kind || before.profileId !== a.profileId)
      ) {
        preview.errors.push({
          row,
          column: "profileId",
          message: "Không đổi loại/hồ sơ của tài khoản hiện hữu.",
        });
        continue;
      }
      if (
        m.accounts.some(
          (x) =>
            x.id !== a.id &&
            (x.loginId.toLowerCase() === a.loginId.toLowerCase() ||
              (x.kind === a.kind && x.profileId === a.profileId)),
        )
      ) {
        preview.errors.push({
          row,
          column: "loginId",
          message: "ID đăng nhập hoặc tài khoản hồ sơ đã tồn tại.",
        });
        continue;
      }
    }
    preview.changes.push({
      entity,
      id: recordId,
      before: structuredClone(before),
      after,
      row,
    });
    if (entity === "teachers" || entity === "students") {
      const exists = m.accounts.find(
        (a) =>
          a.profileId === recordId &&
          a.kind === (entity === "teachers" ? "STAFF" : "STUDENT"),
      );
      const create = [true, "true", "TRUE", 1].includes(
        raw.createAccount as boolean,
      );
      if (
        exists &&
        raw.roles !== undefined &&
        raw.roles !== "" &&
        entity === "teachers"
      )
        preview.changes.push({
          entity: "accounts",
          id: exists.id,
          before: structuredClone(exists),
          after: {
            ...exists,
            roles: parseRoles(raw.roles),
            version: exists.version + 1,
            updatedAt: now(),
          },
          row,
        });
      if (!exists && create) {
        if (
          m.accounts.some(
            (a) => a.loginId.toLowerCase() === recordId.toLowerCase(),
          )
        ) {
          preview.errors.push({
            row,
            column: "id",
            message: "ID đăng nhập đã được dùng.",
          });
          continue;
        }
        const accountId = uid();
        preview.changes.push({
          entity: "accounts",
          id: accountId,
          before: null,
          after: {
            id: accountId,
            loginId: recordId,
            profileId: recordId,
            kind: entity === "teachers" ? "STAFF" : "STUDENT",
            roles:
              entity === "teachers" ? parseRoles(raw.roles || ["TEACHER"]) : [],
            status: "PENDING",
            version: 1,
            createdAt: now(),
            updatedAt: now(),
          },
          row,
        });
      }
    }
  }
  const future = structuredClone(db);
  for (const c of preview.changes) {
    setEntity(management(future), c.entity, c.after, c.id);
    renameReferences(future, c.entity, c.id, c.after.id);
    lifecycle(future, c.entity, c.before, c.after, "Preview");
  }
  const seenLogins = new Set<string>(),
    seenProfiles = new Set<string>();
  for (const a of management(future).accounts) {
    const login = a.loginId.toLowerCase(),
      profile = `${a.kind}:${a.profileId}`;
    if (seenLogins.has(login) || seenProfiles.has(profile))
      preview.errors.push({
        row: 0,
        column: "loginId",
        message: "ID đăng nhập / tài khoản hồ sơ trùng trong giao dịch.",
      });
    seenLogins.add(login);
    seenProfiles.add(profile);
  }
  if (managers(management(future)) < 1)
    preview.errors.push({
      row: 0,
      column: "roles",
      message: "Không thể vô hiệu hóa quản lý hoạt động cuối cùng.",
    });
  const affected = new Set<string>();
  for (const c of preview.changes) {
    if (c.before && c.before.status !== c.after.status) {
      preview.requiredConfirmations.push("STATUS_IMPACT");
      if (c.after.status === "ACTIVE")
        preview.warnings.push(
          `${c.id}: khôi phục không tự khôi phục phân công / ghi danh.`,
        );
    }
    const teacherId =
      c.entity === "teachers"
        ? c.id
        : c.entity === "accounts" && (c.after as Account).kind === "STAFF"
          ? (c.after as Account).profileId
          : null;
    if (
      teacherId &&
      ((c.entity === "teachers" && c.after.status !== "ACTIVE") ||
        (c.entity === "accounts" &&
          (!(c.after as Account).roles.includes("TEACHER") ||
            c.after.status !== "ACTIVE")))
    )
      for (const a of m.assignments.filter(
        (a) => a.teacherId === teacherId && a.status === "ACTIVE",
      )) {
        affected.add(a.classId);
        preview.requiredConfirmations.push("ASSIGNMENT_IMPACT");
      }
    if (
      c.entity === "students" &&
      c.before?.status === "ACTIVE" &&
      c.after.status !== "ACTIVE"
    )
      for (const e of m.enrollments.filter(
        (e) => e.studentId === c.id && e.status === "ACTIVE",
      ))
        affected.add(e.classId);
    if (c.entity === "classes" && c.before?.status !== c.after.status)
      affected.add(c.id);
  }
  preview.impacts = [...affected].map((classId) => {
    const c = (m.classes.find((c) => c.id === classId) ?? management(future).classes.find((c) => c.id === classId))!,
      remaining = validTeachers(management(future), classId);
    return {
      classId,
      className: c.name,
      remainingTeachers: remaining.map((t) => t.fullName),
      afterUnstaffed:
        management(future).classes.find((c) => c.id === classId)?.status ===
          "ACTIVE" && !remaining.length,
      message:
        entity === "students"
          ? "Ghi danh hiện tại sẽ kết thúc; giữ điểm và lịch sử."
          : "Nội dung học tập và lịch sử được giữ nguyên.",
    };
  });
  preview.count = ids.size;
  preview.requiredConfirmations = [...new Set(preview.requiredConfirmations)];
  m.previews[preview.previewId] = {
    preview,
    request,
    revision: m.revision,
    actorId: staff.id,
  };
  return preview;
}
export function commitPreview(
  db: Database,
  staff: Teacher,
  input: unknown,
  key: string,
) {
  const m = management(db),
    b = obj(input),
    previewId = String(b.previewId),
    existing = m.commits[key];
  if (!capabilities(staff, "manager").manage)
    reject(403, "FORBIDDEN", "Quyền quản lý đã bị thu hồi.");
  if (!key || key.length > 200)
    reject(422, "IDEMPOTENCY_REQUIRED", "Cần Idempotency-Key.");
  if (existing) {
    if (existing.previewId !== previewId || existing.actorId !== staff.id)
      reject(409, "IDEMPOTENCY_CONFLICT", "Khóa đã dùng cho yêu cầu khác.");
    return existing.data;
  }
  const item = m.previews[previewId];
  if (!item || item.actorId !== staff.id)
    reject(404, "PREVIEW_NOT_FOUND", "Không có preview của bạn.");
  const p = item.preview;
  if (Date.parse(p.expiresAt) <= Date.now())
    reject(410, "PREVIEW_EXPIRED", "Preview đã hết hạn.");
  if (item.revision !== m.revision || b.version !== p.version)
    reject(409, "VERSION_CONFLICT", "Dữ liệu đã thay đổi. Xem trước lại.");
  if (p.errors.length)
    reject(422, "PREVIEW_INVALID", "Sửa tất cả lỗi trước khi cập nhật.");
  const confirmed = Array.isArray(b.confirmations) ? b.confirmations : [],
    reason = String(b.reason ?? "").trim();
  if (p.requiredConfirmations.some((c) => !confirmed.includes(c)))
    reject(422, "CONFIRM_REQUIRED", "Cần xác nhận đầy đủ ảnh hưởng.");
  if (p.requiredConfirmations.length && !reason)
    reject(422, "REASON_REQUIRED", "Nhập lý do thay đổi.");
  // Rebuild inside the transaction using the frozen selection/rows, never accept client diff.
  if (!item.extra) {
    const checked = buildPreview(db, staff, item.request, false);
    if (checked.errors.length)
      reject(422, "PREVIEW_INVALID", "Dữ liệu không còn hợp lệ.");
    delete m.previews[checked.previewId];
  }
  for (const c of p.changes) {
    setEntity(m, c.entity, c.after, c.id);
    renameReferences(db, c.entity, c.id, c.after.id);
    lifecycle(db, c.entity, c.before, c.after, reason);
  }
  if (item.extra?.kind === "enrollmentDates")
    applyEnrollmentDates(db, item.extra.data, reason);
  if (item.extra?.kind === "assignment")
    applyAssignment(db, item.extra.data, reason);
  if (item.extra?.kind === "enrollment")
    applyEnrollment(db, item.extra.data, reason);
  m.revision++;
  sync(db);
  m.audit.unshift({
    id: uid(),
    at: now(),
    actorId: staff.id,
    action: item.extra?.kind === "enrollmentDates" ? "CORRECT_DATES" : item.extra?.kind ?? "PREVIEW_COMMIT",
    entity: item.request.entity,
    ids: item.extra
      ? [
          String(item.extra.data.classId),
          String(item.extra.data.teacherId ?? item.extra.data.studentId),
        ]
      : p.changes.map((c) => c.id),
    reason,
    changes: p.changes.map((c) => ({
      id: c.id,
      fields: Object.keys(c.after).filter(
        (k) =>
          JSON.stringify(
            (c.before as unknown as Record<string, unknown> | null)?.[k],
          ) !==
          JSON.stringify((c.after as unknown as Record<string, unknown>)[k]),
      ),
    })),
  });
  const data = { updated: item.extra ? 1 : p.count };
  m.commits[key] = { previewId, actorId: staff.id, data };
  return data;
}
function applyAssignment(
  db: Database,
  data: Record<string, unknown>,
  reason: string,
) {
  const m = management(db),
    classId = String(data.classId),
    teacherId = String(data.teacherId),
    labelId = String(data.labelId),
    status = String(data.status) as TeacherClassAssignment["status"];
  const a = m.assignments.find(
      (a) => a.classId === classId && a.teacherId === teacherId,
    ),
    at = now();
  if (a) {
    const last = a.history.at(-1);
    if (last?.status === "ACTIVE") {
      last.endAt = at;
      last.status = status === "ACTIVE" ? "ENDED" : status;
      last.reason = reason;
    }
    a.status = status;
    a.requiresReconfirmation = false;
    a.labelId = labelId;
    a.startAt = at;
    a.endAt = status === "ACTIVE" ? null : at;
    a.version++;
    a.updatedAt = at;
    a.history.push({ startAt: at, endAt: a.endAt, status, labelId, reason });
  } else
    m.assignments.push({
      id: uid(),
      version: 1,
      createdAt: at,
      updatedAt: at,
      classId,
      teacherId,
      labelId,
      status,
      startAt: at,
      endAt: status === "ACTIVE" ? null : at,
      history: [
        {
          startAt: at,
          endAt: status === "ACTIVE" ? null : at,
          status,
          labelId,
          reason,
        },
      ],
    });
}
function applyEnrollment(
  db: Database,
  data: Record<string, unknown>,
  reason: string,
) {
  const m = management(db),
    studentId = String(data.studentId),
    classId = String(data.classId),
    status = String(data.status) as "ACTIVE" | "ENDED" | "COMPLETED",
    at = now(),
    e = m.enrollments.find(
      (e) => e.studentId === studentId && e.classId === classId,
    );
  const joining =
    typeof data.joinedOn === "string"
      ? new Date(`${data.joinedOn}T00:00:00+07:00`).toISOString()
      : at;
  if (e && e.status === status) {
    if (typeof data.joinedOn === "string") {
      e.joinedOn = data.joinedOn;
      const phase = e.history.at(-1);
      if (phase) phase.startAt = joining;
    }
    e.version++;
    e.updatedAt = at;
  } else if (e) {
    e.joinedOn =
      typeof data.joinedOn === "string"
        ? data.joinedOn
        : new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Ho_Chi_Minh",
          }).format(new Date(at));
    const last = e.history.at(-1);
    if (last?.status === "ACTIVE") {
      last.status = "ENDED";
      last.endAt = at;
      last.reason = reason;
    }
    e.status = status;
    e.version++;
    e.updatedAt = at;
    e.history.push({
      startAt: joining,
      endAt: status === "ACTIVE" ? null : at,
      status,
      reason,
    });
  } else
    m.enrollments.push({
      id: uid(),
      studentId,
      joinedOn:
        typeof data.joinedOn === "string"
          ? data.joinedOn
          : new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Ho_Chi_Minh",
            }).format(new Date(at)),
      classId,
      status,
      version: 1,
      createdAt: at,
      updatedAt: at,
      history: [
        {
          startAt: joining,
          endAt: status === "ACTIVE" ? null : at,
          status,
          reason,
        },
      ],
    });
  if (status === "ACTIVE")
    for (const a of db.assessments.filter((a) =>
      db.sessions.some((s) => s.id === a.sessionId && s.classId === classId),
    ))
      if (!db.results[a.id]?.some((r) => r.studentId === studentId))
        (db.results[a.id] ??= []).push(emptyResult(studentId, a.skills));
}
function relationshipPreview(
  db: Database,
  staff: Teacher,
  kind: "assignment" | "enrollment",
  input: unknown,
) {
  const m = management(db),
    data = obj(input),
    classId = String(data.classId),
    c = m.classes.find((c) => c.id === classId);
  if (!c) reject(404, "NOT_FOUND", "Lớp không tồn tại.");
  if (!capabilities(staff, "manager").manage)
    reject(403, "FORBIDDEN", "Cần quyền quản lý.");
  if (kind === "assignment") {
    const teacher = m.teachers.find((t) => t.id === data.teacherId),
      existing = m.assignments.find(
        (a) => a.classId === classId && a.teacherId === data.teacherId,
      );
    if (
      !teacher ||
      !["ACTIVE", "ENDED", "COMPLETED"].includes(String(data.status))
    )
      reject(422, "INVALID_ASSIGNMENT", "Phân công không hợp lệ.");
    if (existing && data.version !== existing.version)
      reject(409, "VERSION_CONFLICT", "Phân công đã thay đổi.");
    if (!existing && data.status !== "ACTIVE")
      reject(422, "INVALID_ASSIGNMENT", "Phân công mới phải ACTIVE.");
    if (
      data.status === "ACTIVE" &&
      (c.status !== "ACTIVE" ||
        teacher.status !== "ACTIVE" ||
        !m.accounts.some(
          (a) =>
            a.profileId === teacher.id &&
            a.status === "ACTIVE" &&
            a.roles.includes("TEACHER"),
        ))
    )
      reject(
        422,
        "INVALID_ASSIGNMENT",
        "Cần lớp ACTIVE, hồ sơ/tài khoản ACTIVE và vai trò TEACHER.",
      );
    const label = m.labels.find((l) => l.id === data.labelId);
    if (
      !label ||
      (label.status !== "ACTIVE" &&
        (existing?.labelId !== label.id ||
          (data.status === "ACTIVE" && existing?.status !== "ACTIVE")))
    )
      reject(422, "LABEL_INACTIVE", "Nhãn đã ngừng sử dụng, không gắn mới.");
  } else {
    const student = m.students.find((s) => s.id === data.studentId),
      existing = m.enrollments.find(
        (e) => e.classId === classId && e.studentId === data.studentId,
      );
    if (
      !student ||
      !["ACTIVE", "ENDED", "COMPLETED"].includes(String(data.status)) ||
      (data.status === "COMPLETED" && existing?.status !== "COMPLETED")
    )
      reject(422, "INVALID_ENROLLMENT", "Ghi danh không hợp lệ.");
    if (existing && data.version !== existing.version)
      reject(409, "VERSION_CONFLICT", "Ghi danh đã thay đổi.");
    if (data.joinedOn !== undefined) {
      const day = String(data.joinedOn),
        today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Ho_Chi_Minh",
        }).format(new Date());
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
        Number.isNaN(Date.parse(day)) ||
        new Date(day).toISOString().slice(0, 10) !== day ||
        day > today ||
        day < `${Number(today.slice(0, 4)) - 10}${today.slice(4)}`
      )
        reject(
          422,
          "INVALID_JOINED_DATE",
          "Ngày tham gia phải là hôm nay hoặc quá khứ, tối đa 10 năm.",
        );
      const previous = existing?.history.at(
        data.status === "ACTIVE" && existing.status !== "ACTIVE" ? -1 : -2,
      );
      if (
        previous?.endAt &&
        day <
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Ho_Chi_Minh",
          }).format(new Date(previous.endAt))
      )
        reject(
          409,
          "ENROLLMENT_OVERLAP",
          "Ngày tham gia chồng lên giai đoạn học trước đó.",
        );
    }
    if (
      data.status === "ACTIVE" &&
      existing?.status !== "ACTIVE" &&
      (student.status !== "ACTIVE" || !["ACTIVE", "DRAFT"].includes(c.status))
    )
      reject(
        422,
        "INVALID_ENROLLMENT",
        "Cần học sinh hoạt động và lớp ACTIVE / DRAFT.",
      );
  }
  const future = structuredClone(db);
  if (kind === "assignment") applyAssignment(future, data, "Preview");
  else applyEnrollment(future, data, "Preview");
  const names = validTeachers(management(future), classId).map(
    (t) => t.fullName,
  );
  const p: BulkPreview = {
    previewId: uid(),
    version: 1,
    count: 1,
    scope:
      kind === "assignment"
        ? "Phân công riêng của lớp"
        : "Ghi danh riêng của lớp",
    changes: [],
    impacts: [
      {
        classId,
        className: c.name,
        remainingTeachers: names,
        afterUnstaffed: c.status === "ACTIVE" && !names.length,
        message:
          kind === "assignment"
            ? `Phân công → ${String(data.status)}; giữ lịch sử.`
            : `Ghi danh → ${String(data.status)}; không xóa điểm.`,
      },
    ],
    warnings: [],
    errors: [],
    requiredConfirmations: ["RELATIONSHIP_IMPACT"],
    expiresAt: new Date(Date.now() + 600000).toISOString(),
  };
  m.previews[p.previewId] = {
    preview: p,
    request: { entity: "classes" },
    revision: m.revision,
    actorId: staff.id,
    extra: { kind, id: classId, data },
  };
  return p;
}
export function stats(db: Database, filter: StatsFilter) {
  const m = management(db),
    classes = m.classes
      .filter(
        (c) =>
          (!filter.classId || c.id === filter.classId) &&
          (!filter.status || c.status === filter.status),
      )
      .map((c) => classView(db, c));
  const from = filter.from || "0001-01-01",
    to = filter.to || "9999-12-31";
  if (
    from > to ||
    (filter.from && !/^\d{4}-\d{2}-\d{2}$/.test(filter.from)) ||
    (filter.to && !/^\d{4}-\d{2}-\d{2}$/.test(filter.to))
  )
    reject(422, "INVALID_RANGE", "Khoảng ngày không hợp lệ.");
  const completed = db.sessions.filter(
    (s) =>
      classes.some((c) => c.id === s.classId) &&
      s.status === "COMPLETED" &&
      s.date >= from &&
      s.date <= to,
  );
  const first = completed.filter(
    (s) =>
      s.unitNumber !== null &&
      !db.sessions.some(
        (p) =>
          p.classId === s.classId &&
          p.unitNumber === s.unitNumber &&
          p.status === "COMPLETED" &&
          p.date < from,
      ),
  );
  const linkedStudents = new Set(
    m.enrollments
      .filter(
        (e) => classes.some((c) => c.id === e.classId) && e.status === "ACTIVE",
      )
      .map((e) => e.studentId),
  );
  const scoped = !!(filter.classId || filter.status),
    teachers = new Set(
      classes.flatMap((c) => validTeachers(m, c.id).map((t) => t.id)),
    );
  const byStatus = {
    DRAFT: 0,
    ACTIVE: 0,
    PAUSED: 0,
    COMPLETED: 0,
    INACTIVE: 0,
  };
  for (const c of classes) byStatus[c.status]++;
  return {
    asOf: now(),
    activeStudents: m.students.filter(
      (s) => s.status === "ACTIVE" && (!scoped || linkedStudents.has(s.id)),
    ).length,
    activeTeachers: m.teachers.filter(
      (t) =>
        t.status === "ACTIVE" &&
        linkedRoles(m, t.id).includes("TEACHER") &&
        (!scoped || teachers.has(t.id)),
    ).length,
    pendingAccounts: m.accounts.filter(
      (a) =>
        a.status === "PENDING" &&
        (!scoped ||
          linkedStudents.has(a.profileId) ||
          teachers.has(a.profileId)),
    ).length,
    dualRoleStaff: m.accounts.filter(
      (a) =>
        a.status === "ACTIVE" &&
        a.roles.length === 2 &&
        m.teachers.some((t) => t.id === a.profileId && t.status === "ACTIVE") &&
        (!scoped || teachers.has(a.profileId)),
    ).length,
    byStatus,
    classes,
    completedUnits: classes.reduce((n, c) => n + c.completedUnits, 0),
    totalUnits: classes.reduce((n, c) => n + c.totalUnits, 0),
    warnings: warningClasses(db).filter((w) =>
      classes.some((c) => c.id === w.classId),
    ),
    interval: {
      from: filter.from,
      to: filter.to,
      completedSessions: completed.length,
      newlyCompletedUnits: new Set(
        first.map((s) => `${s.classId}:${s.unitNumber}`),
      ).size,
      denominator: classes.reduce((n, c) => n + c.totalUnits, 0),
    },
  };
}

function enrollmentDates(db: Database, classId: string, studentId: string): EnrollmentDates {
  const enrollment = management(db).enrollments.find(e => e.classId === classId && e.studentId === studentId);
  if (!enrollment) reject(404, "NOT_FOUND", "Không tìm thấy ghi danh.");
  const day = (at: string) => new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Ho_Chi_Minh"}).format(new Date(at));
  const history = enrollment.history.map((p, i) => ({
    ...p, id: p.id ?? `${enrollment.id}:period:${i}`,
    joinedOn: p.joinedOn ?? day(p.startAt), endedOn: p.endedOn ?? (p.endAt ? day(p.endAt) : null),
  }));
  return {...enrollment, datesConfirmed: enrollment.datesConfirmed ?? false,
    dateSource: enrollment.datesConfirmed ? "MANAGER_CONFIRMED" : "RECORDED_UNVERIFIED",
    recordedAt: enrollment.recordedAt ?? enrollment.createdAt,
    joinedOn: history.at(-1)?.joinedOn, endedOn: history.at(-1)?.endedOn, history};
}
function checkEnrollmentDates(db: Database, input: unknown) {
  const request = obj(input) as unknown as EnrollmentDatesRequest;
  const before = enrollmentDates(db, request.classId, request.studentId);
  if (before.version !== request.version) reject(409, "VERSION_CONFLICT", "Ghi danh đã thay đổi. Xem trước lại.");
  if (!Array.isArray(request.periods) || request.periods.some(p => !p || typeof p.id !== "string" || typeof p.joinedOn !== "string" || !(p.endedOn === null || typeof p.endedOn === "string")))
    reject(422, "INVALID_ENROLLMENT_PERIODS", "Các đợt ghi danh không hợp lệ.");
  const today = new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Ho_Chi_Minh"}).format(new Date());
  const errors = validateEnrollmentDates(request.periods, before.history, today);
  if (errors.length) reject(422, "INVALID_ENROLLMENT_PERIODS", errors.join(" "));
  return {request, before};
}
function applyEnrollmentDates(db: Database, input: Record<string, unknown>, reason: string) {
  const {request, before} = checkEnrollmentDates(db, input);
  const e = management(db).enrollments.find(e => e.id === before.id)!;
  e.history = before.history.map((h, i) => {
    const p = request.periods[i];
    const start = i > 0 && request.periods[i - 1].endedOn === p.joinedOn
      ? new Date(Date.parse(`${p.joinedOn}T00:00:00+07:00`) + 86400000 - 1).toISOString()
      : new Date(`${p.joinedOn}T00:00:00+07:00`).toISOString();
    return {...h, ...p, startAt: start,
      endAt: p.endedOn ? new Date(Date.parse(`${p.endedOn}T00:00:00+07:00`) + 86400000 - 1).toISOString() : null,
      reason};
  });
  e.joinedOn = request.periods.at(-1)!.joinedOn;
  e.endedOn = request.periods.at(-1)!.endedOn;
  e.datesConfirmed = true;
  e.recordedAt = before.recordedAt;
  e.updatedAt = now();
  e.version++;
}

export async function managementRequest(
  db: Database,
  staff: Teacher,
  req: FetchArgs,
  save: (db: Database) => void,
): Promise<{ data: unknown } | undefined> {
  const path = req.url.split("?")[0],
    method = req.method ?? "GET",
    m = management(db),
    params = new URLSearchParams(req.url.split("?")[1]);
  if (!path.startsWith("/manager/")) return undefined;
  if (!capabilities(staff, "manager").manage)
    reject(403, "FORBIDDEN", "Cần vai trò MANAGER hoạt động.");
  const envelope = (data: unknown) => ({ data: { data } }),
    filter: ListFilter = {
      search: params.get("search") ?? "",
      status: params.get("status") ?? "",
      classId: params.get("classId") ?? "",
      accountStatus: params.get("accountStatus") ?? "",
      role: params.get("role") ?? "",
    };
  const sessionMatch = path.match(/^\/manager\/accounts\/([^/]+)\/(session-policy|sessions\/revoke|login-history)$/);
  if (sessionMatch) {
    const a = m.accounts.find((a) => a.id === decodeURIComponent(sessionMatch[1]));
    if (!a) reject(404, "NOT_FOUND", "Không tìm thấy tài khoản.");
    const activeTokens = () => Object.entries(db.tokens).filter(([, s]) => a.kind === "STAFF" && s.teacher.id === a.profileId && Date.parse(s.expiresAt) > Date.now());
    const studentSessions = () => (m.studentSessions ?? []).filter((s) => a.kind === "STUDENT" && s.accountId === a.id && !s.revokedAt && Date.parse(s.expiresAt) > Date.now());
    const policy = () => { const serverNow = now(), previewExpiresAt = sessionExpiry(serverNow, a.sessionDuration, a.sessionLifetimeMinutes ?? 60); return { accountId: a.id, defaultLifetimeMinutes: 60, sessionDuration: a.sessionDuration ?? null, serverNow, previewExpiresAt, sessionLifetimeMinutes: a.sessionLifetimeMinutes ?? null, effectiveLifetimeMinutes: (Date.parse(previewExpiresAt) - Date.parse(serverNow)) / 60000, activeSessionCount: activeTokens().length + studentSessions().length, managerProtected: a.kind === "STAFF" && a.roles.includes("MANAGER"), version: a.version }; };
    if (sessionMatch[2] === "login-history" && method === "GET") {
      const page = Number(params.get("page") ?? 1), pageSize = Number(params.get("pageSize") ?? 10);
      if (!Number.isInteger(page) || page < 1 || page > 100000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) reject(400, "VALIDATION_ERROR", "Phân trang không hợp lệ.");
      const history = (m.loginHistory ?? []).filter((s) => s.accountId === a.id).sort((left, right) => Date.parse(right.loggedInAt) - Date.parse(left.loggedInAt));
      return envelope({ items: history.slice((page - 1) * pageSize, page * pageSize).map((entry) => ({ loggedInAt: entry.loggedInAt, expiresAt: entry.expiresAt, revokedAt: entry.revokedAt, ipAddress: entry.ipAddress, device: entry.device, browser: entry.browser, operatingSystem: entry.operatingSystem })), total: history.length, page, pageSize });
    }
    if (sessionMatch[2] === "session-policy" && method === "GET") return envelope(policy());
    if (!(sessionMatch[2] === "session-policy" && method === "PATCH") && !(sessionMatch[2] === "sessions/revoke" && method === "POST")) reject(405, "METHOD_NOT_ALLOWED", "Phương thức không hợp lệ.");
    const b = obj(req.body), reason = typeof b.reason === "string" ? b.reason.trim() : "";
    if (!reason || reason.length > 500) reject(422, "VALIDATION_ERROR", "Nhập lý do từ 1 đến 500 ký tự.");
    const revoke = sessionMatch[2] === "sessions/revoke";
    if (revoke && policy().managerProtected) reject(403, "MANAGER_PROTECTED", "Không được buộc hết phiên tài khoản có vai trò MANAGER.");
    if (b.version !== a.version) reject(409, "VERSION_CONFLICT", "Dữ liệu đã thay đổi. Tải lại để xem phiên bản mới.");
    let revokedSessions = 0;
    if (revoke) {
      const tokens = activeTokens(), students = studentSessions();
      revokedSessions = tokens.length + students.length;
      for (const [token] of tokens) delete db.tokens[token];
      for (const s of students) s.revokedAt = now();
      for (const entry of m.loginHistory ?? []) if (entry.accountId === a.id && !entry.revokedAt && Date.parse(entry.expiresAt) > Date.now()) entry.revokedAt = now();
    } else {
      const lifetime = b.sessionLifetimeMinutes ?? null, duration = b.sessionDuration ?? null;
      if (lifetime !== null && duration !== null) reject(422, "VALIDATION_ERROR", "Chỉ chọn một cách đặt thời hạn phiên.");
      try { sessionExpiry(now(), duration as SessionDuration | null, lifetime as number | undefined ?? 60); } catch (error) { reject(422, "VALIDATION_ERROR", error instanceof Error ? error.message : "Thời hạn không hợp lệ."); }
      a.sessionLifetimeMinutes = lifetime as number | null; a.sessionDuration = duration as SessionDuration | null;
    }
    a.version++; a.updatedAt = now(); m.revision++;
    m.audit.unshift({ id: uid(), at: now(), actorId: staff.id, action: revoke ? "REVOKE_SESSIONS" : "UPDATE_SESSION_POLICY", entity: "accounts", ids: [a.id], reason, changes: [{ id: a.id, fields: [revoke ? "sessions" : "sessionLifetimeMinutes"] }] });
    save(db); return envelope(revoke ? { revokedSessions, policy: policy() } : policy());
  }
  if (path === "/manager/dashboard")
    return envelope(
      stats(db, {
        from: params.get("from") ?? "",
        to: params.get("to") ?? "",
        classId: filter.classId ?? "",
        status: filter.status ?? "",
      }),
    );
  if (path === "/manager/identifiers/suggest" || path === "/manager/identifiers/check") {
    const b = obj(req.body), entity = String(b.entity) as Entity;
    if (!["students", "teachers", "classes", "labels"].includes(entity)) reject(400, "INVALID_ENTITY", "Nhóm không hợp lệ.");
    const requestedId = String(b.id ?? "").trim() || (entity === "classes" ? `${m.settings?.classIdPrefix ?? "ess"}${Math.max(20, m.lastClassNumber ?? 20, ...m.classes.map(c => Number(c.id.match(/[0-9]+/)?.[0] ?? 0))) + 1}` : nameIdentifier(String(b.fullName ?? "")));
    const used = new Set((entity === "classes" || entity === "labels" ? m[entity].map(r => r.id) : [...m.students.map(s => s.id), ...m.teachers.map(t => t.id), ...m.accounts.map(a => a.loginId)]).map(x => x.toLowerCase()));
    if (b.excludeId) { used.delete(String(b.excludeId).toLowerCase()); }
    return envelope({ id: availableIdentifier(requestedId, used), isAvailable: !used.has(requestedId.toLowerCase()), requestedId });
  }
  if (path === "/manager/selection/count") {
    const b = obj(req.body),
      entity = String(b.entity) as Entity;
    if (!Object.hasOwn(entitySchemas, entity))
      reject(422, "INVALID_ENTITY", "Nhóm không hợp lệ.");
    return envelope({
      count: selected(db, entity, b.selection as Selection).length,
    });
  }
  if (path === "/manager/warnings") return envelope(warningClasses(db));
  if (path === "/manager/audit") {
    const page = Math.max(1, Number(params.get("page")) || 1),
      pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize")) || 20)),
      items = m.audit.map(e => { const person = m.teachers.find(t => t.id === e.actorId) ?? m.students.find(s => s.id === e.actorId); return { ...e, actorUserId: e.actorUserId ?? person?.id, actorLoginId: e.actorLoginId ?? m.accounts.find(a => a.profileId === e.actorId)?.loginId, actorName: e.actorName ?? person?.fullName ?? "Hệ thống" }; }).filter(
        (e) =>
          !params.get("search") ||
          `${e.action} ${e.ids} ${e.actorId} ${e.actorName} ${e.actorLoginId}`.includes(params.get("search")!),
      );
    return envelope({
      items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize,
      total: items.length,
    });
  }
  if (path === "/manager/enrollments/dates" && method === "GET")
    return envelope(enrollmentDates(db, params.get("classId") ?? "", params.get("studentId") ?? ""));
  if (path === "/manager/enrollments/dates/preview" && method === "POST") {
    const {request} = checkEnrollmentDates(db, req.body);
    const p: BulkPreview = {
      previewId: uid(), version: 1, count: 1, scope: "Ngày ghi danh thực tế",
      changes: [], impacts: [], warnings: [], errors: [], requiredConfirmations: ["ENROLLMENT_DATES"],
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    };
    m.previews[p.previewId] = {preview: p, request: {entity: "classes"}, revision: m.revision, actorId: staff.id,
      extra: {kind: "enrollmentDates", id: request.classId, data: {...request}}};
    save(db);
    return envelope(p);
  }
  if (path === "/manager/changes/preview") {
    const p = buildPreview(
      db,
      staff,
      obj(req.body) as unknown as PreviewRequest,
    );
    save(db);
    return envelope(p);
  }
  if (path === "/manager/changes/commit") {
    const data = commitPreview(
      db,
      staff,
      req.body,
      requestHeaders(req.headers).get("Idempotency-Key") ?? "",
    );
    save(db);
    return envelope(data);
  }
  if (
    path === "/manager/assignments/preview" ||
    path === "/manager/enrollments/preview"
  ) {
    const p = relationshipPreview(
      db,
      staff,
      path.includes("assignments") ? "assignment" : "enrollment",
      req.body,
    );
    save(db);
    return envelope(p);
  }
  if (path === "/manager/assignments")
    return envelope(
      m.assignments.filter(
        (a) =>
          (!params.get("classId") || a.classId === params.get("classId")) &&
          (!params.get("teacherId") || a.teacherId === params.get("teacherId")),
      ),
    );
  let match = path.match(
    /^\/manager\/(students|teachers|classes|accounts|labels)(?:\/([^/]+))?$/,
  );
  if (match) {
    const entity = match[1] as Entity,
      recordId = match[2] ? decodeURIComponent(match[2]) : undefined;
    if (method !== "GET")
      reject(
        405,
        "PREVIEW_REQUIRED",
        "Dùng preview/commit để kiểm tra ảnh hưởng.",
      );
    if (!recordId) {
      const page = Math.max(1, Number(params.get("page")) || 1),
        pageSize = Math.min(
          100,
          Math.max(1, Number(params.get("pageSize")) || 10),
        ),
        rows = m[entity].filter((r) => matches(db, entity, r, filter));
      return envelope({
        items: rows
          .slice((page - 1) * pageSize, page * pageSize)
          .map((r) =>
            entity === "classes" ? classView(db, r as ManagedClass) : r,
          ),
        total: rows.length,
        page,
        pageSize,
      });
    }
    const record = m[entity].find((r) => r.id === recordId);
    if (!record) reject(404, "NOT_FOUND", "Không tìm thấy hồ sơ.");
    const assignments = m.assignments.filter((a) =>
        entity === "classes"
          ? a.classId === recordId
          : entity === "teachers"
            ? a.teacherId === recordId
            : false,
      ),
      enrollments = m.enrollments.filter((e) =>
        entity === "classes"
          ? e.classId === recordId
          : entity === "students"
            ? e.studentId === recordId
            : false,
      );
    return envelope({
      record:
        entity === "classes" ? classView(db, record as ManagedClass) : record,
      accounts: m.accounts.filter(
        (a) =>
          a.profileId === recordId &&
          (entity === "teachers"
            ? a.kind === "STAFF"
            : entity === "students" && a.kind === "STUDENT"),
      ),
      classes: m.classes
        .filter((c) =>
          entity === "classes"
            ? c.id === recordId
            : assignments.some((a) => a.classId === c.id) ||
              enrollments.some((e) => e.classId === c.id),
        )
        .map((c) => classView(db, c)),
      assignments,
      enrollments,
      labels: m.labels,
      teachers: m.teachers.filter((t) =>
        assignments.some((a) => a.teacherId === t.id),
      ),
      students: m.students.filter((s) =>
        enrollments.some((e) => e.studentId === s.id),
      ),
    });
  }
  match = path.match(/^\/manager\/accounts\/([^/]+)\/activation$/);
  if (match && method === "POST") {
    const a = m.accounts.find((a) => a.id === decodeURIComponent(match![1]));
    if (!a) reject(404, "NOT_FOUND", "Tài khoản không tồn tại.");
    if (a.status === "LOCKED")
      reject(422, "ACCOUNT_LOCKED", "Mở khóa tài khoản trước khi cấp link.");
    for (const item of Object.values(m.activations))
      if (item.accountId === a.id) item.used = true;
    const code = uid() + uid(),
      expiresAt = new Date(Date.now() + 600000).toISOString();
    m.activations[code] = { accountId: a.id, expiresAt, used: false };
    m.audit.unshift({
      id: uid(),
      at: now(),
      actorId: staff.id,
      action: "ACTIVATION_ISSUED",
      entity: "accounts",
      ids: [a.id],
      reason: "Cấp link ngắn hạn, không lưu mã vào nhật ký",
      changes: [],
    });
    save(db);
    return envelope({ code, expiresAt, kind: a.kind });
  }
  match = path.match(
    /^\/manager\/(students|teachers)\/excel\/(template|export|preview)$/,
  );
  if (match) {
    const entity = match[1] as "students" | "teachers",
      action = match[2],
      excel = await import("@/features/management/excel-workbook");
    if (action === "template")
      return {
        data: await excel.profileWorkbook(entity, [], "Template trống"),
      };
    if (action === "export") {
      const s = obj(req.body).selection as Selection,
        rows = selected(db, entity, s).map((r) => ({
          ...r,
          ...(entity === "teachers" ? { roles: linkedRoles(m, r.id) } : {}),
        }));
      return {
        data: await excel.profileWorkbook(
          entity,
          rows,
          s.mode === "FILTER"
            ? `Toàn bộ filter: ${JSON.stringify(s.filter)}; ${rows.length} bản ghi`
            : `Các ID chọn; ${rows.length} bản ghi`,
        ),
      };
    }
    if (
      !(req.body instanceof FormData) ||
      !(req.body.get("file") instanceof Blob)
    )
      reject(422, "INVALID_FILE", "Chọn file .xlsx.");
    const mode = req.body.get("mode") === "UPDATE" ? "UPDATE" : "CREATE";
    const parsed = await excel
        .readProfiles(req.body.get("file") as Blob, entity, mode)
        .catch((e) =>
          reject(
            422,
            "INVALID_TEMPLATE",
            e instanceof Error ? e.message : "File không hợp lệ",
          ),
        ),
      clear = String(req.body.get("clearFields") ?? "")
        .split(",")
        .filter(Boolean);
    const p = buildPreview(db, staff, {
      entity,
      rows: parsed.rows,
      mode,
      clearFields: clear,
    });
    p.errors.push(...parsed.errors);
    save(db);
    return envelope(p);
  }
  return reject(404, "NOT_FOUND", "Endpoint quản lý không tồn tại.");
}
