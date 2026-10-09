export type RewardKind = "EARN" | "PENALTY" | "SPEND";
export type Attendance = "UNSET" | "PRESENT" | "ABSENT";
export interface RewardTotals {
  earned: number;
  penalty: number;
  spent: number;
  net: number;
  balance: number;
}
export interface RewardEntry {
  id: string;
  kind: RewardKind;
  amount: number;
  note: string;
  date: string;
  createdAt: string;
  authorName: string;
  authorPublicId: string;
  reversesId: string | null;
  studentId: string;
  studentName: string;
  nickname: string;
}
export interface RewardPoint {
  date: string;
  attendance: Attendance;
  dailyEarned: number;
  dailyPenalty: number;
  dailySpent: number;
  earned: number | null;
  penalty: number | null;
  net: number | null;
  balance: number | null;
}
export interface RewardRow {
  studentId: string;
  publicId: string;
  name: string;
  nickname: string;
  attendance: Attendance;
  totals: RewardTotals;
  today: RewardTotals;
  todayProgress: number;
}
export interface ClassRewards {
  classId: string;
  date: string;
  dayVersion: number;
  closed: boolean;
  highestToday: number;
  items: RewardRow[];
}
export interface RewardDetail {
  classId: string;
  studentId: string;
  todayDate: string;
  totals: RewardTotals;
  today: RewardTotals;
  attendance: Attendance;
  todayProgress: number;
  chart: RewardPoint[];
  activities: RewardEntry[];
  activityCount: number;
}
export interface RewardHistory {
  items: RewardEntry[];
  page: number;
  pageSize: number;
  total: number;
}
export interface RewardClass {
  id: string;
  name: string;
}
export interface ScheduleSlot {
  day: number | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
}
export interface ScheduleConfig {
  mode: "FIXED" | "FLEXIBLE";
  cycle: "WEEKLY" | "MONTHLY";
  timeMode: "SHARED" | "PER_DAY" | "FLEXIBLE";
  startTime: string | null;
  endTime: string | null;
  slots: ScheduleSlot[];
}
export interface StudySchedule {
  classId: string;
  version: number;
  effectiveFrom: string | null;
  configuration: ScheduleConfig;
  occurrences: {
    date: string;
    startTime: string | null;
    endTime: string | null;
  }[];
  timeZone: string;
}
export const rewardColors = {
  earned: "#69ab85",
  penalty: "#cf7e86",
  spent: "#c3a45a",
  net: "#739ec9",
  balance: "#a18aca",
};
export const rewardLabels = {
  earned: "Đã nhận",
  penalty: "Vi phạm",
  spent: "Đã dùng",
  net: "Đóng góp ròng",
  balance: "Còn dùng được",
};
export const attendanceLabels = {
  UNSET: "Chưa xác nhận",
  PRESENT: "Có tham gia",
  ABSENT: "Vắng · Không tính 0",
};
export const kindLabels = {
  EARN: "Được thưởng",
  PENALTY: "Vi phạm",
  SPEND: "Đã dùng",
};
export function vietnamToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function displayDate(value: string) {
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}
export function dateWindow(to: string, days = 30) {
  const d = new Date(`${to}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return { from: d.toISOString().slice(0, 10), to };
}
export function entryColor(kind: RewardKind) {
  return rewardColors[
    kind === "EARN" ? "earned" : kind === "PENALTY" ? "penalty" : "spent"
  ];
}
export function scheduleLabel(config: ScheduleConfig) {
  return config.mode === "FLEXIBLE"
    ? "Lịch linh động"
    : config.cycle === "WEEKLY"
      ? "Lịch cố định · Theo tuần"
      : "Lịch cố định · Theo tháng";
}
export function validateSchedule(c: ScheduleConfig): string | null {
  if (c.mode === "FIXED" && !c.slots.length)
    return "Chọn ít nhất một ngày học.";
  const keys = c.slots.map((s) => (c.mode === "FIXED" ? s.day : s.date));
  if (new Set(keys).size !== keys.length) return "Ngày học không được trùng.";
  if (
    c.slots.some((s) =>
      c.mode === "FIXED"
        ? s.day === null ||
          !Number.isInteger(s.day) ||
          s.day < 1 ||
          s.day > (c.cycle === "WEEKLY" ? 7 : 31)
        : !s.date || !/^\d{4}-\d{2}-\d{2}$/.test(s.date),
    )
  )
    return "Ngày học không hợp lệ.";
  const validTime = (s: string | null, e: string | null) =>
    !!s &&
    !!e &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(s) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(e) &&
    e > s;
  if (
    (c.timeMode === "SHARED" && !validTime(c.startTime, c.endTime)) ||
    (c.timeMode === "PER_DAY" &&
      c.slots.some((s) => !validTime(s.startTime, s.endTime)))
  )
    return "Giờ kết thúc phải sau giờ bắt đầu (HH:mm).";
  return null;
}
