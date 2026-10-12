"use client";
import { useSearchParams } from "next/navigation";
import { useClassQuery } from "@/api/api";
import { useClassCapabilities } from "@/features/access/hooks";
import { Feedback } from "@/shared/ui";
import { AssignmentReportView } from "./report";
import { ClassAssignmentReport } from "./class-report";
export function AssignmentReportPage() {
  const p = useSearchParams(),
    classId = p.get("classId") ?? "",
    studentId = p.get("studentId") ?? undefined,
    access = useClassCapabilities(classId),
    q = useClassQuery(classId, { skip: !classId || !access.viewLearning });
  if (!classId) return <Feedback empty="Mở báo cáo từ lớp học." />;
  if (access.loading || access.error)
    return (
      <Feedback
        loading={access.loading}
        error={access.error}
        retry={() => void access.retry()}
      />
    );
  if (!access.viewLearning)
    return <Feedback empty="Bạn không có quyền xem lớp này." />;
  return studentId ? (
    <AssignmentReportView
      classId={classId}
      className={q.data?.name}
      studentId={studentId}
    />
  ) : (
    <ClassAssignmentReport classId={classId} />
  );
}
