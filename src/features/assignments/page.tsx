"use client";
import dynamic from "next/dynamic";
import {useState} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useAssignmentQuery } from "@/api/assignment-api";
import { useClassCapabilities } from "@/features/access/hooks";
import { Feedback } from "@/shared/ui";
import { SubmissionList, SubmissionGrading } from "./grading";
const ClassReport=dynamic(()=>import("./class-report").then(m=>m.ClassAssignmentReport),{loading:()=> <Feedback loading/>});
const Editor = dynamic(
  () => import("./editor").then((m) => m.AssignmentEditor),
  { loading: () => <Feedback loading /> },
);
export function AssignmentPage() {
  const [showReport,setShowReport]=useState(false);
  const params = useSearchParams(),
    id = params.get("assignmentId") ?? "",
    classId = params.get("classId") ?? "",
    mode = params.get("mode"),
    submissionId = params.get("submissionId") ?? "",
    access = useClassCapabilities(classId),
    query = useAssignmentQuery({ id }, { skip: !id || !access.viewLearning });
  if (!classId) return <Feedback empty="Mở bài tập từ lớp học." />;
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
  if (mode === "create")
    return access.editLearning ? (
      <Editor
        classId={classId}
        sessionId={params.get("sessionId") ?? undefined}
      />
    ) : (
      <Feedback empty="Chỉ giảng viên đang phụ trách được tạo bài tập." />
    );
  if (!id) return <Feedback empty="Thiếu bài tập." />;
  return (
    <Stack spacing={2}>
      <Button
        component={Link}
        href={`/class/?classId=${classId}`}
        sx={{ alignSelf: "flex-start" }}
      >
        ← Về lớp
      </Button>
      <Feedback
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data &&
        (mode === "edit" ? (
          (query.data.canEditSchema ?? query.data.canEdit) ? (
            <Editor key={id} classId={classId} initial={query.data} />
          ) : (
            <Feedback empty="Bạn chỉ có quyền xem bài tập này." />
          )
        ) : mode === "grade" && submissionId ? (
          <SubmissionGrading id={id} submissionId={submissionId} />
        ) : (
          <>
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}
            >
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {query.data.title}
              </Typography>
              {(query.data.canEditSchema ?? query.data.canEdit) && (
                <Button
                  component={Link}
                  href={`/assignment/?assignmentId=${id}&classId=${classId}&mode=edit`}
                >
                  Soạn / xem trước
                </Button>
              )}
            </Stack>
            <Typography sx={{ whiteSpace: "pre-wrap" }}>
              {query.data.instructions}
            </Typography>
            <Typography color="text.secondary">
              {query.data.questions.length} câu · {query.data.totalMax} điểm ·
              Phiên bản {query.data.schemaVersion}
            </Typography>
            <SubmissionList assignment={query.data} />
            <Button onClick={()=>setShowReport(v=>!v)} aria-expanded={showReport}>{showReport?"Ẩn báo cáo lớp":"Báo cáo bài tập của lớp"}</Button>
            {showReport&&<ClassReport classId={classId}/>}
          </>
        ))}
    </Stack>
  );
}
