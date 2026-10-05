"use client";
import { useClassCapabilities } from "@/features/access/hooks";
import { useSearchParams } from "next/navigation";
import {
  useClassQuery,
  useHistoricalStudentsQuery,
  useSessionsQuery,
  useAssessmentQuery,
  useResultsQuery,
} from "@/api/api";
export function useScoreContext() {
  const params = useSearchParams(),
    context = {
      classId: params.get("classId") ?? "",
      sessionId: params.get("sessionId") ?? "",
      assessmentId: params.get("assessmentId") ?? "",
    },
    ready = Object.values(context).every(Boolean);
  const permissions=useClassCapabilities(context.classId);
  const c = useClassQuery(context.classId, { skip: !ready }),
    students = useHistoricalStudentsQuery(context.classId, { skip: !ready }),
    sessions = useSessionsQuery(context.classId, { skip: !ready }),
    assessment = useAssessmentQuery(context.assessmentId, { skip: !ready }),
    results = useResultsQuery(context.assessmentId, { skip: !ready });
  const wrong =
    (!!assessment.currentData &&
      assessment.currentData.sessionId !== context.sessionId) ||
    (!!sessions.currentData &&
      !sessions.currentData.some((s) => s.id === context.sessionId));
  return {
    context,
    canEdit:permissions.editLearning,
    studentId: params.get("studentId"),
    class: c.currentData,
    students: students.currentData ?? [],
    assessment: assessment.currentData,
    results: results.currentData ?? [],
    loading:
      ready &&
      (permissions.loading || c.isLoading ||
        (c.isFetching && !c.currentData) ||
        students.isLoading ||
        (students.isFetching && !students.currentData) ||
        sessions.isLoading ||
        (sessions.isFetching && !sessions.currentData) ||
        assessment.isLoading ||
        (assessment.isFetching && !assessment.currentData) ||
        results.isLoading ||
        (results.isFetching && !results.currentData)),
    error:
      permissions.error || c.error ||
      students.error ||
      sessions.error ||
      assessment.error ||
      results.error,
    empty: !ready
      ? "Thiếu ID lớp, phiên hoặc bài đánh giá."
      : wrong
        ? "Bài đánh giá / phiên không thuộc lớp đã chọn."
        : undefined,
    retry: () => {
      void permissions.retry();
      void c.refetch();
      void students.refetch();
      void sessions.refetch();
      void assessment.refetch();
      void results.refetch();
    },
  };
}
