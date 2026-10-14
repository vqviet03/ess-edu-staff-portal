export interface ApplicationSettings {
  appName: string;
  classIdPrefix: string;
  version: number;
  schemaReady?: boolean;
  portals?: import("@/features/pwa/models").PortalBrandings | null;
}
export interface SettingsProposal {
  portals?: import("@/features/pwa/models").PortalBrandings | null;
  id: string;
  proposedBy: string;
  proposerName: string | null;
  appName: string;
  classIdPrefix: string;
  reason: string;
  baseVersion: number;
  version: number;
  status: "PENDING" | "EXPIRED" | "REJECTED" | "APPLIED";
  expiresAt: string;
  requiredManagers: {
    id: string;
    userId: string | null;
    name: string | null;
  }[];
  approvals: string[];
}
