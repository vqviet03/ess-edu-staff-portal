import type { api } from "@/api/api";
export function notificationResourceTags(
  type: string,
  classId?: string | null,
  href?: string | null,
): Parameters<typeof api.util.invalidateTags>[0] {
  let assignmentId: string | null = null;
  try {
    assignmentId = new URL(href ?? "", "https://ees.invalid").searchParams.get(
      "assignmentId",
    );
  } catch {}
  if (type === "ASSIGNMENT")
    return [
      { type: "AssignmentForm", ...(assignmentId ? { id: assignmentId } : {}) },
      {
        type: "AssignmentSubmissions",
        ...(assignmentId ? { id: assignmentId } : {}),
      },
      { type: "LearningAssignments", ...(classId ? { id: classId } : {}) },
      "Posts",
      "AssignmentReport",
    ];
  if (type === "SUBMISSION")
    return ["AssignmentSubmissions", "AssignmentReport"];
  if (type === "ASSIGNMENT_RESULT")
    return ["AssignmentDraft", "AssignmentReport"];
  const id = classId ? { id: classId } : {};
  if (type === "SCHEDULE")
    return [
      { type: "Attendance", ...id },
      { type: "Schedule", ...id },
      { type: "Rewards", ...id },
    ];
  if (type === "ATTENDANCE")
    return [
      { type: "Attendance", ...id },
      { type: "Rewards", ...id },
    ];
  if (type === "REWARD")
    return [
      { type: "Rewards", ...id },
      { type: "GiftCart", ...id },
      { type: "Redemption", ...id },
      { type: "Gift", ...id },
    ];
  if (type === "SCORE") return ["Reports", "Assessments"];
  if (["SOCIAL", "REPLY", "COMMENT", "REACTION"].includes(type))
    return ["Posts", "Comments"];
  if (type === "MATERIAL" || type === "POST")
    return classId
      ? ["Posts", "Materials"]
      : ["Materials", "Folders", "Storages", "DeletionRequests"];
  if (type === "APPROVAL" || type === "CONSENT") return ["DeletionRequests"];
  if (type === "STORAGE") return ["Storages"];
  return [];
}
