export type AttendanceStatus = "UNSET" | "PRESENT" | "ABSENT" | "REPLACED";
export type ReasonKind = "MAKEUP" | "SUPPLEMENTAL" | "OTHER";
export interface AttendanceStats {
  present: number;
  absent: number;
  unrecorded: number;
  plannedSessions: number;
  absencePercentage: number | null;
  warning: "NO_PLAN" | "ACCEPTABLE" | "WARNING" | "DANGER";
}
export interface AttendanceDate {
  date: string;
  status: AttendanceStatus | "SAVED";
  scheduled: boolean;
  confirmed: boolean;
  reasonKind: ReasonKind | null;
  reason: string;
  replacesDate: string | null;
  replaced: boolean;
  startTime: string | null;
  endTime: string | null;
}
export interface AttendanceRow {
  studentId: string;
  publicId: string;
  name: string;
  nickname: string;
  status: AttendanceStatus;
  stats: AttendanceStats;
}
export interface AttendanceEdit {
  authorName: string;
  authorPublicId: string;
  studentName: string;
  before: AttendanceStatus;
  after: AttendanceStatus;
  reason: string;
  createdAt: string;
}
export interface ClassAttendance {
  classId: string;
  today: string;
  date: string;
  version: number;
  saved: boolean;
  scheduled: boolean;
  confirmed: boolean;
  replaced: boolean;
  reasonKind: ReasonKind | null;
  reason: string;
  replacesDate: string | null;
  startTime: string | null;
  endTime: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  plannedSessions: number;
  savedSessions: number;
  supplementalSessions: number;
  needsAttention: number;
  items: AttendanceRow[];
  calendar: AttendanceDate[];
  changes: AttendanceEdit[];
}
export interface StudentAttendance {
  classId: string;
  today: string;
  stats: AttendanceStats;
  calendar: AttendanceDate[];
  items: AttendanceDate[];
  total: number;
  page: number;
  pageSize: number;
  todaySession?: AttendanceDate;
}
export const statusLabels: Record<AttendanceStatus | string, string> = {
  PRESENT: "Có mặt",
  ABSENT: "Vắng",
  UNSET: "Chưa ghi nhận",
  REPLACED: "Đã có buổi học bù",
  SAVED: "Đã điểm danh",
};
export const reasonLabels: Record<ReasonKind, string> = {
  MAKEUP: "Học bù",
  SUPPLEMENTAL: "Học bổ sung",
  OTHER: "Khác",
};
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00+07:00`));
export const todayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function absenceWarning(absent: number, planned: number) {
  const percentage = planned > 0 ? (100 * absent) / planned : null;
  return {
    percentage,
    warning:
      percentage === null
        ? "NO_PLAN"
        : percentage > 20
          ? "DANGER"
          : percentage >= 10
            ? "WARNING"
            : "ACCEPTABLE",
  } as const;
}
export function calendarCells(month: string) {
  const start = new Date(`${month}-01T12:00:00Z`),
    offset = (start.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(1 - offset + i);
    return d.toISOString().slice(0, 10);
  });
}
export function shiftMonth(month: string, delta: number) {
  const d = new Date(`${month}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}
