export const skillCodes = [
  "VOCABULARY",
  "GRAMMAR",
  "PRONUNCIATION",
  "LISTENING",
  "READING",
  "SPEAKING",
  "WRITING",
] as const;
export type SkillCode = (typeof skillCodes)[number];
export const skillNames: Record<SkillCode, string> = {
  VOCABULARY: "Từ vựng",
  GRAMMAR: "Ngữ pháp",
  PRONUNCIATION: "Phát âm",
  LISTENING: "Nghe",
  READING: "Đọc",
  SPEAKING: "Nói",
  WRITING: "Viết",
};
export type Attendance = "PRESENT" | "ABSENT" | "UNSET";
export type Status = "DRAFT" | "ACTIVE" | "COMPLETED" | "PAUSED" | "INACTIVE";
export type WorkStatus = "DRAFT" | "COMPLETED";
export interface Teacher {
  id: string;
  name: string;
  teacherCode?: string;
  roles?: ("TEACHER" | "MANAGER")[];
  profileStatus?: "ACTIVE" | "PAUSED" | "INACTIVE";
  accountStatus?: "PENDING" | "ACTIVE" | "LOCKED";
  permissions?: string[];
}
export interface AuthSession {
  accessToken: string;
  tokenType?: "Bearer";
  expiresAt: string;
  teacher: Teacher;
}
export interface Class {
  id: string;
  code: string;
  name: string;
  schedule: string;
  status: Status;
  studentCount: number;
  totalUnits: number;
  completedUnits: number;
}
export interface Student {
  publicId?: string;
  studentCode?: string;
  id: string;
  name: string;
  nickname: string;
  dateOfBirth: string | null;
  status: "ACTIVE" | "PAUSED" | "INACTIVE";
  version: number;
}
export interface Session {
  id: string;
  classId: string;
  name: string;
  unitNumber: number | null;
  date: string;
  note: string;
  status: WorkStatus;
  version: number;
}
export interface SkillSchema {
  skillCode: SkillCode;
  maxQuestions: number;
  allowDecimal: boolean;
  order: number;
}
export interface Assessment {
  id: string;
  sessionId: string;
  name: string;
  type: "PROGRESS_TRACKING" | "FINAL_TEST";
  status: WorkStatus;
  schemaVersion: number;
  version: number;
  skills: SkillSchema[];
}
export interface SkillResult {
  skillCode: SkillCode;
  score: number | null;
  comment: string;
  advice: string;
}
export interface Publication {
  unitId: string | null;
  unitNumber: number | null;
  isPublished: boolean;
  sourceAssessmentId: string | null;
  publishedAt: string | null;
}
export interface StudentResult {
  studentId: string;
  attendance: Attendance;
  skillResults: SkillResult[];
  overallComment: string;
  overallAdvice: string;
  version: number;
}
export interface Envelope<T> {
  data: T;
  meta?: { page: number; pageSize: number; total: number };
}
export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  rowErrors?: Record<string, string>;
}
export interface Failure {
  error: ApiError;
}
export interface Context {
  classId: string;
  sessionId: string;
  assessmentId: string;
}
export interface ImportError {
  row: number;
  column: string;
  message: string;
}
export interface ImportChange {
  studentId: string;
  before: StudentResult;
  after: StudentResult;
}
export interface ImportPreview {
  previewId: string;
  changes: ImportChange[];
  errors: ImportError[];
  expiresAt: string;
  mode: "MERGE_NON_EMPTY" | "REPLACE_ALL";
}
export interface BatchResponse {
  saved: StudentResult[];
  rowErrors: Record<string, string>;
}
export type AssessmentInput = Pick<Assessment, "name" | "type" | "skills">;
