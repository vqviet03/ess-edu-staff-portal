"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Alert from "@mui/material/Alert";
import Add from "@mui/icons-material/Add";
import Delete from "@mui/icons-material/Delete";
import ContentCopy from "@mui/icons-material/ContentCopy";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import LinkIcon from "@mui/icons-material/Link";
import AttachFile from "@mui/icons-material/AttachFile";
import Close from "@mui/icons-material/Close";
import {
  useSaveAssignmentMutation,
  usePublishAssignmentMutation,
} from "@/api/assignment-api";
import { useThreadSessionsQuery } from "@/api/library-api";
import { useUnsaved } from "@/shared/unsaved";
import { errorMessage } from "@/api/base-query";
import { MaterialBrowser } from "@/features/materials/browser";
import { AssignmentMedia, RichContent } from "./media";
import { AssignmentPlayer } from "./player";
import { AssignmentUpload } from "./upload";
import {
  questionLabels,
  schemaWrite,
  type Assignment,
  type AssignmentWrite,
  type Question,
  type Media,
  type QuestionType,
  validLink,
} from "./models";
function question(): Question {
  return {
    id: crypto.randomUUID(),
    type: "SINGLE",
    content: "",
    instructions: "",
    rubric: "",
    maxScore: 1,
    order: 0,
    allowUploadedAudio: true,
    maxDurationSeconds: 60,
    options: [
      {
        id: crypto.randomUUID(),
        content: "",
        isCorrect: false,
        order: 0,
        media: [],
      },
      {
        id: crypto.randomUUID(),
        content: "",
        isCorrect: false,
        order: 1,
        media: [],
      },
    ],
    media: [],
  };
}
export function AssignmentEditor({
  classId,
  initial,
  sessionId,
}: {
  classId: string;
  initial?: Assignment;
  sessionId?: string;
}) {
  const router = useRouter(),
    [draft, setDraft] = useState<Assignment>(
      () =>
        initial ?? {
          id: "",
          classId,
          postId: "",
          sessionId: sessionId ?? null,
          unitNumber: null,
          title: "",
          instructions: "",
          status: "DRAFT",
          deadline: null,
          allowLate: true,
          publishedAt: null,
          version: 0,
          assignmentVersionId: "",
          schemaVersion: 0,
          canEdit: true,
          totalMax: 1,
          questions: [question()],
        },
    ),
    [saved, setSaved] = useState(() =>
      initial ? JSON.stringify(schemaWrite(initial)) : "",
    ),
    [step, setStep] = useState(0),
    [active, setActive] = useState(0),
    [picker, setPicker] = useState<number | null | false>(false),
    inlineInsertion = useRef<{ start: number; end: number } | null>(null),
    [savedQuestionIds, setSavedQuestionIds] = useState(
      () => new Set(initial?.questions.map((q) => q.id) ?? []),
    ),
    [uploadTarget, setUploadTarget] = useState<number | null | false>(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [message, setMessage] = useState("");
  const [save, state] = useSaveAssignmentMutation(),
    [publish, publishing] = usePublishAssignmentMutation(),
    sessions = useThreadSessionsQuery(classId),
    contentRef = useRef<HTMLTextAreaElement>(null);
  const dirty = JSON.stringify(schemaWrite(draft)) !== saved;
  useUnsaved(dirty || busy);
  const q = draft.questions[active],
    setQuestion = (patch: Partial<Question>) =>
      setDraft((d) => ({
        ...d,
        questions: d.questions.map((x, i) =>
          i === active ? { ...x, ...patch } : x,
        ),
      }));
  async function persist() {
    setError(undefined);
    try {
      const body: AssignmentWrite = schemaWrite(draft);
      if (!body.title.trim()) throw new Error("Nhập tiêu đề bài tập.");
      const result = await save({
        classId,
        id: draft.id || undefined,
        body,
      }).unwrap();
      setDraft(result);
      setSavedQuestionIds(new Set(result.questions.map((q) => q.id)));
      setSaved(JSON.stringify(schemaWrite(result)));
      setMessage(
        "Đã lưu bản nháp. Bài đã công bố vẫn giữ phiên bản cũ cho tới khi đăng bản mới.",
      );
      return result;
    } catch (e) {
      setError(e);
      throw e;
    }
  }
  function insert(value: string) {
    const el = contentRef.current,
      start = el?.selectionStart ?? q.content.length,
      end = el?.selectionEnd ?? start;
    setQuestion({
      content: q.content.slice(0, start) + value + q.content.slice(end),
    });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + value.length, start + value.length);
    });
  }
  function addMedia(items: Media[], target: number | null) {
    if (target == null)
      setQuestion({
        media: [
          ...q.media,
          ...items.filter(
            (m) => !q.media.some((x) => x.materialId === m.materialId),
          ),
        ],
      });
    else
      setQuestion({
        options: q.options.map((o, i) =>
          i === target
            ? {
                ...o,
                media: [
                  ...o.media,
                  ...items.filter(
                    (m) => !o.media.some((x) => x.materialId === m.materialId),
                  ),
                ],
              }
            : o,
        ),
      });
  }
  const reorder = (from: number, to: number) => {
    setDraft((d) => {
      const list = [...d.questions];
      const moved = list.splice(from, 1)[0];
      list.splice(to, 0, moved);
      return { ...d, questions: list };
    });
    setActive(to);
  };
  const field = (
    key: "title" | "instructions",
    label: string,
    multiline = false,
  ) => (
    <TextField
      size="small"
      fullWidth
      label={label}
      multiline={multiline}
      minRows={multiline ? 3 : undefined}
      value={draft[key]}
      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
    />
  );
  return (
    <Stack spacing={2.5} sx={{ maxWidth: 1160, mx: "auto" }}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {initial ? "Chỉnh sửa bài tập" : "Tạo bài tập"}
      </Typography>
      <Typography color="text.secondary">
        Thiết lập → Soạn câu hỏi → Xem trước → Đăng
      </Typography>
      <Stack direction="row" spacing={1}>
        {["Thiết lập", "Soạn câu hỏi", "Xem trước"].map((label, i) => (
          <Button
            key={label}
            fullWidth
            variant={step === i ? "contained" : "outlined"}
            onClick={() => setStep(i)}
          >
            {i + 1}. {label}
          </Button>
        ))}
      </Stack>
      {error != null && <Alert severity="error">{errorMessage(error)}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      {draft.publishedAt && (
        <Alert severity="warning">
          Mỗi lần lưu tạo một phiên bản form mới. Bài nộp và bản nháp học sinh
          đã có tiếp tục dùng phiên bản cũ; đăng bản mới không sửa kết quả trước
          đó.
        </Alert>
      )}
      {step === 0 && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: "16px" }}>
          <Stack spacing={2.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Thông tin cơ bản
            </Typography>
            {field("title", "Tiêu đề bài tập")}
            {field("instructions", "Hướng dẫn làm bài", true)}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                size="small"
                select
                label="Phiên học"
                value={draft.sessionId ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, sessionId: e.target.value || null }))
                }
              >
                <MenuItem value="">Không gắn phiên học</MenuItem>
                {sessions.data?.items.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} · {s.date}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="Unit (không bắt buộc)"
                type="number"
                value={draft.unitNumber ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    unitNumber: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
              />
              <TextField
                size="small"
                label="Hạn nộp"
                type="datetime-local"
                value={draft.deadline ? localDate(draft.deadline) : ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    deadline: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={draft.allowLate}
                    onChange={(_, v) =>
                      setDraft((d) => ({ ...d, allowLate: v }))
                    }
                  />
                }
                label="Cho phép nộp muộn"
              />
            </Box>
            <Alert severity="info">
              Phạm vi hiện tại: thành viên được phép của lớp. Mỗi học sinh chỉ
              xem bài nộp của mình.
            </Alert>
            <Button variant="contained" onClick={() => setStep(1)}>
              Tiếp tục soạn câu hỏi
            </Button>
          </Stack>
        </Paper>
      )}
      {step === 1 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "240px minmax(0,1fr)" },
            gap: 2,
            alignItems: "start",
          }}
        >
          <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: "16px", position: { md: "sticky" }, top: 20 }}
          >
            <Stack spacing={1}>
              <Typography sx={{ fontWeight: 700 }}>
                Danh sách câu hỏi
              </Typography>
              {draft.questions.map((x, i) => (
                <Stack direction="row" key={x.id}>
                  <Button
                    sx={{ flex: 1, justifyContent: "flex-start" }}
                    variant={active === i ? "contained" : "text"}
                    onClick={() => setActive(i)}
                  >
                    Câu {i + 1} · {questionLabels[x.type]}
                  </Button>
                </Stack>
              ))}
              <Button
                startIcon={<Add />}
                disabled={draft.questions.length >= 100}
                onClick={() => {
                  setDraft((d) => ({
                    ...d,
                    questions: [...d.questions, question()],
                  }));
                  setActive(draft.questions.length);
                }}
              >
                Thêm câu hỏi
              </Button>
            </Stack>
          </Paper>
          {q && (
            <Paper
              variant="outlined"
              sx={{ p: { xs: 2, md: 3 }, borderRadius: "16px" }}
            >
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Câu {active + 1}
                  </Typography>
                  <Stack direction="row">
                    {[
                      [
                        ContentCopy,
                        "Nhân bản",
                        () => {
                          setDraft((d) => ({
                            ...d,
                            questions: [
                              ...d.questions.slice(0, active + 1),
                              {
                                ...q,
                                id: crypto.randomUUID(),
                                options: q.options.map((o) => ({
                                  ...o,
                                  id: crypto.randomUUID(),
                                })),
                              },
                              ...d.questions.slice(active + 1),
                            ],
                          }));
                          setActive(active + 1);
                        },
                      ],
                      [ArrowUpward, "Lên", () => reorder(active, active - 1)],
                      [
                        ArrowDownward,
                        "Xuống",
                        () => reorder(active, active + 1),
                      ],
                      [
                        Delete,
                        "Xóa câu",
                        () => {
                          if (!window.confirm("Xóa câu này khỏi bản nháp mới?"))
                            return;
                          setDraft((d) => ({
                            ...d,
                            questions: d.questions.filter(
                              (_, i) => i !== active,
                            ),
                          }));
                          setActive(Math.max(0, active - 1));
                        },
                      ],
                    ].map(([Icon, label, fn], i) => {
                      const I = Icon as typeof Delete;
                      return (
                        <Tooltip key={String(label)} title={String(label)}>
                          <span>
                            <IconButton
                              aria-label={String(label)}
                              disabled={
                                (i === 1 && active === 0) ||
                                (i === 2 &&
                                  active === draft.questions.length - 1) ||
                                (i === 0 && draft.questions.length >= 100)
                              }
                              onClick={fn as () => void}
                            >
                              <I fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      );
                    })}
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    size="small"
                    select
                    fullWidth
                    label="Loại câu hỏi"
                    value={q.type}
                    onChange={(e) => {
                      const type = e.target.value as QuestionType;
                      setQuestion({
                        type,
                        options:
                          type === "SINGLE" || type === "MULTIPLE"
                            ? q.options.length
                              ? q.options
                              : question().options
                            : [],
                      });
                    }}
                  >
                    {Object.entries(questionLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    label="Điểm tối đa"
                    type="number"
                    value={q.maxScore}
                    onChange={(e) =>
                      setQuestion({ maxScore: Number(e.target.value) })
                    }
                    slotProps={{ htmlInput: { min: 0.1, step: 0.1 } }}
                  />
                </Stack>
                <TextField
                  size="small"
                  label="Nội dung câu hỏi"
                  multiline
                  minRows={4}
                  value={q.content}
                  onChange={(e) => setQuestion({ content: e.target.value })}
                  inputRef={contentRef}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    startIcon={<LinkIcon />}
                    onClick={() => {
                      const url = window.prompt("Liên kết http/https:");
                      if (url && validLink(url)) insert(url);
                      else if (url)
                        setError(new Error("Liên kết không hợp lệ."));
                    }}
                  >
                    Chèn liên kết
                  </Button>
                  <Button
                    size="small"
                    startIcon={<AttachFile />}
                    onClick={() => {
                      const el = contentRef.current;
                      inlineInsertion.current = {
                        start: el?.selectionStart ?? q.content.length,
                        end: el?.selectionEnd ?? q.content.length,
                      };
                      setPicker(null);
                    }}
                  >
                    Chèn chip tệp tại con trỏ
                  </Button>
                </Stack>
                <RichContent value={q.content} media={q.media} />
                <TextField
                  size="small"
                  label="Hướng dẫn thêm"
                  multiline
                  value={q.instructions}
                  onChange={(e) =>
                    setQuestion({ instructions: e.target.value })
                  }
                />
                <TextField
                  size="small"
                  label="Tiêu chí chấm (chỉ giảng viên)"
                  multiline
                  minRows={2}
                  value={q.rubric ?? ""}
                  onChange={(e) => setQuestion({ rubric: e.target.value })}
                />
                <MediaEditor
                  media={q.media}
                  onChange={(media) => setQuestion({ media })}
                />
                <Stack direction="row" spacing={1}>
                  <Button onClick={() => {inlineInsertion.current=null;setPicker(null)}}>Lấy từ kho</Button>
                  <Button
                    disabled={!draft.id || !savedQuestionIds.has(q.id)}
                    onClick={() => setUploadTarget(null)}
                  >
                    Upload đề bài
                  </Button>
                </Stack>
                {(!draft.id || !savedQuestionIds.has(q.id)) && (
                  <Typography variant="caption" color="text.secondary">
                    Lưu bản nháp của câu hỏi trước khi upload vào bài tập.
                  </Typography>
                )}
                {(q.type === "SINGLE" || q.type === "MULTIPLE") && (
                  <>
                    <Typography sx={{ fontWeight: 700 }}>
                      Đáp án · chọn đáp án đúng
                    </Typography>
                    {q.options.map((o, i) => (
                      <Paper
                        key={o.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: "12px",
                          bgcolor: o.isCorrect ? "action.selected" : undefined,
                        }}
                      >
                        <Stack spacing={1}>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: "center" }}
                          >
                            <Checkbox
                              aria-label={`Đáp án ${i + 1} đúng`}
                              checked={!!o.isCorrect}
                              onChange={(_, checked) =>
                                setQuestion({
                                  options: q.options.map((x, j) => ({
                                    ...x,
                                    isCorrect:
                                      j === i
                                        ? checked
                                        : q.type === "SINGLE" && checked
                                          ? false
                                          : !!x.isCorrect,
                                  })),
                                })
                              }
                            />
                            <TextField
                              size="small"
                              fullWidth
                              label={`Đáp án ${i + 1}`}
                              value={o.content}
                              onChange={(e) =>
                                setQuestion({
                                  options: q.options.map((x, j) =>
                                    j === i
                                      ? { ...x, content: e.target.value }
                                      : x,
                                  ),
                                })
                              }
                            />
                            <Tooltip title="Xóa lựa chọn">
                              <IconButton
                                onClick={() => {
                                  if (window.confirm("Xóa lựa chọn này?"))
                                    setQuestion({
                                      options: q.options.filter(
                                        (_, j) => j !== i,
                                      ),
                                    });
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                          <MediaEditor
                            media={o.media}
                            onChange={(media) =>
                              setQuestion({
                                options: q.options.map((x, j) =>
                                  j === i ? { ...x, media } : x,
                                ),
                              })
                            }
                          />
                          <Stack direction="row">
                            <Button size="small" onClick={() => {inlineInsertion.current=null;setPicker(i)}}>
                              Media từ kho
                            </Button>
                            <Button
                              size="small"
                              disabled={
                                !draft.id || !savedQuestionIds.has(q.id)
                              }
                              onClick={() => setUploadTarget(i)}
                            >
                              Upload media
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                    <Button
                      startIcon={<Add />}
                      disabled={q.options.length >= 30}
                      onClick={() =>
                        setQuestion({
                          options: [
                            ...q.options,
                            {
                              id: crypto.randomUUID(),
                              content: "",
                              isCorrect: false,
                              order: q.options.length,
                              media: [],
                            },
                          ],
                        })
                      }
                    >
                      Thêm đáp án
                    </Button>
                  </>
                )}
                {q.type === "SPEAKING" && (
                  <>
                    <TextField
                      size="small"
                      select
                      label="Cách nộp bài nói"
                      value={q.allowUploadedAudio ? "upload" : "record"}
                      onChange={(e) =>
                        setQuestion({
                          allowUploadedAudio: e.target.value === "upload",
                        })
                      }
                    >
                      <MenuItem value="upload">
                        Ghi âm trực tiếp hoặc tải audio
                      </MenuItem>
                      <MenuItem value="record">Chỉ ghi âm trực tiếp</MenuItem>
                    </TextField>
                    <TextField
                      size="small"
                      type="number"
                      label="Thời lượng tối đa (giây)"
                      value={q.maxDurationSeconds}
                      onChange={(e) =>
                        setQuestion({
                          maxDurationSeconds: Number(e.target.value),
                        })
                      }
                      slotProps={{ htmlInput: { min: 1, max: 3600, step: 1 } }}
                    />
                    <Alert severity="info">
                      Backend xác minh thời lượng thực. Trình duyệt không thể
                      chứng minh tuyệt đối nguồn audio; chế độ ghi âm yêu cầu
                      phiên được backend cấp phép.
                    </Alert>
                  </>
                )}
              </Stack>
            </Paper>
          )}
        </Box>
      )}
      {step === 2 && (
        <AssignmentPlayer
          key={draft.assignmentVersionId || draft.id || "preview"}
          assignment={{
            ...draft,
            totalMax: draft.questions.reduce((sum, q) => sum + q.maxScore, 0),
          }}
          initial={null}
          preview
        />
      )}
      <Stack
        direction="row"
        spacing={1}
        sx={{ justifyContent: "flex-end", pb: 3 }}
      >
        <Button
          disabled={state.isLoading || publishing.isLoading || busy}
          onClick={() => void persist().catch(() => {})}
        >
          {state.isLoading ? "Đang lưu…" : "Lưu bản nháp"}
        </Button>
        <Button
          variant="contained"
          disabled={state.isLoading || publishing.isLoading || busy}
          onClick={async () => {
            try {
              const result = dirty || !draft.id ? await persist() : draft;
              const published = await publish({
                id: result.id,
                version: result.version,
              }).unwrap();
              setSaved(JSON.stringify(schemaWrite(published)));
              router.replace(
                `/assignment/?assignmentId=${published.id}&classId=${classId}`,
              );
            } catch (e) {
              setError(e);
            }
          }}
        >
          {publishing.isLoading ? "Đang đăng…" : "Đăng bài tập"}
        </Button>
      </Stack>
      <Dialog
        open={picker !== false}
        onClose={() => {
          inlineInsertion.current = null;
          setPicker(false);
        }}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          Chọn tài liệu
          <IconButton sx={{ float: "right" }} onClick={() => {inlineInsertion.current=null;setPicker(false)}}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <MaterialBrowser
            picker
            onAdd={(files) => {
              addMedia(
                files.map((file) => ({
                  materialId: file.id,
                  file,
                  displayWidth: null,
                  displayHeight: null,
                  keepAspectRatio: true,
                })),
                picker === false ? null : picker,
              );
              if (inlineInsertion.current) {
                const { start, end } = inlineInsertion.current;
                const content =
                  q.content.slice(0, start) +
                  files.map((file) => `[file:${file.id}]`).join(" ") +
                  q.content.slice(end);
                setDraft((d) => ({
                  ...d,
                  questions: d.questions.map((x, i) =>
                    i === active ? { ...x, content } : x,
                  ),
                }));
                inlineInsertion.current = null;
              }
              setPicker(false);
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={uploadTarget !== false}
        onClose={() => {
          if (!busy) setUploadTarget(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Upload media</DialogTitle>
        <DialogContent>
          {q && draft.id && (
            <AssignmentUpload
              key={`${q.id}-${uploadTarget}`}
              assignmentId={draft.id}
              questionId={q.id}
              onBusy={setBusy}
              onFile={(file) => {
                addMedia(
                  [
                    {
                      materialId: file.id,
                      file,
                      displayWidth: null,
                      displayHeight: null,
                      keepAspectRatio: true,
                    },
                  ],
                  uploadTarget === false ? null : uploadTarget,
                );
                setUploadTarget(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
function localDate(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function MediaEditor({
  media,
  onChange,
}: {
  media: Media[];
  onChange: (media: Media[]) => void;
}) {
  return (
    <Stack spacing={1}>
      {media.map((m, i) => (
        <Box key={m.materialId}>
          <AssignmentMedia media={[m]} />
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}
          >
            {m.file &&
              (m.file.mimeType.startsWith("image/") ||
                m.file.mimeType.startsWith("video/")) && (
                <>
                  <TextField
                    size="small"
                    type="number"
                    label="Rộng (px)"
                    value={m.displayWidth ?? ""}
                    onChange={(e) =>
                      onChange(
                        media.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                displayWidth: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              }
                            : x,
                        ),
                      )
                    }
                    sx={{ width: 130 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Cao (px)"
                    value={m.displayHeight ?? ""}
                    onChange={(e) =>
                      onChange(
                        media.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                displayHeight: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              }
                            : x,
                        ),
                      )
                    }
                    sx={{ width: 130 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={m.keepAspectRatio}
                        onChange={(_, v) =>
                          onChange(
                            media.map((x, j) =>
                              j === i ? { ...x, keepAspectRatio: v } : x,
                            ),
                          )
                        }
                      />
                    }
                    label="Giữ tỷ lệ"
                  />
                  <Button
                    size="small"
                    onClick={() =>
                      onChange(
                        media.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                displayWidth: null,
                                displayHeight: null,
                                keepAspectRatio: true,
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    Kích thước gốc
                  </Button>
                </>
              )}
            <Tooltip title="Bỏ media">
              <IconButton
                onClick={() => onChange(media.filter((_, j) => j !== i))}
              >
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
