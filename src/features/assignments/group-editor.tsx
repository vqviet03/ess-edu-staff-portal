"use client";
import { useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import AttachFile from "@mui/icons-material/AttachFile";
import CreateNewFolder from "@mui/icons-material/CreateNewFolder";
import DeleteOutline from "@mui/icons-material/DeleteOutlined";
import DragIndicator from "@mui/icons-material/DragIndicator";
import { RichInput, type RichInputHandle } from "./rich-input";
import { MediaEditor } from "./media-editor";
import { AssignmentUpload } from "./upload";
import { MaterialBrowser } from "@/features/materials/browser";
import { errorMessage } from "@/api/base-query";
import { blockMedia, questionLabels } from "./models";
import type { Assignment, Media, QuestionGroup } from "./models";
import { assignmentBlocks } from "./groups";
export function GroupEditor({
  group,
  position,
  count,
  change,
  move,
  add,
  remove,
  prepare,
  onBusy,
}: {
  group: QuestionGroup;
  position: number;
  count: number;
  change: (patch: Partial<QuestionGroup>) => void;
  move: (position: number) => void;
  add: () => void;
  remove: () => void;
  prepare: () => Promise<{ assignmentId: string; groupId: string }>;
  onBusy: (busy: boolean) => void;
}) {
  const ref = useRef<RichInputHandle>(null);
  const [picker, setPicker] = useState<false | "block" | "inline">(false);
  const selection = useRef({ start: 0, end: 0 });
  const [upload, setUpload] = useState<{
    assignmentId: string;
    groupId: string;
  } | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [preparing, setPreparing] = useState(false);
  function append(items: Media[], inline = false) {
    const media = [
      ...group.media,
      ...items.filter(
        (m) => !group.media.some((x) => x.materialId === m.materialId),
      ),
    ];
    if (!inline) {
      change({ media });
      return;
    }
    const token = items.map((m) => `[file:${m.materialId}]`).join(" ");
    change({
      media,
      content:
        group.content.slice(0, selection.current.start) +
        token +
        group.content.slice(selection.current.end),
    });
  }
  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        useFlexGap
        sx={{ gap: 1, flexWrap: "wrap", alignItems: "center" }}
      >
        <TextField
          size="small"
          label="Tên nhóm"
          value={group.title}
          onChange={(e) => change({ title: e.target.value })}
          sx={{ flex: 1, minWidth: 160 }}
        />
        <TextField
          key={`${group.id}-${position}`}
          size="small"
          type="number"
          label="Vị trí nhóm"
          defaultValue={position + 1}
          slotProps={{ htmlInput: { min: 1, max: count, step: 1 } }}
          onBlur={(e) => {
            const value = Number(e.target.value);
            if (!Number.isInteger(value) || value < 1 || value > count) {
              e.target.value = String(position + 1);
              return;
            }
            move(value - 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              e.currentTarget.querySelector("input")?.blur();
          }}
          sx={{ width: 112 }}
        />
        <Tooltip title="Xóa nhóm">
          <IconButton aria-label="Xóa nhóm" color="error" onClick={remove}>
            <DeleteOutline />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box
        data-testid="shared-stimulus-editor"
        sx={(theme) => ({
          p: { xs: 1.5, md: 2 },
          border: "1px solid",
          borderColor: alpha(theme.palette.info.main, 0.28),
          bgcolor: alpha(
            theme.palette.info.main,
            theme.palette.mode === "dark" ? 0.18 : 0.09,
          ),
          borderRadius: 2,
        })}
      >
        <Stack spacing={1.5}>
          <Typography sx={{ fontWeight: 700 }}>Dữ kiện chung</Typography>
          <RichInput
            inputRef={ref}
            label="Nội dung dữ kiện chung"
            value={group.content}
            media={group.media}
            onChange={(content) => change({ content })}
          />
          <TextField
            size="small"
            fullWidth
            multiline
            label="Hướng dẫn chung"
            value={group.instructions}
            onChange={(e) => change({ instructions: e.target.value })}
          />
          <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: "wrap" }}>
            <Button
              size="small"
              startIcon={<AttachFile />}
              onClick={() => setPicker("block")}
            >
              Lấy từ kho
            </Button>
            <Button
              size="small"
              onClick={() => {
                selection.current = {
                  start: ref.current?.selectionStart ?? group.content.length,
                  end: ref.current?.selectionEnd ?? group.content.length,
                };
                setPicker("inline");
              }}
            >
              Chèn tệp vào nội dung
            </Button>
            <Button
              size="small"
              disabled={preparing}
              onClick={async () => {
                setError(undefined);
                setPreparing(true);
                onBusy(true);
                try {
                  setUpload(await prepare());
                } catch (e) {
                  setError(e);
                } finally {
                  setPreparing(false);
                  onBusy(false);
                }
              }}
            >
              Upload trực tiếp
            </Button>
          </Stack>
          {error != null && (
            <Alert severity="error">{errorMessage(error)}</Alert>
          )}
          <MediaEditor
            media={blockMedia(group.content, group.media)}
            onChange={(media) =>
              change({
                media: [
                  ...group.media.filter((m) =>
                    group.content.includes(`[file:${m.materialId}]`),
                  ),
                  ...media,
                ],
              })
            }
          />
        </Stack>
      </Box>
      <Button
        size="small"
        startIcon={<CreateNewFolder />}
        sx={{ alignSelf: "flex-start" }}
        onClick={add}
      >
        Thêm câu hỏi vào nhóm
      </Button>
      <Dialog
        open={picker !== false}
        fullWidth
        maxWidth="lg"
        onClose={() => setPicker(false)}
      >
        <DialogTitle>Chọn dữ kiện từ kho</DialogTitle>
        <DialogContent>
          <MaterialBrowser
            picker
            onAdd={(files) => {
              append(
                files.map((file) => ({
                  file,
                  materialId: file.id,
                  displayWidth: null,
                  displayHeight: null,
                  keepAspectRatio: true,
                })),
                picker === "inline",
              );
              setPicker(false);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPicker(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={upload != null}
        fullWidth
        maxWidth="sm"
        onClose={() => {
          if (!uploadBusy) setUpload(null);
        }}
      >
        <DialogTitle>Upload dữ kiện chung</DialogTitle>
        <DialogContent>
          {upload && (
            <AssignmentUpload
              assignmentId={upload.assignmentId}
              questionId="00000000-0000-0000-0000-000000000000"
              groupId={upload.groupId}
              onBusy={(value) => {
                setUploadBusy(value);
                onBusy(value);
              }}
              onFile={(file) => {
                append([
                  {
                    file,
                    materialId: file.id,
                    displayWidth: null,
                    displayHeight: null,
                    keepAspectRatio: true,
                  },
                ]);
                setUpload(null);
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={uploadBusy} onClick={() => setUpload(null)}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
export function QuestionOutline({
  draft,
  active,
  activeGroup,
  select,
  selectGroup,
  drop,
  dropQuestion,
  children,
}: {
  draft: Assignment;
  active: number;
  activeGroup: string | null;
  select: (index: number) => void;
  selectGroup: (id: string) => void;
  drop: (id: string, target: number) => void;
  dropQuestion: (id: string, target: number) => void;
  children?: ReactNode;
}) {
  const dragging = useRef<string | null>(null);
  const blocks = assignmentBlocks(draft);
  return (
    <Stack spacing={1}>
      <Typography sx={{ fontWeight: 700 }}>Nội dung bài</Typography>
      {blocks.map((b, i) => (
        <Box
          key={b.id}
          onDragOver={(e) => {
            if (dragging.current) e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragging.current) drop(dragging.current, i);
            dragging.current = null;
          }}
        >
          <Stack direction="row" sx={{ alignItems: "center" }}>
            <Tooltip title="Kéo để đổi vị trí">
              <IconButton
                aria-label={`Kéo ${b.group?.title || `câu ${draft.questions.indexOf(b.questions[0]) + 1}`}`}
                draggable
                onDragStart={(e) => {
                  dragging.current = b.id;
                  e.dataTransfer.setData("text/plain", b.id);
                }}
                onDragEnd={() => {
                  dragging.current = null;
                }}
                sx={{
                  cursor: "grab",
                  display: { xs: "none", md: "inline-flex" },
                }}
              >
                <DragIndicator fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              sx={{
                justifyContent: "flex-start",
                textAlign: "left",
                minWidth: 0,
                overflow: "hidden",
                flexDirection: "column",
                alignItems: "flex-start",
                flex: 1,
                bgcolor: b.group
                  ? activeGroup === b.id
                    ? "var(--a-tint)"
                    : "transparent"
                  : active === draft.questions.indexOf(b.questions[0]) &&
                      !activeGroup
                    ? "var(--a-tint)"
                    : "transparent",
              }}
              onClick={() =>
                b.group
                  ? selectGroup(b.id)
                  : select(draft.questions.indexOf(b.questions[0]))
              }
            >
              {b.group ? (
                <Typography
                  component="span"
                  noWrap
                  sx={{ maxWidth: "100%" }}
                  title={b.group.title}
                >
                  {b.group.title || "Nhóm chưa đặt tên"}
                </Typography>
              ) : (
                <>
                  <Typography
                    component="span"
                    sx={{ fontSize: 14, fontWeight: 700 }}
                  >
                    Câu {draft.questions.indexOf(b.questions[0]) + 1} ·{" "}
                    {b.questions[0].maxScore} điểm
                  </Typography>
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                  >
                    {questionLabels[b.questions[0].type]}
                  </Typography>
                </>
              )}
            </Button>
          </Stack>
          {b.group &&
            b.questions.map((q) => (
              <Button
                key={q.id}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  dragging.current = q.id;
                  e.dataTransfer.setData("text/plain", q.id);
                }}
                onDragOver={(e) => {
                  const source = draft.questions.find(
                    (x) => x.id === dragging.current,
                  );
                  if (source?.groupId === q.groupId) e.preventDefault();
                }}
                onDrop={(e) => {
                  const source = draft.questions.find(
                    (x) => x.id === dragging.current,
                  );
                  if (source && source.groupId === q.groupId) {
                    e.preventDefault();
                    e.stopPropagation();
                    dropQuestion(
                      source.id,
                      b.questions.findIndex((x) => x.id === q.id),
                    );
                    dragging.current = null;
                  }
                }}
                onDragEnd={() => {
                  dragging.current = null;
                }}
                sx={{
                  display: "flex",
                  ml: 3,
                  textAlign: "left",
                  bgcolor:
                    draft.questions[active]?.id === q.id && activeGroup === b.id
                      ? "action.selected"
                      : "transparent",
                }}
                onClick={() => select(draft.questions.indexOf(q))}
              >
                Câu {draft.questions.indexOf(q) + 1} · {q.maxScore} điểm
              </Button>
            ))}
        </Box>
      ))}
      {children}
    </Stack>
  );
}
