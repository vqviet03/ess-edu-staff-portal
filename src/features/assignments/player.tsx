"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Checkbox from "@mui/material/Checkbox";
import Radio from "@mui/material/Radio";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import Drawer from "@mui/material/Drawer";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import Close from "@mui/icons-material/Close";
import {
  useSaveAssignmentDraftMutation,
  useSubmitAssignmentMutation,
} from "@/api/assignment-api";
import { useUnsaved } from "@/shared/unsaved";
import { errorMessage } from "@/api/base-query";
import { AssignmentMedia, RichContent } from "./media";
import { AssignmentUpload } from "./upload";
import { SpeakingRecorder } from "./recorder";
import {
  answered,
  blockMedia,
  emptyAnswer,
  numberLabel,
  questionLabels,
  type Assignment,
  type Answer,
  type Submission,
  type Question,
} from "./models";
const QuestionCard = memo(function QuestionCard({
  q,
  a,
  index,
  assignmentId,
  readOnly,
  onChange,
  onBusy,
  preview = false,
}: {
  preview?: boolean;
  q: Question;
  a: Answer;
  index: number;
  assignmentId: string;
  readOnly: boolean;
  onChange: (id: string, patch: Partial<Answer>) => void;
  onBusy: (id: string, busy: boolean) => void;
}) {
  return (
    <Paper
      id={`question-${q.id}`}
      variant="outlined"
      sx={{ p: { xs: 2, sm: 3 }, borderRadius: "16px", scrollMarginTop: 24 }}
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}
        >
          <Typography sx={{ fontWeight: 700 }}>
            Câu {index + 1} · {questionLabels[q.type]}
          </Typography>
          <Chip size="small" label={`${q.maxScore} điểm`} />
        </Stack>
        <RichContent value={q.content} media={q.media} />
        {q.instructions && (
          <Typography color="text.secondary" variant="body2">
            {q.instructions}
          </Typography>
        )}
        <AssignmentMedia
          media={blockMedia(q.content,q.media)}
        />
        {(q.type === "SINGLE" || q.type === "MULTIPLE") &&
          q.options.map((o) => (
            <Paper
              variant="outlined"
              key={o.id}
              sx={{
                p: 1.5,
                borderRadius: "12px",
                bgcolor: a.optionIds.includes(o.id)
                  ? "action.selected"
                  : undefined,
                borderColor: a.optionIds.includes(o.id)
                  ? "primary.main"
                  : "divider",
              }}
            >
              <FormControlLabel
                sx={{ m: 0, alignItems: "flex-start" }}
                control={
                  q.type === "SINGLE" ? (
                    <Radio
                      checked={a.optionIds.includes(o.id)}
                      disabled={readOnly}
                      onChange={() => onChange(q.id, { optionIds: [o.id] })}
                    />
                  ) : (
                    <Checkbox
                      checked={a.optionIds.includes(o.id)}
                      disabled={readOnly}
                      onChange={(_, checked) =>
                        onChange(q.id, {
                          optionIds: checked
                            ? [...a.optionIds, o.id]
                            : a.optionIds.filter((id) => id !== o.id),
                        })
                      }
                    />
                  )
                }
                label={<RichContent value={o.content} media={o.media} />}
              />
              <AssignmentMedia
                media={blockMedia(o.content,o.media)}
              />
            </Paper>
          ))}
        {q.type === "TEXT" && (
          <TextField
            size="small"
            multiline
            minRows={5}
            fullWidth
            label="Câu trả lời của em"
            value={a.text}
            disabled={readOnly}
            onChange={(e) => onChange(q.id, { text: e.target.value })}
            slotProps={{ htmlInput: { maxLength: 20000 } }}
          />
        )}
        {q.type === "LINK_FILE" && (
          <>
            <TextField
              size="small"
              label="Liên kết http/https"
              value={a.link}
              disabled={readOnly}
              onChange={(e) => onChange(q.id, { link: e.target.value })}
            />
            {!readOnly && !preview && (
              <AssignmentUpload
                assignmentId={assignmentId}
                questionId={q.id}
                onBusy={(v) => onBusy(q.id, v)}
                onFile={(f) =>
                  onChange(q.id, {
                    materialIds: [...a.materialIds, f.id],
                    files: [...(a.files ?? []), f],
                  })
                }
              />
            )}
          </>
        )}
        {q.type === "SPEAKING" &&
          !readOnly &&
          !preview &&
          a.materialIds.length === 0 && (
            <>
              <SpeakingRecorder
                assignmentId={assignmentId}
                questionId={q.id}
                maxSeconds={q.maxDurationSeconds}
                onBusy={(v) => onBusy(q.id, v)}
                onConfirmed={(file, recordingId) =>
                  onChange(q.id, {
                    materialIds: [file.id],
                    files: [file],
                    recordingSessionId: recordingId,
                  })
                }
              />
              {q.allowUploadedAudio && (
                <AssignmentUpload
                  assignmentId={assignmentId}
                  questionId={q.id}
                  accept="audio/*"
                  onBusy={(v) => onBusy(q.id, v)}
                  onFile={(f) =>
                    onChange(q.id, {
                      materialIds: [f.id],
                      files: [f],
                      recordingSessionId: null,
                    })
                  }
                />
              )}
            </>
          )}
        {(a.files ?? []).map((f) => (
          <Stack
            key={f.id}
            direction="row"
            spacing={1}
            sx={{ alignItems: "center" }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <AssignmentMedia
                media={[
                  {
                    materialId: f.id,
                    file: f,
                    displayWidth: null,
                    displayHeight: null,
                    keepAspectRatio: true,
                  },
                ]}
              />
            </Box>
            {!readOnly && (
              <Button
                aria-label={`Bỏ ${f.displayName}`}
                onClick={() =>
                  onChange(q.id, {
                    materialIds: a.materialIds.filter((id) => id !== f.id),
                    files: a.files?.filter((x) => x.id !== f.id),
                    recordingSessionId: null,
                  })
                }
              >
                <Close fontSize="small" />
              </Button>
            )}
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
});
export function AssignmentPlayer({
  assignment,
  initial,
  preview = false,
}: {
  assignment: Assignment;
  initial: Submission | null;
  preview?: boolean;
}) {
  const [answers, setAnswers] = useState<Answer[]>(() =>
      assignment.questions.map(
        (q) =>
          initial?.answers.find((a) => a.questionId === q.id) ?? emptyAnswer(q),
      ),
    ),
    [saved, setSaved] = useState(() =>
      JSON.stringify(
        assignment.questions.map(
          (q) =>
            initial?.answers.find((a) => a.questionId === q.id) ??
            emptyAnswer(q),
        ),
      ),
    ),
    [submission, setSubmission] = useState(initial),
    [active, setActive] = useState(0),
    [drawer, setDrawer] = useState(false),
    [busy, setBusy] = useState<string[]>([]),
    [error, setError] = useState<unknown>(),
    [message, setMessage] = useState("");
  const [save, saveState] = useSaveAssignmentDraftMutation(),
    [submit, submitState] = useSubmitAssignmentMutation(),
    version = useRef(initial?.version ?? 0),
    pending = useRef<Promise<Submission> | null>(null),
    mounted = useRef(true),
    submitKey = useRef(""),
    lastSaved = useRef(saved),
    submitting = useRef(false);
  useEffect(() => {
    if (initial?.submittedAt) setSubmission(initial);
  }, [initial]);
  const serial = JSON.stringify(answers),
    dirty = serial !== saved,
    readOnly = !!submission?.submittedAt;
  useUnsaved(!preview && !readOnly && (dirty || busy.length > 0));
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const change = useCallback(
    (id: string, patch: Partial<Answer>) =>
      setAnswers((rows) =>
        rows.map((a) => (a.questionId === id ? { ...a, ...patch } : a)),
      ),
    [],
  );
  const changeBusy = useCallback(
    (id: string, v: boolean) =>
      setBusy((rows) =>
        v
          ? rows.includes(id)
            ? rows
            : [...rows, id]
          : rows.filter((x) => x !== id),
      ),
    [],
  );
  const persist = useCallback(
    async (rows: Answer[], snapshot: string) => {
      if (pending.current) await pending.current;
      if (lastSaved.current === snapshot) return initial;
      const task = save({
        id: assignment.id,
        assignmentVersionId: assignment.assignmentVersionId,
        answers: rows,
        version: version.current,
      }).unwrap();
      pending.current = task;
      try {
        const result = await task;
        version.current = result.version;
        lastSaved.current = snapshot;
        if (mounted.current) {
          setSaved(snapshot);
          setError(undefined);
        }
        return result;
      } finally {
        if (pending.current === task) pending.current = null;
      }
    },
    [assignment.id, assignment.assignmentVersionId, save, initial],
  );
  useEffect(() => {
    if (
      preview ||
      readOnly ||
      !dirty ||
      busy.length ||
      submitState.isLoading ||
      submitting.current
    )
      return;
    const timer = setTimeout(() => {
      if (submitting.current) return;
      void persist(answers, serial).catch((e) => {
        if (mounted.current) setError(e);
      });
    }, 900);
    return () => clearTimeout(timer);
  }, [
    answers,
    serial,
    dirty,
    busy.length,
    persist,
    preview,
    readOnly,
    submitState.isLoading,
  ]);
  const complete = assignment.questions.filter((q) =>
    answered(
      q,
      answers.find((a) => a.questionId === q.id)!,
    ),
  ).length;
  const navigate = (index: number) => {
    setActive(index);
    setDrawer(false);
    document
      .getElementById(`question-${assignment.questions[index].id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const nav = (
    <Stack spacing={1}>
      <Typography sx={{ fontWeight: 700 }}>Câu hỏi</Typography>
      <Typography variant="body2" color="text.secondary">
        Đã trả lời {complete}/{assignment.questions.length} câu
      </Typography>
      <LinearProgress
        variant="determinate"
        value={
          assignment.questions.length
            ? (complete / assignment.questions.length) * 100
            : 0
        }
      />
      {assignment.questions.map((q, i) => {
        const done = answered(q, answers[i]);
        return (
          <Button
            key={q.id}
            size="small"
            variant={active === i ? "contained" : "outlined"}
            color={active === i ? "info" : done ? "success" : "inherit"}
            onClick={() => navigate(i)}
            sx={{ justifyContent: "space-between", textAlign: "left" }}
            aria-current={active === i ? "step" : undefined}
          >
            Câu {i + 1}
            <Typography component="span" variant="caption">
              {active === i ? "Đang xem" : done ? "Đã trả lời" : "Chưa trả lời"}
            </Typography>
          </Button>
        );
      })}
    </Stack>
  );
  return (
    <Stack spacing={2} sx={{ maxWidth: 1160, mx: "auto" }}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {assignment.title}
        </Typography>
        <RichContent value={assignment.instructions} />
        <Typography variant="body2" color="text.secondary">
          Unit {assignment.unitNumber ?? "Chưa gắn"} · {assignment.totalMax}{" "}
          điểm ·{" "}
          {assignment.deadline
            ? `Hạn nộp: ${new Date(assignment.deadline).toLocaleString("vi-VN")}`
            : "Không giới hạn hạn nộp"}{" "}
          · Phiên bản {assignment.schemaVersion}
        </Typography>
      </Stack>
      {preview ? (
        <Alert severity="info">
          Xem trước giao diện học sinh. Đáp án đúng và tiêu chí chấm không hiển
          thị ở đây.
        </Alert>
      ) : readOnly ? (
        <Alert severity="success">
          Đã nộp lúc {new Date(submission.submittedAt!).toLocaleString("vi-VN")}
          . {submission.isLate ? "Nộp muộn. " : ""}
          {submission.publishedAt
            ? `Kết quả: ${numberLabel(submission.totalScore)}/${submission.totalMax} (${numberLabel(submission.percentage)}%)`
            : "Kết quả đang chờ công bố."}{" "}
          <Link
            href={`/post/?postId=${assignment.postId}&classId=${assignment.classId}`}
          >
            Về bài đăng
          </Link>
        </Alert>
      ) : (
        <Alert severity={error ? "error" : "info"}>
          {saveState.isLoading
            ? "Đang lưu bản nháp…"
            : dirty
              ? "Thay đổi sẽ tự lưu sau khi em ngừng nhập."
              : initial || saveState.isSuccess ? "Đã lưu bản nháp. Em có thể quay lại tiếp tục làm bài." : "Bản nháp sẽ tự lưu khi em bắt đầu trả lời."}
        </Alert>
      )}
      {error != null && <Alert severity="error">{errorMessage(error)}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      <Button
        sx={{ display: { md: "none" } }}
        variant="outlined"
        onClick={() => setDrawer(true)}
      >
        Tiến độ · {complete}/{assignment.questions.length}
      </Button>
      <Drawer anchor="left" open={drawer} onClose={() => setDrawer(false)}>
        <Box sx={{ width: 260, p: 2 }}>{nav}</Box>
      </Drawer>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "220px minmax(0,1fr)" },
          gap: 2.5,
          alignItems: "start",
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: "16px",
            position: "sticky",
            top: 20,
            display: { xs: "none", md: "block" },
            maxHeight: "calc(100dvh - 40px)",
            overflowY: "auto",
          }}
        >
          {nav}
        </Paper>
        <Stack spacing={2.5}>
          {assignment.questions.map((q, i) => (
            <Box
              key={q.id}
              onFocus={() => setActive(i)}
              onPointerDown={() => setActive(i)}
            >
              <QuestionCard
                preview={preview}
                q={q}
                a={answers[i]}
                index={i}
                assignmentId={assignment.id}
                readOnly={readOnly}
                onChange={change}
                onBusy={changeBusy}
              />
              {submission?.publishedAt && (
                <Paper sx={{ p: 2, bgcolor: "action.selected", mt: 1 }}>
                  {(() => {
                    const g = submission.grades.find(
                      (g) => g.questionId === q.id,
                    );
                    return (
                      <>
                        <Typography sx={{ fontWeight: 700 }}>
                          {numberLabel(g?.score)} / {q.maxScore} điểm
                        </Typography>
                        {g?.comment && <Typography>{g.comment}</Typography>}
                        {g?.advice && (
                          <Typography color="text.secondary">
                            {g.advice}
                          </Typography>
                        )}
                      </>
                    );
                  })()}
                </Paper>
              )}
            </Box>
          ))}
          {!preview && !readOnly && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: "flex-end", pb: 3 }}
            >
              <Button
                disabled={
                  !!busy.length || saveState.isLoading || submitState.isLoading
                }
                onClick={() =>
                  void persist(answers, serial)
                    .then(() => setMessage("Đã lưu bản nháp."))
                    .catch(setError)
                }
              >
                Lưu bản nháp
              </Button>
              <Button
                variant="contained"
                disabled={
                  complete !== assignment.questions.length ||
                  !!busy.length ||
                  submitState.isLoading
                }
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Nộp bài? Sau khi nộp em không thể sửa câu trả lời.",
                    )
                  )
                    return;
                  setError(undefined);
                  submitting.current = true;
                  try {
                    if (pending.current) await pending.current;
                    if (!submitKey.current)
                      submitKey.current = crypto.randomUUID();
                    const result = await submit({
                      id: assignment.id,
                      assignmentVersionId: assignment.assignmentVersionId,
                      answers,
                      version: version.current,
                      key: submitKey.current,
                    }).unwrap();
                    version.current = result.version;
                    setSaved(serial);
                    setSubmission(result);
                    lastSaved.current = serial;
                  } catch (e) {
                    setError(e);
                  } finally {
                    submitting.current = false;
                  }
                }}
              >
                {submitState.isLoading ? "Đang nộp…" : "Nộp bài"}
              </Button>
            </Stack>
          )}
          {submission?.publishedAt && (
            <Paper sx={{ p: 2, bgcolor: "action.selected" }}>
              <Typography sx={{ fontWeight: 700 }}>
                Nhận xét tổng thể
              </Typography>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>
                {submission.overallComment || "Chưa có nhận xét tổng thể."}
              </Typography>
              <Typography sx={{ whiteSpace: "pre-wrap", mt: 1 }}>
                {submission.overallAdvice}
              </Typography>
            </Paper>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
