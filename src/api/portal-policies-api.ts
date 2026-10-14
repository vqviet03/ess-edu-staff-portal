import { api } from "./api";
export interface PortalPolicy {
  images: {
    maxWidth: number;
    maxHeight: number;
    format: "AVIF" | "WEBP" | "JPEG";
    quality: number;
  };
  audit: { enabled: boolean; limit: number; deleteMode: "SOFT" | "HARD" };
  version: number;
}
const unwrap = <T>(r: { data: T }) => r.data;
export const policiesApi = api
  .enhanceEndpoints({ addTagTypes: ["PortalPolicies"] })
  .injectEndpoints({
    endpoints: (b) => ({
      portalPolicies: b.query<PortalPolicy, void>({
        query: () => "/manager/portal-policies",
        transformResponse: unwrap<PortalPolicy>,
        providesTags: ["PortalPolicies"],
      }),
      savePortalPolicies: b.mutation<
        PortalPolicy,
        PortalPolicy & { reason: string }
      >({
        query: (body) => ({
          url: "/manager/portal-policies",
          method: "PATCH",
          body,
        }),
        transformResponse: unwrap<PortalPolicy>,
        invalidatesTags: (_, e) => (e ? [] : ["PortalPolicies", "Audit"]),
      }),
      previewAuditDeletion: b.mutation<
        { previewId: string; count: number; mode: "SOFT" | "HARD" },
        { before: string; mode: "SOFT" | "HARD" }
      >({
        query: (body) => ({
          url: "/manager/portal-policies/audit/preview",
          method: "POST",
          body,
        }),
        transformResponse: unwrap<{
          previewId: string;
          count: number;
          mode: "SOFT" | "HARD";
        }>,
      }),
      commitAuditDeletion: b.mutation<
        { deleted: number },
        { previewId: string; reason: string }
      >({
        query: (body) => ({
          url: "/manager/portal-policies/audit/commit",
          method: "POST",
          body,
        }),
        transformResponse: unwrap<{ deleted: number }>,
        invalidatesTags: (_, e) => (e ? [] : ["Audit"]),
      }),
    }),
  });
