import type { Enrollment } from "./models";

export interface EnrollmentPeriodDates {
  id: string;
  joinedOn: string;
  endedOn: string | null;
}
export interface EnrollmentDates extends Omit<Enrollment, "history"> {
  datesConfirmed: boolean;
  recordedAt: string;
  dateSource: "MANAGER_CONFIRMED" | "RECORDED_UNVERIFIED";
  history: (EnrollmentPeriodDates & Enrollment["history"][number])[];
}
export interface EnrollmentDatesRequest {
  classId: string;
  studentId: string;
  version: number;
  periods: EnrollmentPeriodDates[];
}
export function validateEnrollmentDates(
  periods: EnrollmentPeriodDates[],
  history: EnrollmentDates["history"],
  _today?: string,
): string[] {
  const errors: string[] = [];
  const validDay = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
  if (!periods.length || periods.length !== history.length ||
    new Set(periods.map(p => p.id)).size !== periods.length ||
    periods.some(p => !history.some(h => h.id === p.id))) {
    return ["Phải giữ đủ các đợt ghi danh hiện có, mỗi đợt một lần."];
  }
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i], h = history.find(h => h.id === p.id)!;
    if (!validDay(p.joinedOn) || (p.endedOn !== null && !validDay(p.endedOn)))
      errors.push(`Đợt ${i + 1}: ngày phải đúng định dạng và tồn tại trên lịch.`);
    if ((h.status === "ACTIVE") !== (p.endedOn === null))
      errors.push(`Đợt ${i + 1}: giữ trạng thái hiện tại; đợt đã kết thúc phải có ngày nghỉ học.`);
    if (h.id !== history[i].id)
      errors.push("Không được đổi thứ tự các đợt ghi danh.");
  }
  return [...new Set(errors)];
}
