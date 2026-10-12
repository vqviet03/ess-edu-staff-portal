"use client";
import { RichInput, type RichInputHandle } from "./rich-input";
import { useRef, useState } from "react";
import { useClassQuery } from "@/api/api";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Menu from "@mui/material/Menu";
import Radio from "@mui/material/Radio";
import { AssignmentSurface, AssignmentIcon } from "./surface";
import Alert from "@mui/material/Alert";
import Delete from "@mui/icons-material/Delete";
import ContentCopy from "@mui/icons-material/ContentCopy";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import Close from "@mui/icons-material/Close";
import {
  useSaveAssignmentMutation,
  usePublishAssignmentMutation,
} from "@/api/assignment-api";
import { useThreadSessionsQuery } from "@/api/library-api";
import { useUnsaved } from "@/shared/unsaved";
import { errorMessage } from "@/api/base-query";
import { MaterialBrowser } from "@/features/materials/browser";
import { AssignmentMedia, type MediaDimensions } from "./media";
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
  blockMedia,
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
    [message, setMessage] = useState(""),
    [attachmentMenu, setAttachmentMenu] = useState<{
      element: HTMLElement;
      option: number | null;
    } | null>(null),
    [deleteOption, setDeleteOption] = useState<number | null>(null),
    [questionMenu, setQuestionMenu] = useState<HTMLElement | null>(null),
    [details, setDetails] = useState(false),
    [deleteQuestion, setDeleteQuestion] = useState<number | null>(null);
  const [save, state] = useSaveAssignmentMutation(),
    [publish, publishing] = usePublishAssignmentMutation(),
    sessions = useThreadSessionsQuery(classId),
    room = useClassQuery(classId, { skip: !classId }),
    contentRef = useRef<RichInputHandle>(null);
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
  const duplicateQuestion = () => {
    if (!q || draft.questions.length >= 100) return;
    setDraft((d) => ({
      ...d,
      questions: [
        ...d.questions.slice(0, active + 1),
        {
          ...q,
          id: crypto.randomUUID(),
          options: q.options.map((o) => ({ ...o, id: crypto.randomUUID() })),
        },
        ...d.questions.slice(active + 1),
      ],
    }));
    setActive(active + 1);
  };
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
      minRows={multiline ? 1 : undefined}
      value={draft[key]}
      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
    />
  );
  return (
    <AssignmentSurface>
      <Stack spacing={2.5} sx={{ maxWidth: 964, mx: "auto" }}>
        <Typography component="h1" variant="h4">
          {step === 0 ? (
            "Tạo bài tập"
          ) : step === 2 ? (
            draft.title || "Xem trước"
          ) : (
            <>
              <Box
                component="span"
                sx={{ display: { xs: "none", md: "inline" } }}
              >
                {draft.title || "Soạn câu hỏi"}
              </Box>
              <Box
                component="span"
                sx={{ display: { xs: "inline", md: "none" } }}
              >
                Soạn câu hỏi
              </Box>
            </>
          )}
        </Typography>
        <Stack direction="row" spacing={{ xs: 0.75, md: 1 }}>
          {["Thiết lập", "Soạn câu hỏi", "Xem trước"].map((label, i) => (
            <Button
              key={label}
              fullWidth
              variant={step === i ? "contained" : "text"}
              aria-current={step === i ? "step" : undefined}
              onClick={() => setStep(i)}
              sx={{ justifyContent: "flex-start", textAlign: "left", px: 1.25 }}
            >
              {i + 1}{" "}
              <Box
                component="span"
                sx={{
                  ml: 0.5,
                  display: { xs: i === 1 ? "none" : "inline", md: "inline" },
                }}
              >
                {label}
              </Box>
              {i === 1 && (
                <Box
                  component="span"
                  sx={{ ml: 0.5, display: { xs: "inline", md: "none" } }}
                >
                  Câu hỏi
                </Box>
              )}
            </Button>
          ))}
        </Stack>
        {step === 1 && (
          <Typography variant="body2" color="text.secondary">
            {draft.questions.length} câu hỏi ·{" "}
            {draft.questions.reduce((sum, x) => sum + x.maxScore, 0)} điểm ·{" "}
            {draft.publishedAt ? "Bản nháp chỉnh sửa" : "Bản nháp"}
          </Typography>
        )}
        {error != null && <Alert severity="error">{errorMessage(error)}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {step === 0 && (
          <>
            <Paper
              className="assignment-bordered assignment-labels"
              sx={{ p: 2 }}
            >
              <Stack spacing={1.5}>
                <Typography variant="h6">Thông tin cơ bản</Typography>
                {field("title", "Tiêu đề")}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    select
                    label="Unit"
                    value={draft.unitNumber ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        unitNumber: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    slotProps={{
                      select: { displayEmpty: true },
                      inputLabel: { shrink: true },
                    }}
                  >
                    <MenuItem value="">Chưa gắn Unit</MenuItem>
                    {Array.from(
                      {
                        length: Math.max(
                          room.data?.totalUnits ?? 0,
                          draft.unitNumber ?? 0,
                        ),
                      },
                      (_, i) => i + 1,
                    ).map((n) => (
                      <MenuItem key={n} value={n}>
                        Unit {n}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
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
                </Box>
                {field("instructions", "Hướng dẫn", true)}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    select
                    label="Phiên học"
                    value={draft.sessionId ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        sessionId: e.target.value || null,
                      }))
                    }
                  >
                    <MenuItem value="">Không gắn phiên học</MenuItem>
                    {sessions.data?.items.map((x) => (
                      <MenuItem key={x.id} value={x.id}>
                        {x.name}
                      </MenuItem>
                    ))}
                  </TextField>
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
              </Stack>
            </Paper>
            <Paper className="assignment-bordered" sx={{ p: 2 }}>
              <Stack spacing={1.25}>
                <Typography variant="h6">
                  Học sinh nộp bài bằng cách nào?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Có thể kết hợp nhiều hình thức. Form giúp học sinh trả lời
                  từng câu hỏi.
                </Typography>
                <Stack
                  direction="row"
                  useFlexGap
                  sx={{ gap: 1, flexWrap: "wrap" }}
                >
                  {(
                    [
                      ["Tài liệu", "LINK_FILE"],
                      ["Văn bản", "TEXT"],
                      ["Liên kết", "LINK_FILE"],
                      ["✓ Form bài tập", "SINGLE"],
                    ] as const
                  ).map(([label, type]) => (
                    <Button
                      key={label}
                      variant={type === "SINGLE" ? "contained" : "text"}
                      onClick={() => {
                        if (type === "SINGLE") {
                          setStep(1);
                          return;
                        }
                        const found = draft.questions.findIndex(
                          (x) => x.type === type,
                        );
                        if (found >= 0) {
                          setActive(found);
                        } else {
                          setDraft((d) => ({
                            ...d,
                            questions: [
                              ...d.questions,
                              {
                                ...question(),
                                type,
                                options: [],
                                content:
                                  label === "Tài liệu"
                                    ? "Nộp tài liệu của em"
                                    : label === "Liên kết"
                                      ? "Nộp liên kết bài làm"
                                      : "Viết câu trả lời của em",
                              },
                            ],
                          }));
                          setActive(draft.questions.length);
                        }
                        setStep(1);
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </Stack>
              </Stack>
            </Paper>
            <Paper className="assignment-bordered" sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                Chia sẻ trong lớp
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Giảng viên phụ trách có thể chỉnh sửa. Học sinh chỉ xem bài được
                giao và bài nộp của mình.
              </Typography>
            </Paper>
          </>
        )}
        {step === 1 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "220px minmax(0,1fr)" },
              gap: 2,
              alignItems: "start",
            }}
          >
            <Paper
              className="assignment-bordered"
              sx={{
                p: 2,
                display: { xs: "none", md: "block" },
                position: "sticky",
                top: 20,
              }}
            >
              <Stack spacing={1}>
                <Typography sx={{ fontWeight: 700 }}>Câu hỏi</Typography>
                {draft.questions.map((x, i) => (
                  <Stack direction="row" key={x.id}>
                    <Button
                      sx={{
                        flex: 1,
                        justifyContent: "flex-start",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        bgcolor: active === i ? "var(--a-tint)" : "transparent",
                        py: 1,
                        px: 1.25,
                      }}
                      variant="text"
                      onClick={() => setActive(i)}
                    >
                      <Typography
                        component="span"
                        sx={{ fontSize: 14, fontWeight: 700 }}
                      >
                        Câu {i + 1} · {x.maxScore} điểm
                      </Typography>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        {questionLabels[x.type]}
                      </Typography>
                    </Button>
                  </Stack>
                ))}
                <Button
                  sx={{ alignSelf: "flex-start" }}
                  startIcon={<AssignmentIcon name="plus" />}
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
                className="assignment-bordered assignment-labels"
                sx={{ p: 2 }}
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
                    <Typography
                      variant="h6"
                      sx={{ display: { xs: "none", md: "block" } }}
                    >
                      Câu {active + 1}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ display: { xs: "flex", md: "none" } }}
                    >
                      <Button
                        startIcon={<AssignmentIcon name="chevron" />}
                        onClick={(e) => setQuestionMenu(e.currentTarget)}
                      >
                        Câu {active + 1} / {draft.questions.length}
                      </Button>
                      <IconButton
                        aria-label="Thêm câu hỏi"
                        disabled={draft.questions.length >= 100}
                        onClick={() => {
                          setDraft((d) => ({
                            ...d,
                            questions: [...d.questions, question()],
                          }));
                          setActive(draft.questions.length);
                        }}
                      >
                        <AssignmentIcon name="plus" />
                      </IconButton>
                    </Stack>
                    <Stack
                      direction="row"
                      sx={{ display: { xs: "none", md: "flex" } }}
                    >
                      {[
                        [ContentCopy, "Nhân bản", duplicateQuestion],
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
                            setDeleteQuestion(active);
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
                                sx={{
                                  display:
                                    i === 1 || i === 2 ? "none" : "inline-flex",
                                }}
                                onClick={fn as () => void}
                              >
                                {i === 0 ? (
                                  <AssignmentIcon name="copy" />
                                ) : i === 3 ? (
                                  <AssignmentIcon name="trash" />
                                ) : (
                                  <I fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        );
                      })}
                    </Stack>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{
                      alignItems: "start",
                      "& > :first-child": { flex: 1 },
                      "& > :last-child": { width: { xs: 110, sm: 180 } },
                    }}
                  >
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
                  <RichInput
                    label="Nội dung câu hỏi"
                    value={q.content}
                    onChange={(content) => setQuestion({ content })}
                    media={q.media}
                    inputRef={contentRef}
                  />
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <Tooltip title="Đính kèm tài liệu tại vị trí con trỏ">
                      <IconButton
                        aria-label="Chèn chip tệp tại con trỏ"
                        onClick={(e) => {
                          const el = contentRef.current;
                          inlineInsertion.current = {
                            start: el?.selectionStart ?? q.content.length,
                            end: el?.selectionEnd ?? q.content.length,
                          };
                          setAttachmentMenu({
                            element: e.currentTarget,
                            option: null,
                          });
                        }}
                      >
                        <AssignmentIcon name="attach" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Chèn liên kết">
                      <IconButton
                        aria-label="Chèn liên kết"
                        onClick={() => {
                          const url = window.prompt("Liên kết http/https:");
                          if (url && validLink(url)) insert(url);
                          else if (url)
                            setError(new Error("Liên kết không hợp lệ."));
                        }}
                      >
                        <AssignmentIcon name="link" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Hướng dẫn và tiêu chí chấm">
                      <IconButton
                        aria-label="Hướng dẫn và tiêu chí chấm"
                        onClick={() => setDetails(true)}
                      >
                        <AssignmentIcon name="help" />
                      </IconButton>
                    </Tooltip>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ display: { xs: "none", sm: "block" } }}
                    >
                      Đính kèm ảnh, audio, video hoặc tài liệu
                    </Typography>
                  </Stack>
                  <MediaEditor
                    media={blockMedia(q.content, q.media)}
                    onChange={(media) =>
                      setQuestion({
                        media: [
                          ...q.media.filter((m) =>
                            q.content.includes(`[file:${m.materialId}]`),
                          ),
                          ...media,
                        ],
                      })
                    }
                  />
                  {(q.type === "SINGLE" || q.type === "MULTIPLE") && (
                    <>
                      <Typography sx={{ fontWeight: 700 }}>
                        Lựa chọn trả lời
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {q.type === "SINGLE"
                          ? "Chọn một đáp án đúng để chấm tự động."
                          : "Chọn tất cả đáp án đúng để chấm tự động."}
                      </Typography>
                      {q.options.map((o, i) => (
                        <Paper
                          className="assignment-option"
                          key={o.id}
                          variant="outlined"
                          sx={{
                            p: 1,
                            borderRadius: "12px",
                            bgcolor: o.isCorrect
                              ? "var(--a-tint)"
                              : "transparent",
                            border: 0,
                          }}
                        >
                          <Stack spacing={1}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: "center" }}
                            >
                              {q.type === "SINGLE" ? (
                                <Radio
                                  checked={!!o.isCorrect}
                                  slotProps={{
                                    input: {
                                      "aria-label": `Đáp án đúng ${i + 1}`,
                                    },
                                  }}
                                  onChange={() =>
                                    setQuestion({
                                      options: q.options.map((x, j) => ({
                                        ...x,
                                        isCorrect: j === i,
                                      })),
                                    })
                                  }
                                />
                              ) : (
                                <Checkbox
                                  checked={!!o.isCorrect}
                                  slotProps={{
                                    input: {
                                      "aria-label": `Đáp án đúng ${i + 1}`,
                                    },
                                  }}
                                  onChange={(_, v) =>
                                    setQuestion({
                                      options: q.options.map((x, j) =>
                                        j === i ? { ...x, isCorrect: v } : x,
                                      ),
                                    })
                                  }
                                />
                              )}
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                {" "}
                                <TextField
                                  className="assignment-option-content"
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
                                {o.isCorrect && (
                                  <Typography
                                    variant="body2"
                                    sx={{ color: "var(--a-green)" }}
                                  >
                                    Đáp án đúng
                                  </Typography>
                                )}
                              </Box>
                              <Tooltip title="Tài liệu và thao tác lựa chọn">
                                <IconButton
                                  aria-label={`Tài liệu đáp án ${i + 1}`}
                                  onClick={(e) => {
                                    inlineInsertion.current = null;
                                    setAttachmentMenu({
                                      element: e.currentTarget,
                                      option: i,
                                    });
                                  }}
                                >
                                  <AssignmentIcon name="attach" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={`Xóa đáp án ${i + 1}`}>
                                <IconButton
                                  aria-label={`Xóa đáp án ${i + 1}`}
                                  color="error"
                                  onClick={() => setDeleteOption(i)}
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
                          </Stack>
                        </Paper>
                      ))}
                      <Button
                        sx={{ alignSelf: "flex-start" }}
                        startIcon={<AssignmentIcon name="plus" />}
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
                        Thêm lựa chọn
                      </Button>
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: "var(--a-tint)",
                          borderRadius: "12px",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ color: "var(--a-green)" }}
                        >
                          {q.options.some((o) => o.isCorrect)
                            ? "Tự động chấm · Đã thiết lập đáp án"
                            : "Tự động chấm · Chọn đáp án đúng"}
                        </Typography>
                      </Box>
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
                        slotProps={{
                          htmlInput: { min: 1, max: 3600, step: 1 },
                        }}
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
          sx={{ justifyContent: "flex-start", pb: 1, flexWrap: "wrap" }}
        >
          {step === 1 && (
            <Button
              startIcon={<AssignmentIcon name="back" />}
              onClick={() => setStep(0)}
              sx={{ display: { xs: "none", md: "inline-flex" } }}
            >
              Quay lại
            </Button>
          )}
          <Button
            disabled={state.isLoading || publishing.isLoading || busy}
            onClick={() => void persist().catch(() => {})}
          >
            {state.isLoading ? "Đang lưu…" : "Lưu nháp"}
          </Button>
          {step < 2 && (
            <Button variant="contained" onClick={() => setStep(step + 1)}>
              {step === 0 ? "Tiếp tục soạn câu hỏi" : "Xem trước"}
            </Button>
          )}
          {step === 2 && (
            <Button onClick={() => setStep(1)}>Tiếp tục chỉnh sửa</Button>
          )}
          {step === 2 && (
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
          )}
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
            <IconButton
              sx={{ float: "right" }}
              onClick={() => {
                inlineInsertion.current = null;
                setPicker(false);
              }}
            >
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
        <Menu
          anchorEl={attachmentMenu?.element}
          open={!!attachmentMenu}
          onClose={() => setAttachmentMenu(null)}
        >
          <MenuItem
            onClick={() => {
              setPicker(attachmentMenu?.option ?? null);
              setAttachmentMenu(null);
            }}
          >
            Lấy từ kho
          </MenuItem>
          <MenuItem
            disabled={!draft.id || !savedQuestionIds.has(q?.id)}
            onClick={() => {
              inlineInsertion.current = null;
              setUploadTarget(attachmentMenu?.option ?? null);
              setAttachmentMenu(null);
            }}
          >
            Upload trực tiếp
          </MenuItem>
          {attachmentMenu?.option != null && (
            <MenuItem
              onClick={() => {
                setDeleteOption(attachmentMenu.option);
                setAttachmentMenu(null);
              }}
            >
              Xóa lựa chọn
            </MenuItem>
          )}
          {(!draft.id || !savedQuestionIds.has(q?.id)) && (
            <Typography variant="body2" sx={{ px: 2, py: 1, maxWidth: 240 }}>
              Lưu nháp câu hỏi trước khi upload.
            </Typography>
          )}
        </Menu>
        <Dialog
          open={deleteOption !== null}
          onClose={() => setDeleteOption(null)}
        >
          <DialogTitle>Xóa lựa chọn này?</DialogTitle>
          <DialogActions>
            <Button onClick={() => setDeleteOption(null)}>Hủy</Button>
            <Button
              color="error"
              onClick={() => {
                setQuestion({
                  options: q.options.filter((_, i) => i !== deleteOption),
                });
                setDeleteOption(null);
              }}
            >
              Xóa lựa chọn
            </Button>
          </DialogActions>
        </Dialog>
        <Menu
          anchorEl={questionMenu}
          open={!!questionMenu}
          onClose={() => setQuestionMenu(null)}
        >
          {draft.questions.map((x, i) => (
            <MenuItem
              key={x.id}
              selected={active === i}
              onClick={() => {
                setActive(i);
                setQuestionMenu(null);
              }}
            >
              Câu {i + 1} · {x.maxScore} điểm · {questionLabels[x.type]}
            </MenuItem>
          ))}
          <MenuItem
            disabled={active === 0}
            onClick={() => {
              reorder(active, active - 1);
              setQuestionMenu(null);
            }}
          >
            Di chuyển câu lên
          </MenuItem>
          <MenuItem
            disabled={active === draft.questions.length - 1}
            onClick={() => {
              reorder(active, active + 1);
              setQuestionMenu(null);
            }}
          >
            Di chuyển câu xuống
          </MenuItem>
          <MenuItem
            disabled={draft.questions.length >= 100}
            onClick={() => {
              duplicateQuestion();
              setQuestionMenu(null);
            }}
          >
            Nhân bản câu hỏi
          </MenuItem>
          <MenuItem
            disabled={draft.questions.length <= 1}
            onClick={() => {
              setDeleteQuestion(active);
              setQuestionMenu(null);
            }}
          >
            Xóa câu hỏi
          </MenuItem>
        </Menu>
        <Dialog
          open={details}
          onClose={() => setDetails(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Hướng dẫn & tiêu chí chấm</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Hướng dẫn thêm"
                multiline
                value={q?.instructions ?? ""}
                onChange={(e) => setQuestion({ instructions: e.target.value })}
              />
              <TextField
                label="Tiêu chí chấm (chỉ giảng viên)"
                multiline
                minRows={3}
                value={q?.rubric ?? ""}
                onChange={(e) => setQuestion({ rubric: e.target.value })}
              />
              {draft.publishedAt && (
                <Alert severity="info">
                  Lưu thay đổi tạo phiên bản mới. Bài nộp trước đó giữ nguyên
                  nội dung và kết quả.
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetails(false)}>Xong</Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={deleteQuestion !== null}
          onClose={() => setDeleteQuestion(null)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>Xóa câu hỏi?</DialogTitle>
          <DialogContent>
            Câu {deleteQuestion === null ? "" : deleteQuestion + 1} sẽ bị xóa
            khỏi bản nháp. Các bài nộp trước đó không bị thay đổi.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteQuestion(null)}>Hủy</Button>
            <Button
              color="error"
              onClick={() => {
                const index = deleteQuestion;
                if (index === null) return;
                setDraft((d) => ({
                  ...d,
                  questions: d.questions.filter((_, i) => i !== index),
                }));
                setActive(Math.max(0, index - 1));
                setDeleteQuestion(null);
              }}
            >
              Xóa câu hỏi
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </AssignmentSurface>
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
  if (!media.length) return null;
  return (
    <Stack spacing={1}>
      {media.map((item, i) => (
        <MediaEditorItem
          key={item.materialId}
          item={item}
          onChange={(value) =>
            onChange(media.map((m, j) => (j === i ? value : m)))
          }
          onRemove={() => onChange(media.filter((_, j) => j !== i))}
        />
      ))}
    </Stack>
  );
}
function MediaEditorItem({
  item,
  onChange,
  onRemove,
}: {
  item: Media;
  onChange: (item: Media) => void;
  onRemove: () => void;
}) {
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null);
  const visual =
    item.file &&
    (item.file.mimeType.startsWith("image/") ||
      item.file.mimeType.startsWith("video/"));
  return (
    <Box>
      <AssignmentMedia media={[item]} onDimensions={setDimensions} />
      <Box component="details" sx={{ mt: 1 }}>
        <Typography
          component="summary"
          variant="body2"
          sx={{ cursor: "pointer", color: "var(--a-green)" }}
        >
          Chỉnh hiển thị / gỡ tài liệu
        </Typography>
        {visual && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {dimensions
              ? `Kích thước mặc định (gốc): ${dimensions.width} × ${dimensions.height} px. Tự co vừa khung hiển thị.`
              : "Kích thước mặc định: tự động theo tệp gốc. Tải ảnh / phát video để xem số pixel."}
          </Typography>
        )}
        <Stack
          className="assignment-labels"
          direction="row"
          useFlexGap
          sx={{ mt: 1, flexWrap: "wrap", gap: 1, alignItems: "center" }}
        >
          {visual && (
            <>
              <TextField
                size="small"
                type="number"
                label="Chiều rộng"
                value={item.displayWidth ?? ""}
                placeholder={dimensions ? String(dimensions.width) : "Tự động"}
                onChange={(e) =>
                  onChange({
                    ...item,
                    displayWidth: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">px</InputAdornment>
                    ),
                  },
                  htmlInput: { min: 1, max: 4096, step: 1 },
                }}
                sx={{ width: 150, maxWidth: "100%" }}
              />
              <TextField
                size="small"
                type="number"
                label="Chiều cao"
                value={item.displayHeight ?? ""}
                placeholder={dimensions ? String(dimensions.height) : "Tự động"}
                onChange={(e) =>
                  onChange({
                    ...item,
                    displayHeight: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">px</InputAdornment>
                    ),
                  },
                  htmlInput: { min: 1, max: 4096, step: 1 },
                }}
                sx={{ width: 150, maxWidth: "100%" }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={item.keepAspectRatio}
                    onChange={(_, keepAspectRatio) =>
                      onChange({ ...item, keepAspectRatio })
                    }
                  />
                }
                label="Giữ tỷ lệ"
              />
              <Button
                size="small"
                onClick={() =>
                  onChange({
                    ...item,
                    displayWidth: null,
                    displayHeight: null,
                    keepAspectRatio: true,
                  })
                }
              >
                Kích thước gốc
              </Button>
            </>
          )}
          <Tooltip title="Bỏ media">
            <IconButton aria-label="Bỏ media" onClick={onRemove}>
              <Close fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );
}
