"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Edit from "@mui/icons-material/EditOutlined";
import { SubmissionWindow } from "./acceptance";
import { RichContent } from "./media";
import { DeadlineChip } from "@/features/materials/deadline-chip";
import { BackAction } from "@/shared/back-action";
import { useAssignmentQuery } from "@/api/assignment-api";
import { useClassCapabilities } from "@/features/access/hooks";
import { Feedback } from "@/shared/ui";
import { SubmissionList, SubmissionGrading } from "./grading";
const ClassReport = dynamic(
  () => import("./class-report").then((m) => m.ClassAssignmentReport),
  { loading: () => <Feedback loading /> },
);
const Editor = dynamic(
  () => import("./editor").then((m) => m.AssignmentEditor),
  { loading: () => <Feedback loading /> },
);
const Preview = dynamic(
  () => import("./player").then((m) => m.AssignmentPlayer),
  { loading: () => <Feedback loading /> },
);
export function AssignmentPage() {
  const params = useSearchParams();
  const classId = params.get("classId") ?? "",
    id = params.get("assignmentId");
  const fallback = !classId
    ? "/home/"
    : id && ["edit", "grade"].includes(params.get("mode") ?? "")
      ? `/assignment/?${new URLSearchParams({ assignmentId: id, classId })}`
      : `/class/thread/?classId=${encodeURIComponent(classId)}`;
  return (
    <Stack spacing={2}>
      <Stack direction="row">
        <BackAction fallback={fallback} />
      </Stack>
      <AssignmentContent />
    </Stack>
  );
}
function AssignmentContent() {
  const [showReport, setShowReport] = useState(false),
    [showSubmissions, setShowSubmissions] = useState(false);
  const router = useRouter();
  const params = useSearchParams(),
    id = params.get("assignmentId") ?? "",
    classId = params.get("classId") ?? "",
    mode = params.get("mode"),
    submissionId = params.get("submissionId") ?? "",
    access = useClassCapabilities(classId),
    query = useAssignmentQuery({ id }, { skip: !id || !access.viewLearning });
  const cancel = () =>
    router.replace(
      id
        ? `/assignment/?${new URLSearchParams({ assignmentId: id, classId })}`
        : `/class/thread/?classId=${encodeURIComponent(classId)}`,
    );
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
        cancel={cancel}
        sessionId={params.get("sessionId") ?? undefined}
      />
    ) : (
      <Feedback empty="Chỉ giảng viên đang phụ trách được tạo bài tập." />
    );
  if (!id) return <Feedback empty="Thiếu bài tập." />;
  return (
    <Stack spacing={2}>
      <Feedback
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data &&
        (mode === "edit" &&
        access.editLearning &&
        (query.data.canEditSchema ?? query.data.canEdit) ? (
          <Editor
            key={id}
            classId={classId}
            initial={query.data}
            cancel={cancel}
          />
        ) : mode === "grade" && submissionId ? (
          <SubmissionGrading
            id={id}
            submissionId={submissionId}
            editable={access.editLearning}
          />
        ) : (
          <>
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}
            >
              <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
                {query.data.title}
              </Typography>
              {access.editLearning &&
                (query.data.canEditSchema ?? query.data.canEdit) && (
                  <Tooltip title="Chỉnh sửa bài tập">
                    <IconButton
                      component={Link}
                      replace
                      aria-label="Chỉnh sửa bài tập"
                      href={`/assignment/?${new URLSearchParams({ assignmentId: id, classId, mode: "edit" })}`}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
            </Stack>
            <Typography component="div">
              <RichContent value={query.data.instructions} />
            </Typography>
            <Typography color="text.secondary">
              {query.data.questions.length} câu · {query.data.totalMax} điểm ·
              Phiên bản {query.data.schemaVersion}
            </Typography>
            <Stack direction="row">
              <DeadlineChip deadline={query.data.deadline} />
            </Stack>
            {query.data.status === "PUBLISHED" && (
              <SubmissionWindow
                key={`${id}:${query.data.version}`}
                assignment={{
                  ...query.data,
                  canEdit: access.editLearning && query.data.canEdit,
                }}
              />
            )}
            <Preview
              key={`${id}:${query.data.assignmentVersionId}`}
              assignment={query.data}
              initial={null}
              preview
            />
            <Button
              aria-expanded={showSubmissions}
              onClick={() => setShowSubmissions((v) => !v)}
            >
              {showSubmissions ? "Ẩn bài nộp" : "Xem bài nộp"}
            </Button>
            {showSubmissions && (
              <SubmissionList
                assignment={{
                  ...query.data,
                  canEdit: access.editLearning && query.data.canEdit,
                }}
              />
            )}
            <Button
              onClick={() => setShowReport((v) => !v)}
              aria-expanded={showReport}
            >
              {showReport ? "Ẩn báo cáo lớp" : "Báo cáo bài tập của lớp"}
            </Button>
            {showReport && <ClassReport classId={classId} />}
          </>
        ))}
    </Stack>
  );
}
