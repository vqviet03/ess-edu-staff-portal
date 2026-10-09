import type { Teacher } from "@/types";
import type { ClassAccess, Workspace } from "@/features/management/models";
export function staffActive(staff: Teacher | null | undefined) {
  return (
    !!staff &&
    staff.profileStatus === "ACTIVE" &&
    staff.accountStatus === "ACTIVE"
  );
}
export function workspaces(staff: Teacher | null | undefined): Workspace[] {
  if (!staffActive(staff)) return [];
  return [
    ...(staff?.roles?.includes("MANAGER") ? ["manager" as const] : []),
    ...(staff?.roles?.includes("TEACHER") ? ["teacher" as const] : []),
  ];
}
export function validWorkspace(
  staff: Teacher | null | undefined,
  preferred?: Workspace | null,
): Workspace | null {
  const allowed = workspaces(staff);
  return preferred && allowed.includes(preferred)
    ? preferred
    : (allowed[0] ?? null);
}
export function capabilities(
  staff: Teacher | null | undefined,
  workspace: Workspace | null,
  access?: ClassAccess,
) {
  const active = staffActive(staff),
    manager = active && !!staff?.roles?.includes("MANAGER");
  const teacher = active && !!staff?.roles?.includes("TEACHER");
  const editLearning =
    teacher &&
    workspace === "teacher" &&
    !!access?.canView &&
    access.assignmentStatus === "ACTIVE" &&
    access.assignmentConfirmed !== false &&
    access.classStatus === "ACTIVE" &&
    access.profileStatus === "ACTIVE" &&
    access.accountStatus === "ACTIVE";
  return {
    manage: manager && workspace === "manager",
    viewLearning: active && !!access?.canView,
    editLearning,
    editSchedule: manager && workspace === "manager" && !!access?.canView && access.profileStatus === "ACTIVE" && access.accountStatus === "ACTIVE",
    editProfile: manager && workspace === "manager",
    switchWorkspace: workspaces(staff).length > 1,
  };
}
