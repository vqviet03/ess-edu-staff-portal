import type { AuthSession, Teacher } from "@/types";
export function verifiedStaff(value: Teacher): Teacher {
  if (
    !value ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.name !== "string"
  )
    throw new Error("API không trả tài khoản Staff hợp lệ.");
  const roles = (value.roles ?? []).filter(
    (r) => r === "TEACHER" || r === "MANAGER",
  );
  // Legacy ESS authenticates the single active teacher/account record on login,
  // exchange and every bearer request. Treat that authenticated legacy shape as
  // active for reading. It never grants class editing without /classes/:id/access.
  const legacyTeacher = roles.includes("TEACHER") && !roles.includes("MANAGER");
  return {
    ...value,
    roles,
    profileStatus:
      value.profileStatus ?? (legacyTeacher ? "ACTIVE" : undefined),
    accountStatus:
      value.accountStatus ?? (legacyTeacher ? "ACTIVE" : undefined),
  };
}
export function verifiedSession(value: AuthSession): AuthSession {
  if (!value?.accessToken || !Number.isFinite(Date.parse(value.expiresAt)))
    throw new Error("API không trả phiên Staff hợp lệ.");
  return { ...value, teacher: verifiedStaff(value.teacher) };
}
