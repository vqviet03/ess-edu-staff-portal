import { api } from "./api";
import type { Envelope } from "@/types";
import type { CommentsInput, ProgressEntry, ReportContext, StaffReport, Unit, UnitContext } from "@/features/reports/models";
export function injectReportEndpoints(service: typeof api) {
  return service.injectEndpoints({ endpoints: (b) => ({
    studentUnits: b.query<Unit[], ReportContext>({ query: (a) => `${path(a)}/units`, transformResponse: (r: Envelope<{ items: Unit[] }>) => r.data.items, providesTags: (_, __, a) => [{type: "Reports", id: `${a.classId}:${a.studentId}`}] }),
    studentProgress: b.query<ProgressEntry[], ReportContext>({ query: (a) => `${path(a)}/progress`, transformResponse: (r: Envelope<{ items: ProgressEntry[] }>) => r.data.items, providesTags: (_, __, a) => [{type: "Reports", id: `${a.classId}:${a.studentId}`}] }),
    studentReport: b.query<StaffReport, UnitContext>({ query: (a) => `${path(a)}/units/${encodeURIComponent(a.unitId)}/report`, transformResponse: (r: Envelope<StaffReport>) => r.data, providesTags: (_, __, a) => [{type: "Reports", id: `${a.classId}:${a.studentId}`}]}),
    updateReportComments: b.mutation<StaffReport, UnitContext & {comments: CommentsInput}>({ query: (a) => ({url: `${path(a)}/units/${encodeURIComponent(a.unitId)}/report/comments`, method: "PATCH", body: a.comments}), transformResponse: (r: Envelope<StaffReport>) => r.data, invalidatesTags: (_, error, a) => error ? [] : [{type: "Reports", id: `${a.classId}:${a.studentId}`}, "Results", "Assessments"] }),
  }) });
}
const path = (a: ReportContext) => `/classes/${encodeURIComponent(a.classId)}/students/${encodeURIComponent(a.studentId)}`;
export const reportApi = injectReportEndpoints(api);
export const { useStudentUnitsQuery, useStudentProgressQuery, useStudentReportQuery, useUpdateReportCommentsMutation } = reportApi;
