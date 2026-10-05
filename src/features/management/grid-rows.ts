import type { ProfileGroup } from "./models";
import { defaults, entitySchemas, parseRoles, rolesInput } from "./validation";
export type GridMode = "CREATE" | "UPDATE";
export function nonemptyRow(row: Record<string, unknown>) {
  return Object.values(row).some((v) => v !== undefined && v !== null && v !== "" && (typeof v !== "string" || v.trim() !== ""));
}
export function profileGridRow(row: Record<string, unknown>, mode: GridMode): Record<string, unknown> {
  const result = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== "" && v !== null && v !== undefined && (typeof v !== "string" || v.trim() !== "")));
  if (typeof result.id === "string") result.id = result.id.trim();
  if (result.createAccount !== undefined && typeof result.createAccount === "string") {
    const v = result.createAccount.trim().toUpperCase();
    if (v === "TRUE" || v === "1") result.createAccount = true;
    else if (v === "FALSE" || v === "0") result.createAccount = false;
  }
  if (result.roles !== undefined) result.roles = parseRoles(result.roles);
  if (mode === "CREATE") result.id ??= "";
  return result;
}
export function profileGridErrors(group: ProfileGroup, row: Record<string, unknown>, mode: GridMode): Record<string, string> {
  if (!nonemptyRow(row)) return {};
  const normalized = profileGridRow(row, mode);
  const input = mode === "CREATE" ? { ...defaults(group), ...normalized } : normalized;
  const schema = mode === "CREATE" ? entitySchemas[group] : entitySchemas[group].partial();
  const parsed = schema.safeParse(input);
  const errors: Record<string, string> = parsed.success ? {} : Object.fromEntries(parsed.error.issues.map((x) => [x.path.join("."), x.message]));
  if (mode === "UPDATE" && (!normalized.id || typeof normalized.id !== "string")) errors.id = "Nhập ID hồ sơ cần cập nhật.";
  if (normalized.roles !== undefined && !rolesInput.safeParse(normalized.roles).success) errors.roles = "TEACHER / MANAGER / TEACHER|MANAGER";
  if (normalized.createAccount !== undefined && typeof normalized.createAccount !== "boolean") errors.createAccount = "Chọn TRUE hoặc FALSE.";
  if (mode === "UPDATE" && normalized.createAccount === true) errors.createAccount = "Tạo tài khoản cho hồ sơ cũ tại mục Tài khoản.";
  return errors;
}
