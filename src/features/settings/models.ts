export interface ApplicationSettings { appName: string; classIdPrefix: string; version: number }
export interface SettingsProposal {
  id: string; proposedBy: string; proposerName: string | null; appName: string; classIdPrefix: string;
  reason: string; baseVersion: number; version: number; status: "PENDING" | "EXPIRED" | "REJECTED" | "APPLIED";
  expiresAt: string; requiredManagers: { id: string; userId: string | null; name: string | null }[]; approvals: string[];
}
