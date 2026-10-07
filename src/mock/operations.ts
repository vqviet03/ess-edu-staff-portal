import type { FetchArgs } from "@reduxjs/toolkit/query";
import type { Operation } from "@/features/operations/models";
export interface StoredMockOperation extends Operation {
  actorId: string;
  token: string;
  key: string;
  digest: string;
  request: FetchArgs;
}
export function publicOperation(job: StoredMockOperation, actorId: string): Operation {
  return { operationId: job.operationId, status: job.status, command: job.command, createdAt: job.createdAt, completedAt: job.completedAt, result: job.actorId === actorId ? job.result : null, error: job.error ?? null };
}
export function operationCommand(url: string, method: string) {
  if (url === "/manager/settings/proposals") return "Management.ProposeSettings";
  if (/^\/manager\/settings\/proposals\/[^/]+\/decision$/.test(url)) return "Management.DecideSettings";
  if (url === "/manager/changes/commit") return "Management.Commit";
  if (/^\/manager\/accounts\/[^/]+\/sessions\/revoke$/.test(url)) return "Management.RevokeSessions";
  if (/^\/manager\/accounts\/[^/]+\/session-policy$/.test(url)) return "Management.UpdateSessionPolicy";
  if (url.endsWith("/report/comments")) return "Staff.ReportComments";
  if (url.includes("/students/")) return "Staff.Student";
  if (/^\/classes\/.+\/sessions$/.test(url)) return "Staff.CreateSession";
  if (/^\/sessions\/[^/]+$/.test(url)) return "Staff.Session";
  if (/^\/sessions\/.+\/assessments$/.test(url)) return "Staff.CreateAssessment";
  if (/^\/assessments\/[^/]+$/.test(url)) return "Staff.Assessment";
  if (url.endsWith("/publish")) return "Staff.Publish";
  if (url.endsWith("/unpublish")) return "Staff.Unpublish";
  return method === "PUT" ? "Staff.Result" : "Staff.Batch";
}
export function operationEntities(command: string) {
  return ["Management.ProposeSettings", "Management.DecideSettings"].includes(command) ? ["settings"] : command === "Staff.ReportComments" ? ["reports", "results", "assessments"] : command.startsWith("Management.") ? ["students", "teachers", "classes", "accounts", "labels", "assignments", "enrollments"] : command === "Staff.Student" ? ["students"] : ["sessions", "classes", "assessments", "results"];
}
