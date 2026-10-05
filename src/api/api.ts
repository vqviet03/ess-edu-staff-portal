import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  Assessment,
  AssessmentInput,
  AuthSession,
  BatchResponse,
  Class,
  Context,
  Envelope,
  ImportPreview,
  Session,
  Student,
  StudentResult,
  Teacher,
} from "@/types";
import { verifiedSession, verifiedStaff } from "@/features/auth/contract";
import { baseQuery } from "./base-query";
const unwrap = <T>(r: Envelope<T>) => r.data;
const tags = (type: "Students" | "Sessions" | "Results", id: string) => [
  { type, id },
];
export const createStaffApi = (query = baseQuery) =>
  createApi({
    reducerPath: "staffApi",
    baseQuery: query,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: 30,
    tagTypes: [
      "Auth",
      "Management",
      "Dashboard",
      "Assignments",
      "Warnings",
      "Audit",
      "ClassAccess",
      "Classes",
      "Class",
      "Students",
      "Sessions",
      "Assessments",
      "Results",
      "Operations",
    ],
    endpoints: (b) => ({
      login: b.mutation<AuthSession, { teacherId: string; password: string }>({
        query: (body) => ({ url: "/auth/login", method: "POST", body }),
        transformResponse: (r: Envelope<AuthSession>) =>
          verifiedSession(r.data),
      }),
      exchange: b.mutation<AuthSession, { code: string }>({
        query: (body) => ({ url: "/auth/link/exchange", method: "POST", body }),
        transformResponse: (r: Envelope<AuthSession>) =>
          verifiedSession(r.data),
      }),
      logout: b.mutation<{ loggedOut: boolean }, void>({
        query: () => ({ url: "/auth/logout", method: "POST" }),
        transformResponse: unwrap<{ loggedOut: boolean }>,
      }),
      me: b.query<Teacher, void>({
        query: () => "/auth/me",
        transformResponse: (r: Envelope<Teacher>) => verifiedStaff(r.data),
        providesTags: ["Auth"],
      }),
      classes: b.query<
        Envelope<Class[]>,
        {
          search: string;
          status: string;
          page: number;
          pageSize: number;
          workspace?: "teacher" | "manager";
        }
      >({
        query: (p) =>
          "/classes?" +
          new URLSearchParams(
            Object.entries(p).map(([k, v]) => [k, String(v)]),
          ),
        providesTags: ["Classes"],
      }),
      class: b.query<Class, string>({
        query: (id) => `/classes/${encodeURIComponent(id)}`,
        transformResponse: unwrap<Class>,
        providesTags: (_, __, id) => [{ type: "Class", id }],
      }),
      students: b.query<Student[], string>({
        query: (id) => `/classes/${encodeURIComponent(id)}/students`,
        transformResponse: unwrap<Student[]>,
        providesTags: (_, __, id) => tags("Students", id),
      }),
      historicalStudents: b.query<Student[], string>({
        query: (id) =>
          `/classes/${encodeURIComponent(id)}/students?includeHistory=true`,
        transformResponse: unwrap<Student[]>,
        providesTags: (_, __, id) => tags("Students", id),
      }),
      updateStudent: b.mutation<Student, { classId: string; student: Student }>(
        {
          query: ({ classId, student }) => ({
            url: `/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(student.id)}`,
            method: "PATCH",
            body: student,
          }),
          transformResponse: unwrap<Student>,
          invalidatesTags: (_, error, a) =>
            error ? [] : tags("Students", a.classId),
        },
      ),
      sessions: b.query<Session[], string>({
        query: (id) => `/classes/${encodeURIComponent(id)}/sessions`,
        transformResponse: unwrap<Session[]>,
        providesTags: (_, __, id) => tags("Sessions", id),
      }),
      createSession: b.mutation<
        Session,
        {
          classId: string;
          session: Omit<Session, "id" | "classId" | "version">;
        }
      >({
        query: (a) => ({
          url: `/classes/${encodeURIComponent(a.classId)}/sessions`,
          method: "POST",
          body: a.session,
        }),
        transformResponse: unwrap<Session>,
        invalidatesTags: (_, error, a) =>
          error
            ? []
            : [
                ...tags("Sessions", a.classId),
                { type: "Class", id: a.classId },
                "Classes",
              ],
      }),
      updateSession: b.mutation<Session, Session>({
        query: (s) => ({
          url: `/sessions/${encodeURIComponent(s.id)}`,
          method: "PATCH",
          body: s,
        }),
        transformResponse: unwrap<Session>,
        invalidatesTags: (_, error, s) =>
          error
            ? []
            : [
                ...tags("Sessions", s.classId),
                { type: "Class", id: s.classId },
                "Classes",
              ],
      }),
      assessments: b.query<Assessment[], string>({
        query: (id) => `/sessions/${encodeURIComponent(id)}/assessments`,
        transformResponse: unwrap<Assessment[]>,
        providesTags: (_, __, id) => [
          { type: "Assessments", id: "session-" + id },
        ],
      }),
      createAssessment: b.mutation<
        Assessment,
        { sessionId: string; assessment: AssessmentInput }
      >({
        query: (a) => ({
          url: `/sessions/${encodeURIComponent(a.sessionId)}/assessments`,
          method: "POST",
          body: a.assessment,
        }),
        transformResponse: unwrap<Assessment>,
        invalidatesTags: (_, error, a) =>
          error ? [] : [{ type: "Assessments", id: "session-" + a.sessionId }],
      }),
      assessment: b.query<Assessment, string>({
        query: (id) => `/assessments/${encodeURIComponent(id)}`,
        transformResponse: unwrap<Assessment>,
        providesTags: (_, __, id) => [{ type: "Assessments", id }],
      }),
      updateAssessment: b.mutation<
        Assessment,
        Assessment & { confirmSchemaChange?: boolean }
      >({
        query: (a) => ({
          url: `/assessments/${encodeURIComponent(a.id)}`,
          method: "PATCH",
          body: a,
        }),
        transformResponse: unwrap<Assessment>,
        invalidatesTags: (_, error, a) =>
          error
            ? []
            : [
                { type: "Assessments", id: a.id },
                { type: "Assessments", id: "session-" + a.sessionId },
                ...tags("Results", a.id),
              ],
      }),
      results: b.query<StudentResult[], string>({
        query: (id) => `/assessments/${encodeURIComponent(id)}/results`,
        transformResponse: unwrap<StudentResult[]>,
        providesTags: (_, __, id) => tags("Results", id),
      }),
      saveResult: b.mutation<
        StudentResult,
        { assessmentId: string; result: StudentResult }
      >({
        query: (a) => ({
          url: `/assessments/${encodeURIComponent(a.assessmentId)}/results/${encodeURIComponent(a.result.studentId)}`,
          method: "PUT",
          body: a.result,
        }),
        transformResponse: unwrap<StudentResult>,
        invalidatesTags: (_, error, a) =>
          error ? [] : tags("Results", a.assessmentId),
      }),
      saveBatch: b.mutation<
        BatchResponse,
        { assessmentId: string; rows: StudentResult[] }
      >({
        query: (a) => ({
          url: `/assessments/${encodeURIComponent(a.assessmentId)}/results/batch`,
          method: "PATCH",
          body: { rows: a.rows },
        }),
        transformResponse: unwrap<BatchResponse>,
        invalidatesTags: (_, error, a) =>
          error ? [] : tags("Results", a.assessmentId),
      }),
      template: b.query<Blob, string>({
        query: (id) => ({
          url: `/assessments/${encodeURIComponent(id)}/excel-template`,
          responseHandler: async (response) =>
            response.ok ? response.blob() : response.json(),
        }),
        keepUnusedDataFor: 0,
      }),
      previewImport: b.mutation<
        ImportPreview,
        { assessmentId: string; file: File; mode: ImportPreview["mode"] }
      >({
        query: (a) => {
          const body = new FormData();
          body.set("file", a.file);
          body.set("mode", a.mode);
          return {
            url: `/assessments/${encodeURIComponent(a.assessmentId)}/import/preview`,
            method: "POST",
            body,
          };
        },
        transformResponse: unwrap<ImportPreview>,
      }),
      commitImport: b.mutation<
        { updated: number },
        {
          assessmentId: string;
          previewId: string;
          mode: ImportPreview["mode"];
          key: string;
        }
      >({
        query: (a) => ({
          url: `/assessments/${encodeURIComponent(a.assessmentId)}/import/commit`,
          method: "POST",
          headers: { "Idempotency-Key": a.key },
          body: { previewId: a.previewId, mode: a.mode },
        }),
        transformResponse: unwrap<{ updated: number }>,
        invalidatesTags: (_, error, a) =>
          error ? [] : tags("Results", a.assessmentId),
      }),
      resetDemo: b.mutation<{ reset: boolean }, void>({
        query: () => ({ url: "/demo/reset", method: "POST" }),
        transformResponse: unwrap<{ reset: boolean }>,
      }),
    }),
  });
export const api = createStaffApi();
export const {
  useLoginMutation,
  useExchangeMutation,
  useLogoutMutation,
  useMeQuery,
  useClassesQuery,
  useClassQuery,
  useStudentsQuery,
  useHistoricalStudentsQuery,
  useUpdateStudentMutation,
  useSessionsQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useAssessmentsQuery,
  useCreateAssessmentMutation,
  useAssessmentQuery,
  useUpdateAssessmentMutation,
  useResultsQuery,
  useSaveResultMutation,
  useSaveBatchMutation,
  useLazyTemplateQuery,
  usePreviewImportMutation,
  useCommitImportMutation,
  useResetDemoMutation,
} = api;
export function ids(context: Context) {
  return Boolean(context.classId && context.sessionId && context.assessmentId);
}
