export type DeadlineUrgency = "none" | "normal" | "soon" | "urgent" | "overdue";
/** Display only. The API remains authoritative for submission deadlines and permissions. */
export function deadlineUrgency(
  deadline: string | null | undefined,
  now = Date.now(),
): DeadlineUrgency {
  if (!deadline) return "none";
  const remaining = Date.parse(deadline) - now;
  if (!Number.isFinite(remaining)) return "none";
  if (remaining <= 0) return "overdue";
  if (remaining <= 24 * 60 * 60 * 1000) return "urgent";
  if (remaining <= 72 * 60 * 60 * 1000) return "soon";
  return "normal";
}
