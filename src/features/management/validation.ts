import { z } from "zod";
import type { Entity, Role } from "./models";
const text = z.string().max(4000, "Tối đa 4000 ký tự");
const name = z.string().trim().min(1, "Bắt buộc nhập").max(200);
const id = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{1,63}$/, "ID gồm 2–64 chữ, số, dấu . _ -");
export const profileStatus = z.enum(["ACTIVE", "PAUSED", "INACTIVE"]);
export const rolesInput = z
  .array(z.enum(["TEACHER", "MANAGER"]))
  .min(1, "Chọn ít nhất một vai trò")
  .refine((r) => new Set(r).size === r.length, "Vai trò bị trùng");
export const dateInput = z
  .string()
  .refine(
    (s) =>
      !s ||
      (/^\d{4}-\d{2}-\d{2}$/.test(s) &&
        !Number.isNaN(Date.parse(s)) &&
        new Date(s).toISOString().slice(0, 10) === s &&
        s <= new Date().toISOString().slice(0, 10)),
    "Ngày sinh YYYY-MM-DD hợp lệ, không ở tương lai",
  )
  .nullable();
const contact = z.string().max(200);
const email = z
  .string()
  .refine((v) => !v || z.email().safeParse(v).success, "Email không hợp lệ");
export const studentProfileInput = z.object({
  id: id.or(z.literal("")),
  fullName: name,
  nickname: text,
  dateOfBirth: dateInput,
  parentContact: contact,
  status: profileStatus,
  notes: text,
});
export const staffProfileInput = z.object({
  id: id.or(z.literal("")),
  fullName: name,
  email,
  phone: contact.refine(
    (v) => !v || /^[+0-9().\s-]{6,32}$/.test(v),
    "Điện thoại không hợp lệ",
  ),
  status: profileStatus,
  notes: text,
});
export const classProfileInput = z.object({
  id: id.or(z.literal("")),
  code: z.string().max(200),
  name: z.string().max(200),
  nameSuffix: z.string().max(160).optional(),
  schedule: name,
  totalUnits: z.number().int().min(1).max(1000),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "INACTIVE"]),
  notes: text,
});
export const accountInput = z
  .object({
    id,
    loginId: id,
    profileId: name,
    kind: z.enum(["STUDENT", "STAFF"]),
    roles: z.array(z.enum(["TEACHER", "MANAGER"])),
    status: z.enum(["PENDING", "ACTIVE", "LOCKED"]),
  })
  .superRefine((a, c) => {
    if (
      a.kind === "STAFF" &&
      (!a.roles.length || new Set(a.roles).size !== a.roles.length)
    )
      c.addIssue({
        code: "custom",
        path: ["roles"],
        message: "Staff cần vai trò duy nhất TEACHER / MANAGER",
      });
    if (a.kind === "STUDENT" && a.roles.length)
      c.addIssue({
        code: "custom",
        path: ["roles"],
        message: "Học sinh không có vai trò Staff",
      });
  });
export const labelInput = z.object({
  id,
  name,
  status: z.enum(["ACTIVE", "INACTIVE"]),
  notes: text,
});
export const entitySchemas = {
  students: studentProfileInput,
  teachers: staffProfileInput,
  classes: classProfileInput,
  accounts: accountInput,
  labels: labelInput,
};
const selectionIds = z
  .array(id)
  .max(5000)
  .refine(
    (values) => new Set(values).size === values.length,
    "ID lựa chọn bị trùng",
  );
export const selectionInput = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("IDS"), ids: selectionIds.min(1) }),
  z.object({
    mode: z.literal("FILTER"),
    filter: z.object({
      search: text.optional(),
      status: text.optional(),
      classId: text.optional(),
      accountStatus: text.optional(),
      role: text.optional(),
    }),
    excludedIds: selectionIds,
  }),
]);
export const previewRequestInput = z
  .object({
    entity: z.enum(["students", "teachers", "classes", "accounts", "labels"]),
    selection: selectionInput.optional(),
    patch: z.record(z.string(), z.unknown()).optional(),
    rows: z.array(z.record(z.string(), z.unknown())).max(5000).optional(),
    clearFields: z.array(z.string()).optional(),
    mode: z.enum(["CREATE", "UPDATE"]).optional(),
  })
  .refine(
    (r) => (r.rows !== undefined) !== (r.selection !== undefined),
    "Chọn bảng nhập hoặc phạm vi lựa chọn",
  )
  .refine((r) => !r.patch || !("id" in r.patch), "Không đổi ID bằng bulk");
export function parseRoles(v: unknown): Role[] {
  return typeof v === "string"
    ? (v
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean) as Role[])
    : Array.isArray(v)
      ? (v as Role[])
      : [];
}
export function defaults(
  entity: Entity,
  recordId = "",
): Record<string, unknown> {
  const shared = { id: recordId, status: "ACTIVE", notes: "" };
  if (entity === "students")
    return {
      ...shared,
      fullName: "",
      nickname: "",
      dateOfBirth: null,
      parentContact: "",
      createAccount: false,
    };
  if (entity === "teachers")
    return {
      ...shared,
      fullName: "",
      email: "",
      phone: "",
      roles: ["TEACHER"],
      createAccount: false,
    };
  if (entity === "classes")
    return {
      ...shared,
      code: "",
      name: "",
      nameSuffix: "",
      schedule: "",
      totalUnits: 12,
      status: "DRAFT",
    };
  if (entity === "accounts")
    return {
      id: recordId,
      loginId: "",
      kind: "STAFF",
      profileId: "",
      roles: ["TEACHER"],
      status: "PENDING",
    };
  return { ...shared, name: "" };
}
export const fieldNames: Record<string, string> = {
  id: "ID",
  fullName: "Họ tên",
  nickname: "Biệt danh",
  dateOfBirth: "Ngày sinh",
  parentContact: "Liên hệ phụ huynh",
  email: "Email",
  phone: "Điện thoại",
  notes: "Ghi chú",
  status: "Trạng thái",
  roles: "Vai trò",
  createAccount: "Tạo tài khoản",
  code: "Mã lớp",
  nameSuffix: "Hậu tố tên lớp",
  name: "Tên",
  schedule: "Lịch học",
  totalUnits: "Tổng Unit",
  loginId: "ID đăng nhập",
  kind: "Loại tài khoản",
  profileId: "ID hồ sơ liên kết",
  sessionLifetimeMinutes: "Thời hạn phiên (phút; trống = mặc định)",
};
export const fields: Record<Entity, string[]> = {
  students: [
    "fullName",
    "id",
    "nickname",
    "dateOfBirth",
    "parentContact",
    "status",
    "notes",
  ],
  teachers: ["fullName", "id", "email", "phone", "roles", "status", "notes"],
  classes: ["id", "nameSuffix", "name", "code", "schedule", "totalUnits", "status", "notes"],
  accounts: ["id", "loginId", "kind", "profileId", "roles", "status"],
  labels: ["id", "name", "status", "notes"],
};
