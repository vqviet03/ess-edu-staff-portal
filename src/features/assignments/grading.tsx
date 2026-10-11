"use client";
import { useState } from "react";
import Link from "next/link";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import {
  useAssignmentSubmissionsQuery,
  useAssignmentSubmissionQuery,
  useAssignmentQuery,
  useGradeAssignmentMutation,
  usePublishAssignmentGradeMutation,
} from "@/api/assignment-api";
import { Feedback } from "@/shared/ui";
import { useUnsaved } from "@/shared/unsaved";
import { errorMessage } from "@/api/base-query";
import { AssignmentMedia, RichContent } from "./media";
import {
  numberLabel,
  blockMedia,
  statusLabels,
  type Assignment,
  type Submission,
} from "./models";
export function SubmissionList({ assignment }: { assignment: Assignment }) {
  const [cursor, setCursor] = useState<string>(),
    q = useAssignmentSubmissionsQuery({ id: assignment.id, cursor });
  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Bài nộp · {assignment.title}
      </Typography>
      <Feedback
        loading={q.isLoading}
        error={q.error}
        retry={() => void q.refetch()}
      />
      {q.data?.items.length === 0 && (
        <Alert severity="info">Chưa có học sinh nộp bài.</Alert>
      )}
      {q.data?.items.map((s) => (
        <Paper key={s.id} variant="outlined" sx={{ p: 2, borderRadius: "16px" }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{
              alignItems: { sm: "center" },
              justifyContent: "space-between",
            }}
          >
            <Stack>
              <Typography sx={{ fontWeight: 700 }}>
                {s.studentName}{" "}
                {s.studentNickname ? `(${s.studentNickname})` : ""}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {s.studentId} ·{" "}
                {s.submittedAt &&
                  new Date(s.submittedAt).toLocaleString("vi-VN")}
                {s.isLate ? " · Nộp muộn" : ""}
              </Typography>
            </Stack>
            <Chip label={statusLabels[s.status] ?? s.status} size="small" />
            <Button
              component={Link}
              href={`/assignment/?assignmentId=${assignment.id}&classId=${assignment.classId}&submissionId=${s.id}&mode=grade`}
            >
              {assignment.canEdit ? "Chấm bài" : "Xem bài nộp"}
            </Button>
          </Stack>
        </Paper>
      ))}
      <Stack direction="row" spacing={1}>
        {cursor && <Button onClick={() => setCursor(undefined)}>Về đầu</Button>}
        {q.data?.nextCursor && (
          <Button onClick={() => setCursor(q.data!.nextCursor!)}>
            Trang tiếp
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
export function SubmissionGrading({
  id,
  submissionId,
}: {
  id: string;
  submissionId: string;
}) {
  const sub = useAssignmentSubmissionQuery({ id, submissionId }),
    form = useAssignmentQuery(
      { id, versionId: sub.data?.assignmentVersionId },
      { skip: !sub.data },
    );
  return (
    <>
      <Feedback
        loading={sub.isLoading || form.isLoading}
        error={sub.error || form.error}
        retry={() => {
          void sub.refetch();
          if (sub.data) void form.refetch();
        }}
      />
      {sub.data && form.data && (
        <GradeForm
          key={submissionId}
          assignment={form.data}
          initial={sub.data}
        />
      )}
    </>
  );
}
function GradeForm({
  assignment,
  initial,
}: {
  assignment: Assignment;
  initial: Submission;
}) {
  const [draft, setDraft] = useState(initial),
    [saved, setSaved] = useState(JSON.stringify(initial)),
    [error, setError] = useState<unknown>(),
    [message, setMessage] = useState(""),
    [save, state] = useGradeAssignmentMutation(),
    [publish, publishing] = usePublishAssignmentGradeMutation();
  const dirty = JSON.stringify(draft) !== saved;
  useUnsaved(dirty);
  const total = draft.grades.some((g) => g.score == null)
    ? null
    : draft.grades.reduce((s, g) => s + (g.score ?? 0), 0);
  const valid = draft.grades.every(
    (g) =>
      g.score == null ||
      (g.score >= 0 &&
        g.score <=
          (assignment.questions.find((q) => q.id === g.questionId)?.maxScore ??
            0)),
  );
  async function persist() {
    const result = await save({
      id: assignment.id,
      submissionId: draft.id,
      version: draft.version,
      grades: draft.grades,
      overallComment: draft.overallComment,
      overallAdvice: draft.overallAdvice,
    }).unwrap();
    setDraft(result);
    setSaved(JSON.stringify(result));
    return result;
  }
  return (
    <Stack spacing={2.5} sx={{ maxWidth: 920, mx: "auto" }}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Chấm bài · {draft.studentName}
      </Typography>
      <Typography color="text.secondary">
        {assignment.title} · Phiên bản {assignment.schemaVersion}
      </Typography>
      {!assignment.canEdit && (
        <Alert severity="info">
          Chỉ xem. Chấm điểm yêu cầu vai trò giảng viên và phân công hiện tại
          của lớp.
        </Alert>
      )}
      {error != null && <Alert severity="error">{errorMessage(error)}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      {assignment.questions.map((q, index) => {
        const a = draft.answers.find((a) => a.questionId === q.id),
          g = draft.grades.find((g) => g.questionId === q.id);
        return (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: "16px" }} key={q.id}>
            <Stack spacing={2}>
              <Typography sx={{ fontWeight: 700 }}>
                Câu {index + 1} · {q.maxScore} điểm
              </Typography>
              <RichContent value={q.content} media={q.media} />
              <AssignmentMedia media={blockMedia(q.content,q.media)} />
              <Paper sx={{ p: 2, bgcolor: "action.selected" }}>
                <Typography variant="caption" color="text.secondary">
                  Bài làm học sinh
                </Typography>
                <Typography
                  sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                >
                  {a?.text}
                </Typography>
                {a?.link && <RichContent value={a.link} />}
                <Typography>
                  {a?.optionIds
                    .map(
                      (id) =>
                        q.options.find((o) => o.id === id)?.content ||
                        "Đáp án bằng media",
                    )
                    .join(" · ")}
                </Typography>
                {a?.optionIds.map((id) => {
                  const option = q.options.find((o) => o.id === id);
                  return option ? (
                    <AssignmentMedia key={id} media={option.media} />
                  ) : null;
                })}
                <AssignmentMedia
                  media={(a?.files ?? []).map((f) => ({
                    materialId: f.id,
                    file: f,
                    displayWidth: null,
                    displayHeight: null,
                    keepAspectRatio: true,
                  }))}
                />
              </Paper>
              {q.rubric && (
                <Alert severity="info">Tiêu chí chấm: {q.rubric}</Alert>
              )}
              {g && (
                <>
                  <TextField
                    size="small"
                    type="number"
                    label={`Điểm / ${q.maxScore}${g.automatic ? " · chấm tự động" : ""}`}
                    value={g.score ?? ""}
                    disabled={!assignment.canEdit || g.automatic}
                    error={
                      g.score != null && (g.score < 0 || g.score > q.maxScore)
                    }
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        grades: d.grades.map((x) =>
                          x.questionId === q.id
                            ? {
                                ...x,
                                score:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              }
                            : x,
                        ),
                      }))
                    }
                    slotProps={{
                      htmlInput: { min: 0, max: q.maxScore, step: 0.1 },
                    }}
                  />
                  {(["comment", "advice"] as const).map((field, i) => (
                    <TextField
                      key={field}
                      size="small"
                      label={
                        i ? "Lời khuyên cải thiện" : "Nhận xét câu trả lời"
                      }
                      multiline
                      minRows={2}
                      value={g[field]}
                      disabled={!assignment.canEdit}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          grades: d.grades.map((x) =>
                            x.questionId === q.id
                              ? { ...x, [field]: e.target.value }
                              : x,
                          ),
                        }))
                      }
                    />
                  ))}
                </>
              )}
            </Stack>
          </Paper>
        );
      })}
      <Paper sx={{ p: 3, bgcolor: "action.selected", borderRadius: "16px" }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Tổng điểm: {numberLabel(total)} / {assignment.totalMax}{" "}
            {total == null
              ? ""
              : `(${numberLabel((total / assignment.totalMax) * 100)}%)`}
          </Typography>
          {total == null && (
            <Typography color="text.secondary">
              Còn câu chờ chấm; chưa có tổng điểm cuối cùng.
            </Typography>
          )}
          {(["overallComment", "overallAdvice"] as const).map((field, i) => (
            <TextField
              key={field}
              size="small"
              multiline
              minRows={3}
              label={i ? "Lời khuyên tổng thể" : "Nhận xét tổng thể"}
              disabled={!assignment.canEdit}
              value={draft[field]}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [field]: e.target.value }))
              }
            />
          ))}
        </Stack>
      </Paper>
      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
        <Button
          disabled={
            !assignment.canEdit ||
            !valid ||
            state.isLoading ||
            publishing.isLoading
          }
          onClick={() =>
            void persist()
              .then(() => setMessage("Đã lưu điểm."))
              .catch(setError)
          }
        >
          Lưu điểm
        </Button>
        <Button
          variant="contained"
          disabled={
            !assignment.canEdit ||
            !valid ||
            total == null ||
            state.isLoading ||
            publishing.isLoading
          }
          onClick={async () => {
            try {
              const result = dirty ? await persist() : draft;
              const published = await publish({
                id: assignment.id,
                submissionId: result.id,
                version: result.version,
              }).unwrap();
              setDraft(published);
              setSaved(JSON.stringify(published));
              setMessage("Đã công bố kết quả cho học sinh.");
            } catch (e) {
              setError(e);
            }
          }}
        >
          Công bố kết quả
        </Button>
      </Stack>
    </Stack>
  );
}
