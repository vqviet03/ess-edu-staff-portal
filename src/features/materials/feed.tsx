"use client";
import { Comments } from "./comments";
import { PostSurface, postTypeLabels } from "./post-surface";
import { useWorkspace } from "@/features/access/hooks";
import Autocomplete from "@mui/material/Autocomplete";
import { useState } from "react";
import Box from "@mui/material/Box";
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
import Paper from "@mui/material/Paper";
import {
  usePostsQuery,
  useClassThreadsQuery,
  useThreadSessionsQuery,
  useSavePostMutation,
  useRemovePostMutation,
  useReactionMutation,
} from "@/api/library-api";
import { useAppSelector } from "@/store";
import { Feedback, NavButton } from "@/shared/ui";
import { useUnsaved } from "@/shared/unsaved";
import { errorMessage } from "@/api/base-query";
import type { Attachment, MaterialFile, Post, PostInput } from "./models";

import { MaterialBrowser } from "./browser";
import { MaterialViewer } from "./viewer";
import { UploadDialog } from "./upload";
function PostCard({
  post,
  sessionId,
  cursor,
  editable,
  edit,
}: {
  post: Post;
  sessionId?: string;
  cursor?: string;
  editable: boolean;
  edit: (post: Post) => void;
}) {
  const me = useAppSelector((s) => s.auth.session?.teacher),
    [showComments, setShowComments] = useState(false),
    [preview, setPreview] = useState<MaterialFile | null>(null),
    [reaction, state] = useReactionMutation(),
    [remove] = useRemovePostMutation(),
    [error, setError] = useState<unknown>();
  const canEdit =
    editable && post.authorId === me?.id && post.canEdit !== false;
  const canDelete =
    post.canDelete ?? (!!me?.roles?.includes("MANAGER") || canEdit);
  return (
    <>
      <PostSurface
        post={post}
        commentOpen={showComments}
        openComments={() => setShowComments((s) => !s)}
        preview={setPreview}
        reacting={state.isLoading}
        onReaction={async (value) => {
          setError(undefined);
          try {
            await reaction({
              id: post.id,
              sessionId,
              classId: post.classId,
              cursor,
              reaction: post.myReaction === value ? null : value,
            }).unwrap();
          } catch (e) {
            setError(e);
          }
        }}
        onEdit={canEdit ? () => edit(post) : undefined}
        onDelete={
          canDelete
            ? async () => {
                const reason = window.prompt("Lý do xóa bài đăng:");
                if (!reason?.trim()) return;
                setError(undefined);
                try {
                  await remove({
                    id: post.id,
                    version: post.version,
                    reason,
                  }).unwrap();
                } catch (e) {
                  setError(e);
                }
              }
            : undefined
        }
      >
        <Comments
          post={post}
          expanded={showComments}
          expand={() => setShowComments(true)}
        />
      </PostSurface>
      <Feedback error={error} />
      {preview && (
        <MaterialViewer file={preview} close={() => setPreview(null)} />
      )}
    </>
  );
}
function emptyDraft(sessionId?: string): PostInput {
  return {
    title: "",
    body: "",
    status: "PUBLISHED",
    attachments: [],
    version: 1,
    postType: sessionId ? "SESSION_MATERIAL" : "DISCUSSION",
    sessionId: sessionId ?? null,
  };
}
export function ClassThreadFeed({
  classId,
  editable,
}: {
  classId: string;
  editable: boolean;
}) {
  return <SessionFeed classId={classId} editable={editable} />;
}
export function SessionFeed({
  sessionId,
  classId,
  editable,
}: {
  sessionId?: string;
  classId?: string;
  editable: boolean;
}) {
  const { selected } = useWorkspace();
  const workspace = selected ?? undefined;
  const [cursor, setCursor] = useState<string>(),
    sessionList = usePostsQuery(
      { sessionId: sessionId ?? "", cursor, workspace },
      { skip: !sessionId },
    ),
    classList = useClassThreadsQuery(
      { classId: classId ?? "", cursor, workspace },
      { skip: !classId || !!sessionId },
    ),
    list = sessionId ? sessionList : classList,
    sessions = useThreadSessionsQuery(classId ?? "", {
      skip: !classId || !editable,
    }),
    [open, setOpen] = useState(false),
    [draft, setDraft] = useState<PostInput>(() => emptyDraft(sessionId)),
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
            Chia sẻ tài liệu, thông báo hoặc trao đổi với lớp…
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
                  postType: post.postType ?? "SESSION_MATERIAL",
                  sessionId: post.sessionId,
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
            <Feedback empty="Chưa có bài đăng trong lớp hoặc phiên học này." />
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
            <Typography variant="h6">
              {sessionId ? "Trong phiên này" : "Thread lớp học"}
            </Typography>
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
        <DialogTitle>{editingId ? "Sửa bài đăng" : "Đăng bài"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {!sessionId && (
              <>
                <TextField
                  select
                  label="Loại bài đăng"
                  value={draft.postType ?? "DISCUSSION"}
                  onChange={(e) => {
                    setDraft((d) => ({
                      ...d,
                      postType: e.target.value as PostInput["postType"],
                      sessionId: null,
                    }));
                    setDirty(true);
                  }}
                >
                  {Object.entries(postTypeLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
                {draft.postType === "SESSION_MATERIAL" && (
                  <>
                    <Autocomplete
                      options={sessions.currentData?.items ?? []}
                      value={
                        sessions.currentData?.items.find(
                          (s) => s.id === draft.sessionId,
                        ) ?? null
                      }
                      getOptionLabel={(s) => `${s.name} · ${s.date}`}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      loading={sessions.isLoading}
                      onChange={(_, v) => {
                        setDraft((d) => ({ ...d, sessionId: v?.id ?? null }));
                        setDirty(true);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Chọn phiên học"
                          required
                          placeholder="Tìm tên phiên hoặc ngày học"
                        />
                      )}
                    />
                    <Feedback
                      loading={sessions.isLoading}
                      error={sessions.error}
                      retry={() => void sessions.refetch()}
                    />
                  </>
                )}
              </>
            )}
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
                  {chosen[a.materialId]?.displayName ?? "Tài liệu"}
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
            disabled={
              !draft.title.trim() ||
              state.isLoading ||
              (draft.postType === "SESSION_MATERIAL" && !draft.sessionId)
            }
            onClick={async () => {
              setError(undefined);
              try {
                await save({
                  id: editingId,
                  sessionId,
                  classId,
                  body: draft,
                }).unwrap();
                setOpen(false);
                setDirty(false);
                setEditingId(undefined);
                setDraft(emptyDraft(sessionId));
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
          sessionId={
            draft.postType === "SESSION_MATERIAL"
              ? (draft.sessionId ?? sessionId)
              : undefined
          }
          added={(file) => add([file])}
          close={() => setUpload(false)}
        />
      )}
    </Stack>
  );
}
