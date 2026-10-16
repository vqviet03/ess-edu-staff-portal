"use client";
import { useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import { AssignmentSurface } from "./surface";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import MenuItem from "@mui/material/MenuItem";
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
import { ReopenSubmissionButton } from "./acceptance";
import { AssignmentPlayer } from "./player";
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
    [status, setStatus] = useState("ALL"),
    q = useAssignmentSubmissionsQuery({ id: assignment.id, cursor });
  const rows = q.currentData?.items ?? [],
    filtered = rows.filter((s) => status === "ALL" || s.status === status);
  const summary = q.currentData?.summary;
  return (
    <Stack spacing={1.5}>
      <Feedback
        loading={q.isLoading}
        error={q.error}
        retry={() => void q.refetch()}
      />
      <Box
        component="section"
        aria-label="Tổng hợp bài nộp"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2,1fr)", md: "repeat(4,1fr)" },
          gap: 1.5,
        }}
      >
        {[
          [
            "Đã nộp",
            summary ? `${summary.submitted}/${summary.assigned}` : "—",
          ],
          ["Chờ chấm", summary?.awaitingGrading ?? "—"],
          ["Đã chấm", summary?.graded ?? "—"],
          ["Chưa nộp", summary?.notSubmitted ?? "—"],
        ].map(([label, value]) => (
          <Paper key={label} sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 700, my: 1 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Học sinh được giao bài · toàn bộ bài tập
            </Typography>
          </Paper>
        ))}
      </Box>
      <TextField
        select
        label="Trạng thái bài nộp (trang hiện tại)"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
        {[...new Set(rows.map((s) => s.status))].map((s) => (
          <MenuItem key={s} value={s}>
            {statusLabels[s] ?? s}
          </MenuItem>
        ))}
      </TextField>
      {rows.length === 0 ? (
        <Alert severity="info">Chưa có học sinh nộp bài.</Alert>
      ) : (
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <TableContainer>
            <Table
              aria-label="Bài nộp của học sinh"
              sx={{
                minWidth: 600,
                "& th,& td": {
                  borderBottom: "1px solid var(--a-border)",
                  px: 1,
                  py: 2,
                },
              }}
            >
              <TableHead>
                <TableRow>
                  {[
                    "Học sinh",
                    "Nộp bài",
                    "Tự chấm",
                    "Điểm cuối",
                    "Trạng thái",
                    "",
                  ].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {s.studentName}
                      {s.studentNickname ? ` (${s.studentNickname})` : ""}
                    </TableCell>
                    <TableCell>
                      {s.submittedAt
                        ? new Date(s.submittedAt).toLocaleString("vi-VN")
                        : "Chưa nộp"}
                      {s.isLate ? " · Nộp muộn" : ""}
                    </TableCell>
                    <TableCell>
                      {numberLabel(
                        s.grades
                          .filter((g) => g.automatic)
                          .reduce((sum, g) => sum + (g.score ?? 0), 0),
                      )}
                      /
                      {assignment.questions
                        .filter(
                          (q) => q.type === "SINGLE" || q.type === "MULTIPLE",
                        )
                        .reduce((sum, q) => sum + q.maxScore, 0)}
                    </TableCell>
                    <TableCell>
                      {numberLabel(s.totalScore)}/{s.totalMax}
                    </TableCell>
                    <TableCell
                      sx={{
                        color:
                          s.totalScore == null
                            ? "warning.main"
                            : "text.secondary",
                      }}
                    >
                      {statusLabels[s.status] ?? s.status}
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction="row"
                        sx={{ alignItems: "center", gap: 0.5 }}
                      >
                        <Button
                          component={Link}
                          href={`/assignment/?assignmentId=${assignment.id}&classId=${assignment.classId}&submissionId=${s.id}&mode=grade`}
                        >
                          {assignment.canEdit && s.submittedAt
                            ? "Chấm bài"
                            : "Xem bài nộp"}
                        </Button>
                        <ReopenSubmissionButton
                          assignment={assignment}
                          submission={s}
                        />
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {!filtered.length && (
            <Typography sx={{ py: 2 }}>
              Không có bài nộp khớp bộ lọc trên trang này.
            </Typography>
          )}
        </Paper>
      )}
      {(cursor || q.data?.nextCursor) && (
        <Stack direction="row" spacing={1}>
          {cursor && (
            <Button onClick={() => setCursor(undefined)}>Về đầu</Button>
          )}
          {q.data?.nextCursor && (
            <Button onClick={() => setCursor(q.data!.nextCursor!)}>
              Trang tiếp
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  );
}
export function SubmissionGrading({
  id,
  submissionId,
  editable = true,
}: {
  id: string;
  submissionId: string;
  editable?: boolean;
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
          assignment={{ ...form.data, canEdit: editable && form.data.canEdit }}
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
    <AssignmentSurface>
      <Stack spacing={{ xs: 2, md: 3 }} sx={{ minWidth: 0 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Chấm bài · {draft.studentName}
          {draft.studentNickname ? ` (${draft.studentNickname})` : ""}
        </Typography>
        <Typography color="text.secondary">
          {assignment.title} ·{" "}
          {assignment.unitNumber ? `Unit ${assignment.unitNumber} · ` : ""}
          {draft.submittedAt
            ? `Đã nộp ${new Date(draft.submittedAt).toLocaleString("vi-VN")}`
            : ""}{" "}
          · Phiên bản {assignment.schemaVersion}
        </Typography>
        <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
          <ReopenSubmissionButton
            assignment={assignment}
            submission={draft}
            disabled={dirty || state.isLoading || publishing.isLoading}
            onReopened={(s) => {
              setDraft(s);
              setSaved(JSON.stringify(s));
              setMessage("Đã mở lại bài nộp cho học sinh.");
            }}
          />
        </Stack>
        {!draft.submittedAt && (
          <>
            <Alert severity="info">
              Bài đã được mở lại. Học sinh đang chỉnh sửa; chỉ chấm khi học sinh
              nộp lại.
            </Alert>
            <AssignmentPlayer assignment={assignment} initial={draft} preview />
          </>
        )}
        {!assignment.canEdit && (
          <Alert severity="info">
            Chỉ xem. Chấm điểm yêu cầu vai trò giảng viên và phân công hiện tại
            của lớp.
          </Alert>
        )}
        {error != null && <Alert severity="error">{errorMessage(error)}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {draft.grades.some((g) => g.automatic) && (
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Trắc nghiệm · Tự chấm{" "}
              {numberLabel(
                draft.grades
                  .filter((g) => g.automatic)
                  .reduce((sum, g) => sum + (g.score ?? 0), 0),
              )}
              /
              {assignment.questions
                .filter((q) => q.type === "SINGLE" || q.type === "MULTIPLE")
                .reduce((sum, q) => sum + q.maxScore, 0)}
            </Typography>
            {assignment.questions.map((q, index) => {
              const grade = draft.grades.find((g) => g.questionId === q.id),
                answer = draft.answers.find((a) => a.questionId === q.id);
              if (!grade?.automatic) return null;
              return (
                <Box
                  key={q.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "48px minmax(0,1fr)",
                      sm: "64px minmax(0,1fr) auto",
                    },
                    gap: 1,
                    py: 1.5,
                    alignItems: "start",
                  }}
                >
                  <Typography>Câu {index + 1}</Typography>
                  <Box>
                    {answer?.optionIds.map((id) => {
                      const option = q.options.find((o) => o.id === id);
                      return option ? (
                        <Box key={id}>
                          <RichContent value={option.content} />
                          <AssignmentMedia media={option.media} />
                        </Box>
                      ) : null;
                    })}
                  </Box>
                  <Typography
                    sx={{
                      gridColumn: { xs: "2", sm: "auto" },
                      fontWeight: 700,
                      color:
                        grade.score === q.maxScore
                          ? "var(--a-green)"
                          : "error.main",
                    }}
                  >
                    {grade.score === q.maxScore ? "Đúng" : "Chưa đúng"} ·{" "}
                    {numberLabel(grade.score)}/{q.maxScore}
                  </Typography>
                </Box>
              );
            })}
          </Paper>
        )}
        {assignment.questions.map((q, index) => {
          if (q.type === "SINGLE" || q.type === "MULTIPLE") return null;
          const a = draft.answers.find((a) => a.questionId === q.id),
            g = draft.grades.find((g) => g.questionId === q.id);
          return (
            <Paper sx={{ p: { xs: 2, md: 3 } }} key={q.id}>
              <Stack spacing={2}>
                <Typography sx={{ fontWeight: 700 }}>
                  Câu {index + 1} ·{" "}
                  {q.type === "TEXT"
                    ? "Tự luận"
                    : q.type === "SPEAKING"
                      ? "Bài nói"
                      : "Link / file"}{" "}
                  · Tối đa {q.maxScore} điểm
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <RichContent value={q.content} media={q.media} />
                </Typography>
                <AssignmentMedia media={blockMedia(q.content, q.media)} />
                <Box>
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
                </Box>
                {q.rubric && (
                  <Box component="details">
                    <Typography
                      component="summary"
                      variant="body2"
                      color="text.secondary"
                    >
                      Tiêu chí chấm
                    </Typography>
                    <Typography variant="body2">{q.rubric}</Typography>
                  </Box>
                )}
                {g && (
                  <>
                    <TextField
                      size="small"
                      type="number"
                      label={`Điểm Câu ${index + 1} / ${q.maxScore}`}
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
                        minRows={1}
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
        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            bgcolor: "var(--a-purple-bg)",
            color: "var(--a-purple)",
          }}
        >
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Điểm cuối · {numberLabel(total)} / {assignment.totalMax}{" "}
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
                minRows={1}
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
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ justifyContent: "flex-start", flexWrap: "wrap" }}
        >
          <Button
            disabled={
              !assignment.canEdit ||
              !draft.submittedAt ||
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
            Lưu chấm nháp
          </Button>
          <Button
            variant="contained"
            disabled={
              !assignment.canEdit ||
              !draft.submittedAt ||
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
    </AssignmentSurface>
  );
}
