import { api } from "./api";
import type { Envelope } from "@/types";
import type {
  Entity,
  ManagedList,
  ListParams,
  ProfileDetail,
  BulkPreview,
  PreviewRequest,
  CommitRequest,
  ClassAccess,
  DashboardStats,
  StatsFilter,
  Impact,
  TeacherClassAssignment,
  Selection,
  ProfileGroup,
  AuditEvent,
} from "@/features/management/models";
const unwrap = <T>(r: Envelope<T>) => r.data;
const query = (p: Record<string, unknown>) =>
  new URLSearchParams(
    Object.entries(p)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
const updated = [
  "Management",
  "Dashboard",
  "Assignments",
  "Warnings",
  "Audit",
  "Classes",
  "Class",
  "Students",
  "Sessions",
  "Assessments",
  "Results",
  "Auth",
  "ClassAccess",
] as const;
const binary = async (r: Response) => (r.ok ? r.blob() : r.json());
export const managementApi = api.injectEndpoints({
  endpoints: (b) => ({
    suggestIdentifier: b.mutation<{ id: string; isAvailable: boolean; requestedId: string }, { entity: Entity; fullName?: string; id?: string }>({
      query: (body) => ({ url: "/manager/identifiers/suggest", method: "POST", body }),
      transformResponse: unwrap<{ id: string; isAvailable: boolean; requestedId: string }>,
    }),
    checkIdentifier: b.mutation<{ id: string; isAvailable: boolean; requestedId: string }, { entity: Entity; id: string }>({
      query: (body) => ({ url: "/manager/identifiers/check", method: "POST", body }),
      transformResponse: unwrap<{ id: string; isAvailable: boolean; requestedId: string }>,
    }),
    selectionCount: b.query<
      { count: number },
      { entity: Entity; selection: Selection }
    >({
      query: (body) => ({
        url: "/manager/selection/count",
        method: "POST",
        body,
      }),
      transformResponse: unwrap<{ count: number }>,
      providesTags: ["Management"],
    }),
    classAccess: b.query<ClassAccess, string>({
      query: (id) => `/classes/${encodeURIComponent(id)}/access`,
      transformResponse: unwrap<ClassAccess>,
      providesTags: (_, __, id) => [{ type: "ClassAccess", id }],
      keepUnusedDataFor: 15,
    }),
    dashboard: b.query<DashboardStats, StatsFilter>({
      query: (p) => "/manager/dashboard?" + query({ ...p }),
      transformResponse: unwrap<DashboardStats>,
      providesTags: ["Dashboard", "Warnings"],
    }),
    managementList: b.query<ManagedList, ListParams>({
      query: (p) =>
        `/manager/${p.entity}?` +
        query({ ...p.filter, page: p.page, pageSize: p.pageSize }),
      transformResponse: unwrap<ManagedList>,
      providesTags: (r, _, p) => [
        { type: "Management", id: p.entity },
        ...(r?.items ?? []).map((x) => ({
          type: "Management" as const,
          id: `${p.entity}:${x.id}`,
        })),
      ],
    }),
    managementDetail: b.query<ProfileDetail, { entity: Entity; id: string }>({
      query: (p) => `/manager/${p.entity}/${encodeURIComponent(p.id)}`,
      transformResponse: unwrap<ProfileDetail>,
      providesTags: (_, __, p) => [
        { type: "Management", id: `${p.entity}:${p.id}` },
        "Assignments",
      ],
    }),
    previewChanges: b.mutation<BulkPreview, PreviewRequest>({
      query: (body) => ({
        url: "/manager/changes/preview",
        method: "POST",
        body,
      }),
      transformResponse: unwrap<BulkPreview>,
    }),
    commitChanges: b.mutation<{ updated: number }, CommitRequest>({
      query: ({ key, ...body }) => ({
        url: "/manager/changes/commit",
        method: "POST",
        body,
        headers: { "Idempotency-Key": key },
      }),
      transformResponse: unwrap<{ updated: number }>,
      invalidatesTags: (_, error) => (error ? [] : [...updated]),
    }),
    assignments: b.query<
      TeacherClassAssignment[],
      { classId?: string; teacherId?: string }
    >({
      query: (p) => "/manager/assignments?" + query(p),
      transformResponse: unwrap<TeacherClassAssignment[]>,
      providesTags: ["Assignments"],
    }),
    previewAssignment: b.mutation<
      BulkPreview,
      {
        classId: string;
        teacherId: string;
        labelId: string;
        status: TeacherClassAssignment["status"];
        version?: number;
      }
    >({
      query: (body) => ({
        url: "/manager/assignments/preview",
        method: "POST",
        body,
      }),
      transformResponse: unwrap<BulkPreview>,
    }),
    previewEnrollment: b.mutation<
      BulkPreview,
      {
        classId: string;
        studentId: string;
        status: "ACTIVE" | "ENDED";
        version?: number;
      }
    >({
      query: (body) => ({
        url: "/manager/enrollments/preview",
        method: "POST",
        body,
      }),
      transformResponse: unwrap<BulkPreview>,
    }),
    warnings: b.query<Impact[], void>({
      query: () => "/manager/warnings",
      transformResponse: unwrap<Impact[]>,
      providesTags: ["Warnings"],
    }),
    audit: b.query<
      { items: AuditEvent[]; total: number },
      { page: number; search: string }
    >({
      query: (p) => "/manager/audit?" + query(p),
      transformResponse: unwrap<{ items: AuditEvent[]; total: number }>,
      providesTags: ["Audit"],
    }),
    activation: b.mutation<
      { code: string; expiresAt: string; kind: "STAFF" | "STUDENT" },
      string
    >({
      query: (id) => ({
        url: `/manager/accounts/${encodeURIComponent(id)}/activation`,
        method: "POST",
      }),
      transformResponse: unwrap<{
        code: string;
        expiresAt: string;
        kind: "STAFF" | "STUDENT";
      }>,
      invalidatesTags: (_, e) => (e ? [] : ["Audit"]),
    }),
    activateAccount: b.mutation<
      { activated: boolean },
      { code: string; password: string }
    >({
      query: (body) => ({ url: "/auth/activate", method: "POST", body }),
      transformResponse: unwrap<{ activated: boolean }>,
    }),
    profileTemplate: b.query<Blob, ProfileGroup>({
      query: (entity) => ({
        url: `/manager/${entity}/excel/template`,
        responseHandler: binary,
      }),
      keepUnusedDataFor: 0,
    }),
    profileExport: b.mutation<
      Blob,
      { entity: ProfileGroup; selection: Selection }
    >({
      query: ({ entity, selection }) => ({
        url: `/manager/${entity}/excel/export`,
        method: "POST",
        body: { selection },
        responseHandler: binary,
      }),
    }),
    profileImport: b.mutation<
      BulkPreview,
      {
        entity: ProfileGroup;
        file: File;
        mode: "CREATE" | "UPDATE";
        clearFields: string[];
      }
    >({
      query: (p) => {
        const body = new FormData();
        body.set("file", p.file);
        body.set("mode", p.mode);
        body.set("clearFields", p.clearFields.join(","));
        return {
          url: `/manager/${p.entity}/excel/preview`,
          method: "POST",
          body,
        };
      },
      transformResponse: unwrap<BulkPreview>,
    }),
  }),
});
export const {
  useSuggestIdentifierMutation,
  useCheckIdentifierMutation,
  useSelectionCountQuery,
  useClassAccessQuery,
  useDashboardQuery,
  useManagementListQuery,
  useManagementDetailQuery,
  usePreviewChangesMutation,
  useCommitChangesMutation,
  useAssignmentsQuery,
  usePreviewAssignmentMutation,
  usePreviewEnrollmentMutation,
  useWarningsQuery,
  useAuditQuery,
  useActivationMutation,
  useActivateAccountMutation,
  useLazyProfileTemplateQuery,
  useProfileExportMutation,
  useProfileImportMutation,
} = managementApi;
