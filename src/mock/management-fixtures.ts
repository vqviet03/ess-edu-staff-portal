import type { Database } from "./fixtures";
import type {
  EntityMap,
  TeacherClassAssignment,
  Enrollment,
  BulkPreview,
  PreviewRequest,
  AuditEvent,
} from "@/features/management/models";
export interface ManagementDatabase {
  students: EntityMap["students"][];
  teachers: EntityMap["teachers"][];
  classes: EntityMap["classes"][];
  accounts: EntityMap["accounts"][];
  labels: EntityMap["labels"][];
  assignments: TeacherClassAssignment[];
  enrollments: Enrollment[];
  revision: number;
  previews: Record<
    string,
    {
      preview: BulkPreview;
      request: PreviewRequest;
      revision: number;
      actorId: string;
      extra?: {
        kind: "assignment" | "enrollment";
        id: string;
        data: Record<string, unknown>;
      };
    }
  >;
  commits: Record<
    string,
    { previewId: string; actorId: string; data: { updated: number } }
  >;
  activations: Record<
    string,
    { accountId: string; expiresAt: string; used: boolean }
  >;
  audit: AuditEvent[];
  settings?: import("@/features/settings/models").ApplicationSettings;
  settingsProposals?: import("@/features/settings/models").SettingsProposal[];
  passwordHashes?: Record<string, string>;
  lastClassNumber?: number;
  loginHistory?: { accountId: string; loggedInAt: string; expiresAt: string; revokedAt: string | null; ipAddress: string | null; device: string | null; browser: string | null; operatingSystem: string | null }[];
  studentSessions?: { id: string; accountId: string; expiresAt: string; revokedAt: string | null }[];
}
export function managementSeed(db: Database): ManagementDatabase {
  const at = "2026-09-01T00:00:00Z",
    v = { version: 1, createdAt: at, updatedAt: at };
  const students = Object.values(db.students)
    .flat()
    .map((s) => ({
      ...v,
      id: s.id,
      fullName: s.name,
      nickname: s.nickname,
      dateOfBirth: s.dateOfBirth,
      parentContact: "",
      status: s.status,
      notes: "",
    }));
  students.push(
    ...Array.from({ length: 15 }, (_, i) => ({
      ...v,
      id: `HV900${String(i).padStart(2, "0")}`,
      fullName: `Học sinh mẫu ${i + 1}`,
      nickname: "",
      dateOfBirth: null,
      parentContact: "",
      status: "ACTIVE" as const,
      notes: "",
    })),
  );
  const teachers = [
    {
      ...v,
      id: "GV0001",
      fullName: "Nguyễn Minh Anh",
      email: "teacher@ess.demo",
      phone: "",
      notes: "",
      status: "ACTIVE" as const,
    },
    {
      ...v,
      id: "MG0001",
      fullName: "Nguyễn Mai · Quản lý",
      email: "manager@ess.demo",
      phone: "",
      notes: "",
      status: "ACTIVE" as const,
    },
    {
      ...v,
      id: "BOTH0001",
      fullName: "Phạm Hà",
      email: "dual@ess.demo",
      phone: "",
      notes: "",
      status: "ACTIVE" as const,
    },
    {
      ...v,
      id: "GV0002",
      fullName: "Lê Linh",
      email: "linh@ess.demo",
      phone: "",
      notes: "",
      status: "ACTIVE" as const,
    },
    {
      ...v,
      id: "GV0003",
      fullName: "Trần An",
      email: "an@ess.demo",
      phone: "",
      notes: "",
      status: "INACTIVE" as const,
    },
  ];
  teachers.push(
    ...Array.from({ length: 12 }, (_, i) => ({
      ...v,
      id: `GV900${String(i).padStart(2, "0")}`,
      fullName: `Giảng viên mẫu ${i + 1}`,
      email: "",
      phone: "",
      notes: "",
      status: "ACTIVE" as const,
    })),
  );
  const accounts: ManagementDatabase["accounts"] = teachers.map((t) => ({
    ...v,
    id: `acc-${t.id}`,
    loginId: t.id,
    kind: "STAFF",
    profileId: t.id,
    roles:
      t.id === "MG0001"
        ? ["MANAGER"]
        : t.id === "BOTH0001"
          ? ["TEACHER", "MANAGER"]
          : ["TEACHER"],
    status: t.id.startsWith("GV9")
      ? "PENDING"
      : t.status === "ACTIVE"
        ? "ACTIVE"
        : "LOCKED",
  }));
  accounts.push(
    ...students.slice(0, 2).map((s) => ({
      ...v,
      id: `acc-${s.id}`,
      loginId: s.id,
      kind: "STUDENT" as const,
      profileId: s.id,
      roles: [],
      status: "PENDING" as const,
    })),
  );
  const classes = db.classes.map((c) => ({ ...c, ...v, notes: "" }));
  classes.push(
    ...[
      { id: "class-single", name: "Starters 02", status: "ACTIVE" as const },
      { id: "class-empty", name: "Juniors 04", status: "ACTIVE" as const },
      { id: "class-draft", name: "ESS · Lớp mới", status: "DRAFT" as const },
    ].map((c, i) => ({
      ...v,
      ...c,
      code: `ESS0${i + 1}`,
      schedule: "Thứ 2 · 18:00–19:30",
      studentCount: 0,
      totalUnits: 12,
      completedUnits: 0,
      notes: "",
    })),
  );
  db.classes = classes.map((c) => ({ ...c }));
  for (const c of classes) db.students[c.id] ??= [];
  const labels = [
    {
      ...v,
      id: "label-main",
      name: "Giảng viên chính",
      status: "ACTIVE" as const,
      notes: "",
    },
    {
      ...v,
      id: "label-assist",
      name: "Trợ giảng",
      status: "ACTIVE" as const,
      notes: "",
    },
    {
      ...v,
      id: "label-old",
      name: "Dạy thay",
      status: "INACTIVE" as const,
      notes: "Giữ lịch sử",
    },
  ];
  const make = (
    classId: string,
    teacherId: string,
    status: TeacherClassAssignment["status"],
    labelId = "label-main",
  ): TeacherClassAssignment => ({
    ...v,
    id: `assignment-${classId}-${teacherId}`,
    classId,
    teacherId,
    labelId,
    status,
    startAt: at,
    endAt: status === "ACTIVE" ? null : "2026-09-25T00:00:00Z",
    history: [
      {
        startAt: at,
        endAt: status === "ACTIVE" ? null : "2026-09-25T00:00:00Z",
        status,
        labelId,
        reason: "Phân công mẫu",
      },
    ],
  });
  const assignments = [
    make("class-green", "GV0001", "ACTIVE"),
    make("class-green", "GV0002", "ACTIVE", "label-assist"),
    make("class-single", "GV0001", "ACTIVE"),
    make("class-sun", "GV0001", "COMPLETED"),
    make("class-sky", "GV0001", "ENDED"),
    make("class-green", "BOTH0001", "ENDED"),
    make("class-single", "GV0003", "ENDED"),
  ];
  const enrollments: Enrollment[] = Object.entries(db.students).flatMap(
    ([classId, rows]) =>
      rows.map((s) => ({
        ...v,
        id: `enrollment-${classId}-${s.id}`,
        classId,
        studentId: s.id,
        status:
          classId === "class-sun"
            ? ("COMPLETED" as const)
            : ("ACTIVE" as const),
        history: [
          {
            startAt: at,
            endAt: classId === "class-sun" ? "2026-09-25T00:00:00Z" : null,
            status:
              classId === "class-sun"
                ? ("COMPLETED" as const)
                : ("ACTIVE" as const),
            reason: "Ghi danh mẫu",
          },
        ],
      })),
  );
  return {
    students,
    teachers,
    classes,
    accounts,
    labels,
    assignments,
    enrollments,
    revision: 1,
    previews: {},
    commits: {},
    activations: {},
    audit: [],
  };
}
