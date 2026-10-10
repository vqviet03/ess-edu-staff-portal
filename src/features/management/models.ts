import type { SessionDuration } from "./session-duration";
import type { Class, Teacher } from "@/types";
export type Role = "TEACHER" | "MANAGER";
export type Workspace = "manager" | "teacher";
export type ProfileStatus = "ACTIVE" | "PAUSED" | "INACTIVE";
export type Entity =
  | "students"
  | "teachers"
  | "classes"
  | "accounts"
  | "labels";
export type ProfileGroup = "students" | "teachers";
export interface Versioned {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface ManagedStudent extends Versioned {
  fullName: string;
  nickname: string;
  dateOfBirth: string | null;
  parentContact: string;
  notes: string;
  status: ProfileStatus;
}
export interface Staff extends Versioned {
  fullName: string;
  email: string;
  phone: string;
  notes: string;
  status: ProfileStatus;
}
export interface ManagedClass extends Class, Versioned {
  notes: string;
}
export interface Account extends Versioned {
  loginId: string;
  profileId: string;
  kind: "STUDENT" | "STAFF";
  roles: Role[];
  status: "PENDING" | "ACTIVE" | "LOCKED";
  sessionLifetimeMinutes?: number | null;
  sessionDuration?: SessionDuration | null;
}
export interface LoginHistoryEntry { loggedInAt: string; expiresAt: string; revokedAt: string | null; ipAddress: string | null; device: string | null; browser: string | null; operatingSystem: string | null }
export interface LoginHistory { items: LoginHistoryEntry[]; total: number; page: number; pageSize: number }
export interface AccountSessionPolicy {
  sessionDuration: SessionDuration | null;
  defaultLifetimeMinutes: number;
  serverNow: string;
  previewExpiresAt: string;
  accountId: string;
  sessionLifetimeMinutes: number | null;
  effectiveLifetimeMinutes: number;
  activeSessionCount: number;
  managerProtected: boolean;
  version: number;
}
export interface SessionPolicyRequest {
  sessionDuration?: SessionDuration | null;
  sessionLifetimeMinutes: number | null;
  version: number;
  reason: string;
}
export interface SessionRevocation {
  revokedSessions: number;
  policy: AccountSessionPolicy;
}
export interface AssignmentLabel extends Versioned {
  name: string;
  status: "ACTIVE" | "INACTIVE";
  notes: string;
}
export interface AssignmentPeriod {
  startAt: string;
  endAt: string | null;
  status: "ACTIVE" | "ENDED" | "COMPLETED";
  labelId: string;
  reason: string;
}
export interface TeacherClassAssignment extends Versioned {
  classId: string;
  teacherId: string;
  labelId: string;
  status: "ACTIVE" | "ENDED" | "COMPLETED";
  startAt: string;
  endAt: string | null;
  history: AssignmentPeriod[];
  requiresReconfirmation?: boolean;
}
export interface Enrollment extends Versioned {
  joinedOn?: string;
  endedOn?: string | null;
  datesConfirmed?: boolean;
  recordedAt?: string;
  classId: string;
  studentId: string;
  status: "ACTIVE" | "ENDED" | "COMPLETED";
  history: {
    id?: string;
    joinedOn?: string;
    endedOn?: string | null;
    startAt: string;
    endAt: string | null;
    status: Enrollment["status"];
    reason: string;
  }[];
}
export type ManagedRecord =
  | ManagedStudent
  | Staff
  | ManagedClass
  | Account
  | AssignmentLabel;
export interface EntityMap {
  students: ManagedStudent;
  teachers: Staff;
  classes: ManagedClass;
  accounts: Account;
  labels: AssignmentLabel;
}
export interface ListFilter {
  search?: string;
  status?: string;
  classId?: string;
  accountStatus?: string;
  role?: string;
}
export type Selection =
  | { mode: "IDS"; ids: string[] }
  | { mode: "FILTER"; filter: ListFilter; excludedIds: string[] };
export interface ListParams {
  entity: Entity;
  filter: ListFilter;
  page: number;
  pageSize: number;
}
export interface ManagedList {
  items: ManagedRecord[];
  total: number;
  page: number;
  pageSize: number;
}
export interface ClassAccess {
  classId: string;
  canView: boolean;
  assignmentStatus: TeacherClassAssignment["status"] | null;
  assignmentConfirmed?: boolean;
  profileStatus: ProfileStatus;
  accountStatus: Account["status"];
  classStatus: Class["status"];
}
export interface Impact {
  classId: string;
  className: string;
  remainingTeachers: string[];
  afterUnstaffed: boolean;
  message: string;
}
export interface PreviewError {
  row: number;
  column: string;
  message: string;
}
export interface Change {
  entity: Entity;
  id: string;
  before: ManagedRecord | null;
  after: ManagedRecord;
  row?: number;
}
export interface BulkPreview {
  previewId: string;
  version: number;
  count: number;
  scope: string;
  changes: Change[];
  impacts: Impact[];
  warnings: string[];
  errors: PreviewError[];
  requiredConfirmations: string[];
  expiresAt: string;
}
export type ImportPreview = BulkPreview;
export interface PreviewRequest {
  entity: Entity;
  selection?: Selection;
  patch?: Record<string, unknown>;
  rows?: Record<string, unknown>[];
  mode?: "CREATE" | "UPDATE";
  clearFields?: string[];
}
export interface CommitRequest {
  previewId: string;
  version: number;
  confirmations: string[];
  reason: string;
  key: string;
}
export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  actorUserId?: string | null;
  actorLoginId?: string | null;
  actorName?: string | null;
  action: string;
  entity: string;
  ids: string[];
  reason: string;
  changes: { id: string; fields: string[] }[];
}
export interface ProfileDetail {
  record: ManagedRecord;
  accounts: Account[];
  classes: ManagedClass[];
  assignments: TeacherClassAssignment[];
  enrollments: Enrollment[];
  labels: AssignmentLabel[];
  teachers: Staff[];
  students: ManagedStudent[];
}
export interface StatsFilter {
  from: string;
  to: string;
  classId: string;
  status: string;
}
export interface DashboardStats {
  asOf: string;
  activeStudents: number;
  activeTeachers: number;
  pendingAccounts: number;
  dualRoleStaff: number;
  byStatus: Record<Class["status"], number>;
  completedUnits: number;
  totalUnits: number;
  classes: ManagedClass[];
  warnings: Impact[];
  interval: {
    from: string;
    to: string;
    completedSessions: number;
    newlyCompletedUnits: number;
    denominator: number;
  };
}
export function isProfile(r: ManagedRecord): r is ManagedStudent | Staff {
  return "fullName" in r;
}
export function recordName(r: ManagedRecord) {
  return "fullName" in r ? r.fullName : "name" in r ? r.name : r.loginId;
}
export function accountStaff(account: Account, profile: Staff): Teacher {
  return {
    id: profile.id,
    name: profile.fullName,
    teacherCode: account.loginId,
    roles: account.roles,
    profileStatus: profile.status,
    accountStatus: account.status,
  };
}
