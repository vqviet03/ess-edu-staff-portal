import type { FetchArgs } from "@reduxjs/toolkit/query";
import type { Teacher } from "@/types";
import type { ApplicationSettings, SettingsProposal } from "@/features/settings/models";
import type { Database } from "./fixtures";
import { management, obj, reject } from "./management-engine";
export const currentSettings = (db: Database): ApplicationSettings => management(db).settings ??= { appName: "ESS", classIdPrefix: "ess", version: 1 };
export function settingsRequest(db: Database, staff: Teacher, req: FetchArgs) {
  const path = req.url.split("?")[0]; if (!path.startsWith("/manager/settings/")) return null;
  const m = management(db), current = currentSettings(db), managers = m.teachers.filter(t => t.status === "ACTIVE" && m.accounts.some(a => a.kind === "STAFF" && a.profileId === t.id && a.status === "ACTIVE" && a.roles.includes("MANAGER")));
  if (!managers.some(t => t.id === staff.id)) reject(403, "FORBIDDEN", "Cần quyền quản lý.");
  const proposals = m.settingsProposals ??= [];
  if (req.method === "GET" || !req.method) return { data: { data: { items: proposals.map(p => ({ ...p, status: p.status === "PENDING" && Date.parse(p.expiresAt) <= Date.now() ? "EXPIRED" : p.status })) } } };
  const b = obj(req.body); let p: SettingsProposal;
  if (path === "/manager/settings/proposals") {
    const appName = String(b.appName ?? "").trim(), prefix = String(b.classIdPrefix ?? ""), reason = String(b.reason ?? "").trim();
    if (!appName || appName.length > 80 || !/^[a-z][a-z0-9-]{1,15}$/.test(prefix) || !reason) reject(422, "INVALID_SETTINGS", "Tên / tiền tố / lý do không hợp lệ.");
    if (b.version !== current.version) reject(409, "VERSION_CONFLICT", "Cấu hình đã thay đổi.");
    const requiredManagers = managers.filter(t => t.id !== staff.id).map(t => ({ id: t.id, userId: t.id, name: t.fullName }));
    if (!requiredManagers.length && b.confirmSolo !== true) reject(422, "CONFIRM_REQUIRED", "Cần xác nhận quản lý duy nhất.");
    p = { id: crypto.randomUUID(), proposedBy: staff.id, proposerName: staff.name, appName, classIdPrefix: prefix, reason, baseVersion: current.version, version: 1, status: "PENDING", expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), requiredManagers, approvals: [] }; proposals.unshift(p);
    if (!requiredManagers.length) p.status = "APPLIED";
  } else {
    const id = path.split("/").at(-2); p = proposals.find(p => p.id === id) ?? reject(404, "NOT_FOUND", "Không có đề xuất.");
    if (p.version !== b.version || current.version !== p.baseVersion) reject(409, "VERSION_CONFLICT", "Dữ liệu đã thay đổi.");
    if (p.status !== "PENDING") reject(409, "ALREADY_DECIDED", "Đã xử lý.");
    if (Date.parse(p.expiresAt) <= Date.now()) reject(410, "PROPOSAL_EXPIRED", "Đã hết hạn.");
    if (staff.id === p.proposedBy || !p.requiredManagers.some(m => m.id === staff.id)) reject(403, "FORBIDDEN", "Không được tự duyệt.");
    if ([...p.requiredManagers.map(m => m.id), p.proposedBy].sort().join() !== managers.map(t => t.id).sort().join()) reject(409, "MANAGERS_CHANGED", "Danh sách quản lý đã đổi.");
    if (b.decision === "REJECTED") p.status = "REJECTED";
    else if (b.decision === "APPROVED") { if (p.approvals.includes(staff.id)) reject(409, "ALREADY_APPROVED", "Đã đồng ý."); p.approvals.push(staff.id); if (p.requiredManagers.every(m => p.approvals.includes(m.id))) p.status = "APPLIED"; }
    else reject(422, "INVALID_DECISION", "Quyết định không hợp lệ.");
    p.version++;
  }
  if (p.status === "APPLIED") m.settings = { appName: p.appName, classIdPrefix: p.classIdPrefix, version: current.version + 1 };
  m.audit.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), actorId: staff.id, actorUserId: staff.id, actorName: staff.name, action: "SETTINGS_" + p.status, entity: "settings", ids: [p.id], changes: [{ id: p.id, fields: ["appName", "classIdPrefix", "approval"] }], reason: p.reason });
  return { data: { data: { id: p.id, status: p.status, version: p.version } } };
}
