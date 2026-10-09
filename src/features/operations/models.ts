export interface OperationError { status: number; code: string; message: string }
export interface Operation {
  operationId: string;
  status: "IN_PROGRESS" | "DONE" | "FAILED";
  command: string;
  createdAt: string;
  completedAt: string | null;
  result?: unknown;
  error?: OperationError | null;
}
export interface ChangeNotification {
  eventId: string;
  operationId: string;
  actorId: string;
  status: "DONE" | "FAILED";
  command: string;
  entities: string[];
  completedAt: string;
  error?: OperationError | null;
}
export function operationEnvelope(value: unknown): Operation | null {
  if (!value || typeof value !== "object" || !("data" in value)) return null;
  const data = value.data;
  if (!data || typeof data !== "object" || !("operationId" in data) || !("status" in data) || typeof data.operationId !== "string" || !["IN_PROGRESS", "DONE", "FAILED"].includes(String(data.status))) return null;
  return data as Operation;
}
export function businessMutation(url: string, method = "GET") {
  if (!["POST", "PATCH", "PUT"].includes(method)) return false;
  return /^\/manager\/settings\/proposals(?:\/[^/]+\/decision)?$/.test(url) || url === "/manager/changes/commit" || /^\/manager\/accounts\/[^/]+\/(session-policy|sessions\/revoke)$/.test(url) || (/^\/(classes|sessions|assessments)\//.test(url) && !url.endsWith("/preview"));
}
export function relatedTags(entities: string[]) {
  const tags = new Set<"Auth" | "Management" | "Dashboard" | "Assignments" | "Warnings" | "Audit" | "Classes" | "Class" | "Students" | "Sessions" | "Assessments" | "Results" | "Reports" | "ClassAccess" | "Operations" | "ApplicationSettings" | "SettingsProposals" | "Attendance" | "Rewards">(["Operations", "Audit"]);
  for (const entity of entities) {
    if (entity === "settings") { tags.add("ApplicationSettings"); tags.add("SettingsProposals"); }
    if (["students", "teachers", "classes", "accounts", "labels", "assignments", "enrollments"].includes(entity)) tags.add("Management");
    if (["students", "teachers", "classes", "accounts", "assignments", "enrollments", "sessions"].includes(entity)) { tags.add("Dashboard"); tags.add("Warnings"); tags.add("Classes"); tags.add("Class"); }
    if (["teachers", "accounts", "classes", "assignments", "labels"].includes(entity)) tags.add("Assignments");
    if (["students", "enrollments", "accounts"].includes(entity)) tags.add("Students");
    if (entity === "enrollments") { tags.add("Attendance"); tags.add("Rewards"); }
    if (["sessions", "classes"].includes(entity)) tags.add("Sessions");
    if (["assessments", "results", "reports"].includes(entity)) { tags.add("Assessments"); tags.add("Results"); tags.add("Reports"); }
  }
  return [...tags];
}
