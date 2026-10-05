export interface SessionDuration { years: number; months: number; days: number; hours: number; minutes: number }
export const durationLabels = { years: "Năm", months: "Tháng", days: "Ngày", hours: "Giờ", minutes: "Phút" } as const;
export const emptyDuration: SessionDuration = { years: 0, months: 0, days: 0, hours: 0, minutes: 0 };
function calendar(date: Date, years: number, months: number) {
  const day = date.getUTCDate(); date.setUTCDate(1);
  date.setUTCFullYear(date.getUTCFullYear() + years); date.setUTCMonth(date.getUTCMonth() + months);
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate(); date.setUTCDate(Math.min(day, end));
}
export function sessionExpiry(at: string, duration: SessionDuration | null | undefined, minutes = 60): string {
  const now = new Date(at), expiry = new Date(at), limit = new Date(at);
  if (!Number.isFinite(now.getTime())) throw new Error("Thời gian máy chủ không hợp lệ.");
  calendar(limit, 10, 0);
  if (duration) {
    const bounds = [10, 120, 3653, 87672, 5260320];
    if (Object.keys(emptyDuration).some((key, i) => { const n = duration[key as keyof SessionDuration]; return typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > bounds[i]; })) throw new Error("Các ô thời hạn phải là số nguyên không âm, tối đa 10 năm.");
    calendar(expiry, duration.years, 0); calendar(expiry, 0, duration.months);
    expiry.setTime(expiry.getTime() + ((duration.days * 24 + duration.hours) * 60 + duration.minutes) * 60000);
  } else {
    if (!Number.isInteger(minutes) || minutes < 1) throw new Error("Thời hạn phiên không hợp lệ.");
    expiry.setTime(expiry.getTime() + minutes * 60000);
  }
  if (expiry <= now || expiry > limit) throw new Error("Thời hạn phiên phải lớn hơn 0 và tối đa 10 năm.");
  return expiry.toISOString();
}
export function minutesToDuration(minutes: number): SessionDuration {
  return { ...emptyDuration, days: Math.floor(minutes / 1440), hours: Math.floor(minutes % 1440 / 60), minutes: minutes % 60 };
}
export function durationText(duration: SessionDuration | null | undefined, minutes: number) {
  return duration ? (Object.entries(durationLabels).filter(([key]) => duration[key as keyof SessionDuration] > 0).map(([key, label]) => `${duration[key as keyof SessionDuration]} ${label.toLowerCase()}`).join(" ") || "0 phút") : `${minutes} phút`;
}
