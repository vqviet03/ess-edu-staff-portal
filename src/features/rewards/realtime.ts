import type { api } from "@/api/api";
export function rewardNoticeTags(
  type: string,
  classId: string | null | undefined,
): Parameters<typeof api.util.invalidateTags>[0] | null {
  if (type !== "REWARD" && type !== "SCHEDULE") return null;
  const tags: Parameters<typeof api.util.invalidateTags>[0] = [
    {
      type: type === "REWARD" ? "Rewards" : "Schedule",
      ...(classId ? { id: classId } : {}),
    },
  ];
  if (type === "SCHEDULE")
    tags.push({ type: "Rewards", ...(classId ? { id: classId } : {}) });
  return tags;
}
