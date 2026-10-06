"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import {
  usePostsQuery,
  useSavePostMutation,
  useRemovePostMutation,
  useReactionMutation,
  useCommentsQuery,
  useSaveCommentMutation,
  useRemoveCommentMutation,
} from "@/api/library-api";
import { useAppSelector } from "@/store";
import { Feedback, NavButton } from "@/shared/ui";
import { useUnsaved } from "@/shared/unsaved";
import { errorMessage } from "@/api/base-query";
import type {
  Attachment,
  MaterialFile,
  Post,
  PostInput,
  Reaction,
} from "./models";
import { bytes, fileKind } from "./utils";
import { MaterialBrowser } from "./browser";
import { MaterialViewer } from "./viewer";
import { UploadDialog } from "./upload";
const reactionLabels: Record<Reaction, string> = {
  LIKE: "👍 Thích",
  LOVE: "♥ Yêu thích",
  CELEBRATE: "🎉 Tuyệt vời",
};
function Comments({ post }: { post: Post }) {
  const me = useAppSelector((s) => s.auth.session?.teacher),
    [cursor, setCursor] = useState<string>(),
    query = useCommentsQuery({ postId: post.id, cursor }),
    [body, setBody] = useState(""),
    [parent, setParent] = useState<string>(),
    [editing, setEditing] = useState<{ id: string; version: number } | null>(
      null,
    ),
    [save, state] = useSaveCommentMutation(),
    [remove] = useRemoveCommentMutation(),
    [error, setError] = useState<unknown>();
  useUnsaved(!!body.trim());
  return (
    <Stack spacing={1.5}>
      <Feedback
        loading={query.isLoading}
        error={query.error || error}
        retry={() => {
          setError(undefined);
          void query.refetch();
        }}
      />
      {query.currentData?.items.map((c) => (
        <Paper
          key={c.id}
          variant="outlined"
          sx={{ p: 1.5, ml: c.parentId ? { xs: 1, md: 3 } : 0 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {c.authorName} · {new Date(c.createdAt).toLocaleString("vi-VN")}
          </Typography>
          {c.parentId && (
            <Typography variant="caption" color="text.secondary">
              Trả lời bình luận
            </Typography>
          )}
          <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {c.body}
          </Typography>
          <Stack direction="row">
            <Button
              disabled={c.version === 0}
              onClick={() => {
                setParent(c.id);
                setEditing(null);
              }}
            >
              Trả lời
            </Button>
            {c.authorId === me?.id && (
              <Button
                onClick={() => {
                  if (c.version === 0) return;
                  setEditing({ id: c.id, version: c.version });
                  setBody(c.body);
                  setParent(undefined);
                }}
              >
                Sửa
              </Button>
            )}
            {(c.authorId === me?.id || me?.roles?.includes("MANAGER")) && (
              <Button
                disabled={c.version === 0}
                onClick={async () => {
                  if (!window.confirm("Xóa mềm bình luận này?")) return;
                  try {
                    await remove({
                      id: c.id,
                      postId: post.id,
                      version: c.version,
                    }).unwrap();
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                Xóa
              </Button>
            )}
          </Stack>
        </Paper>
      ))}
      <Stack direction="row">
        {cursor && (
          <Button onClick={() => setCursor(undefined)}>Bình luận đầu</Button>
        )}
        {query.currentData?.nextCursor && (
          <Button
            onClick={() =>
              setCursor(query.currentData?.nextCursor ?? undefined)
            }
          >
            Bình luận tiếp theo
          </Button>
        )}
      </Stack>
      {(parent || editing) && (
        <Chip
          label={editing ? "Đang sửa bình luận" : "Đang trả lời"}
          onDelete={() => {
            setParent(undefined);
            setEditing(null);
          }}
        />
      )}
      <TextField
        multiline
        minRows={2}
        label="Viết bình luận"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        slotProps={{ htmlInput: { maxLength: 5000 } }}
      />
      <Button
        variant="contained"
        disabled={!body.trim() || state.isLoading}
        onClick={async () => {
          setError(undefined);
          try {
            await save({
              postId: post.id,
              id: editing?.id,
              version: editing?.version,
              body,
              parentId: parent,
            }).unwrap();
            setBody("");
            setParent(undefined);
            setEditing(null);
            setCursor(undefined);
          } catch (e) {
            setError(e);
          }
        }}
      >
        Gửi bình luận
      </Button>
    </Stack>
  );
}
function PostCard({
  post,
  sessionId,
  cursor,
  editable,
  edit,
}: {
  post: Post;
  sessionId: string;
  cursor?: string;
  editable: boolean;
  edit: (p: Post) => void;
}) {
  const [showComments, setShowComments] = useState(false),
    [preview, setPreview] = useState<MaterialFile | null>(null),
    [reaction, state] = useReactionMutation(),
    [remove] = useRemovePostMutation(),
    [error, setError] = useState<unknown>();
  return (
    <Paper
      sx={{
        p: { xs: 2, md: 3 },
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          useFlexGap
          sx={{ justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{post.authorName}</Typography>
            <Typography variant="caption" color="text.secondary">
              Người đăng: {post.publisherName} ·{" "}
              {new Date(post.createdAt).toLocaleString("vi-VN")}
            </Typography>
          </Box>
          {post.status === "DRAFT" && <Chip label="Nháp" />}
          {editable && (
            <Stack direction="row">
              <Button onClick={() => edit(post)}>Sửa bài</Button>
              <Button
                onClick={async () => {
                  const reason = window.prompt("Lý do ngừng bài đăng:");
                  if (!reason?.trim()) return;
                  try {
                    await remove({
                      id: post.id,
                      version: post.version,
                      reason,
                    }).unwrap();
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                Ngừng
              </Button>
            </Stack>
          )}
        </Stack>
        <Typography variant="h5">{post.title}</Typography>
        <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {post.body}
        </Typography>
        {(["LESSON", "GUIDE", "AUDIO"] as Attachment["group"][]).map(
          (group) => {
            const attachments = post.attachments.filter(
              (a) => a.group === group,
            );
            return attachments.length ? (
              <Stack key={group} spacing={1}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {group === "LESSON"
                    ? "Bài học"
                    : group === "GUIDE"
                      ? "Hướng dẫn"
                      : "Audio"}
                </Typography>
                {attachments.map((a) => (
                  <Button
                    key={a.materialId}
                    variant="outlined"
                    disabled={!a.available || !a.file}
                    onClick={() => setPreview(a.file)}
                    sx={{
                      justifyContent: "flex-start",
                      textTransform: "none",
                      gap: 2,
                      p: 1.5,
                    }}
                  >
                    {a.file?.thumbnailUrl && (
                      <Box
                        component="img"
                        src={a.file.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        sx={{ width: 64, height: 64, objectFit: "contain" }}
                      />
                    )}
                    <Box sx={{ minWidth: 0, textAlign: "left" }}>
                      <Typography
                        sx={{
                          ...{ overflowWrap: "anywhere" },
                          fontWeight: 600,
                        }}
                      >
                        {a.file?.displayName ?? "Tài liệu không còn khả dụng"}
                      </Typography>
                      <Typography variant="caption">
                        {a.file
                          ? `${fileKind(a.file.mimeType)} · ${bytes(a.file.sizeBytes)}`
                          : "Đã ngừng sử dụng"}
                      </Typography>
                    </Box>
                  </Button>
                ))}
              </Stack>
            ) : null;
          },
        )}
        <Typography variant="body2" color="text.secondary">
          {post.reactions
            .filter((r) => r.count > 0)
            .map((r) => `${reactionLabels[r.reaction]} ${r.count}`)
            .join(" · ") || "Chưa có tương tác"}{" "}
          · {post.reactions.reduce((n, r) => n + r.count, 0)} tương tác ·{" "}
          {post.commentCount} bình luận
        </Typography>
        <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
          {Object.entries(reactionLabels).map(([value, label]) => (
            <Button
              key={value}
              variant={post.myReaction === value ? "contained" : "outlined"}
              disabled={state.isLoading}
              onClick={async () => {
                setError(undefined);
                try {
                  await reaction({
                    id: post.id,
                    sessionId,
                    cursor,
                    reaction:
                      post.myReaction === value ? null : (value as Reaction),
                  }).unwrap();
                } catch (e) {
                  setError(e);
                }
              }}
            >
              {label}
            </Button>
          ))}
          <Button onClick={() => setShowComments((s) => !s)}>
            Bình luận ({post.commentCount})
          </Button>
        </Stack>
        <Feedback error={error} />
        {showComments && <Comments post={post} />}
      </Stack>
      {preview && (
        <MaterialViewer file={preview} close={() => setPreview(null)} />
      )}
    </Paper>
  );
}
export function SessionFeed({
  sessionId,
  editable,
}: {
  sessionId: string;
  editable: boolean;
}) {
  const [cursor, setCursor] = useState<string>(),
    list = usePostsQuery(
      { sessionId, cursor },
      { pollingInterval: 240000, refetchOnMountOrArgChange: 240 },
    ),
    [open, setOpen] = useState(false),
    [draft, setDraft] = useState<PostInput>({
      title: "",
      body: "",
      status: "PUBLISHED",
      attachments: [],
      version: 1,
    }),
    [editingId, setEditingId] = useState<string>(),
    [chosen, setChosen] = useState<Record<string, MaterialFile>>({}),
    [picker, setPicker] = useState(false),
    [upload, setUpload] = useState(false),
    [error, setError] = useState<unknown>(),
    [success, setSuccess] = useState(""),
    [save, state] = useSavePostMutation(),
    [dirty, setDirty] = useState(false);
  useUnsaved(dirty);
  // This component remains mounted across the two session tabs; drafts and scroll containers survive switching.
  const add = (files: MaterialFile[]) => {
    setChosen((old) => ({
      ...old,
      ...Object.fromEntries(files.map((f) => [f.id, f])),
    }));
    setDraft((old) => ({
      ...old,
      attachments: [
        ...old.attachments,
        ...files
          .filter((f) => !old.attachments.some((a) => a.materialId === f.id))
          .map((f) => ({
            materialId: f.id,
            group: f.mimeType.startsWith("audio/")
              ? ("AUDIO" as const)
              : ("LESSON" as const),
          })),
      ],
    }));
    setDirty(true);
  };
  return (
    <Stack spacing={2}>
      {success && (
        <Alert severity="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}
      {editable && (
        <Paper
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography color="text.secondary">
            Chia sẻ tài liệu cho buổi học này…
          </Typography>
          <Button variant="contained" onClick={() => setOpen(true)}>
            + Đăng bài
          </Button>
        </Paper>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0,1fr)",
            lg: "minmax(0,2fr) minmax(240px,1fr)",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Stack spacing={2}>
          <Feedback
            loading={list.isLoading || (list.isFetching && !list.currentData)}
            error={list.error}
            retry={() => void list.refetch()}
          />
          {list.currentData?.items.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              sessionId={sessionId}
              cursor={cursor}
              editable={editable}
              edit={(post) => {
                if (
                  dirty &&
                  !window.confirm("Bỏ bản nháp hiện tại để sửa bài này?")
                )
                  return;
                setEditingId(post.id);
                setDraft({
                  title: post.title,
                  body: post.body,
                  status: post.status,
                  version: post.version,
                  attachments: post.attachments
                    .filter((a) => a.available)
                    .map((a) => ({ materialId: a.materialId, group: a.group })),
                });
                setChosen(
                  Object.fromEntries(
                    post.attachments
                      .filter((a) => a.file && a.available)
                      .map((a) => [a.materialId, a.file!]),
                  ),
                );
                setDirty(false);
                setOpen(true);
              }}
            />
          ))}
          {list.currentData && !list.currentData.items.length && (
            <Feedback empty="Chưa có bài đăng tài liệu trong phiên học này." />
          )}
          <Stack direction="row">
            {cursor && (
              <Button onClick={() => setCursor(undefined)}>Bài mới nhất</Button>
            )}
            {list.currentData?.nextCursor && (
              <Button
                onClick={() =>
                  setCursor(list.currentData?.nextCursor ?? undefined)
                }
              >
                Bài tiếp theo
              </Button>
            )}
          </Stack>
        </Stack>
        <Paper sx={{ p: 2.5, position: { lg: "sticky" }, top: 24 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Trong phiên này</Typography>
            <Typography>
              {list.currentData?.items.length ?? 0} bài trên trang ·{" "}
              {list.currentData?.items.reduce(
                (n, p) => n + p.attachments.length,
                0,
              ) ?? 0}{" "}
              tài liệu
            </Typography>
            <NavButton href="/materials/">Xem kho tài liệu</NavButton>
            {editable && (
              <Button
                onClick={() => {
                  setOpen(true);
                  setPicker(true);
                }}
              >
                Thêm từ kho
              </Button>
            )}
          </Stack>
        </Paper>
      </Box>
      <Dialog
        open={open && editable}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {editingId ? "Sửa bài đăng" : "Đăng bài tài liệu"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Tiêu đề"
              value={draft.title}
              onChange={(e) => {
                setDraft((d) => ({ ...d, title: e.target.value }));
                setDirty(true);
              }}
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <TextField
              label="Nội dung / hướng dẫn"
              multiline
              minRows={4}
              value={draft.body}
              onChange={(e) => {
                setDraft((d) => ({ ...d, body: e.target.value }));
                setDirty(true);
              }}
              slotProps={{ htmlInput: { maxLength: 20000 } }}
            />
            <TextField
              select
              label="Công bố"
              value={draft.status}
              onChange={(e) => {
                setDraft((d) => ({
                  ...d,
                  status: e.target.value as Post["status"],
                }));
                setDirty(true);
              }}
            >
              <MenuItem value="PUBLISHED">Công bố cho học sinh</MenuItem>
              <MenuItem value="DRAFT">Nháp</MenuItem>
            </TextField>
            <Stack
              direction="row"
              useFlexGap
              spacing={1}
              sx={{ flexWrap: "wrap" }}
            >
              <Button onClick={() => setPicker(true)}>Thêm từ kho</Button>
              <Button onClick={() => setUpload(true)}>Upload trực tiếp</Button>
            </Stack>
            {draft.attachments.map((a) => (
              <Stack
                key={a.materialId}
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ alignItems: "center" }}
              >
                <Typography sx={{ flex: 1, overflowWrap: "anywhere" }}>
                  {chosen[a.materialId]?.displayName ?? a.materialId}
                </Typography>
                <TextField
                  select
                  label="Nhóm"
                  value={a.group}
                  sx={{ minWidth: 130 }}
                  onChange={(e) => {
                    setDraft((d) => ({
                      ...d,
                      attachments: d.attachments.map((x) =>
                        x.materialId === a.materialId
                          ? {
                              ...x,
                              group: e.target.value as Attachment["group"],
                            }
                          : x,
                      ),
                    }));
                    setDirty(true);
                  }}
                >
                  <MenuItem value="LESSON">Bài học</MenuItem>
                  <MenuItem value="GUIDE">Hướng dẫn</MenuItem>
                  <MenuItem value="AUDIO">Audio</MenuItem>
                </TextField>
                <Button
                  onClick={() => {
                    setDraft((d) => ({
                      ...d,
                      attachments: d.attachments.filter(
                        (x) => x.materialId !== a.materialId,
                      ),
                    }));
                    setDirty(true);
                  }}
                >
                  Bỏ file
                </Button>
              </Stack>
            ))}
            <Feedback error={error} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Đóng / giữ nháp</Button>
          <Button
            variant="contained"
            disabled={!draft.title.trim() || state.isLoading}
            onClick={async () => {
              setError(undefined);
              try {
                await save({ id: editingId, sessionId, body: draft }).unwrap();
                setOpen(false);
                setDirty(false);
                setEditingId(undefined);
                setDraft({
                  title: "",
                  body: "",
                  status: "PUBLISHED",
                  attachments: [],
                  version: 1,
                });
                setChosen({});
                setSuccess("Đã lưu bài đăng.");
              } catch (e) {
                setError(new Error(errorMessage(e)));
              }
            }}
          >
            Lưu bài
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={picker}
        onClose={() => setPicker(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>Chọn tài liệu</DialogTitle>
        <DialogContent>
          <MaterialBrowser
            picker
            onAdd={(files) => {
              add(files);
              setPicker(false);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPicker(false)}>Hủy</Button>
        </DialogActions>
      </Dialog>
      {upload && (
        <UploadDialog
          folderId={null}
          sessionId={sessionId}
          added={(file) => add([file])}
          close={() => setUpload(false)}
        />
      )}
    </Stack>
  );
}
