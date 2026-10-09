"use client";
import { Comments } from "./comments";
import { IconAction } from "@/shared/icon-action";
import FirstPage from "@mui/icons-material/FirstPage";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Add from "@mui/icons-material/Add";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import Close from "@mui/icons-material/Close";
import ButtonBase from "@mui/material/ButtonBase";
import InputBase from "@mui/material/InputBase";
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
import {
  usePostsQuery,
  useClassThreadsQuery,
  useThreadSessionsQuery,
  useSavePostMutation,
  useRemovePostMutation,
  useReactionMutation,
} from "@/api/library-api";
import { useAppSelector } from "@/store";
import { Feedback } from "@/shared/ui";
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
          collapse={() => setShowComments(false)}
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
  const me = useAppSelector((s) => s.auth.session?.teacher);
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
        <Box
          sx={{ width: "100%", maxWidth: 600, mx: "auto", alignSelf: "center" }}
        >
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => setOpen(true)}
          >
            Tạo bài đăng
          </Button>
        </Box>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr)",
          width: "100%",
          maxWidth: 680,
          alignSelf: "center",
          mx: "auto",
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
              <IconAction
                label="Bài mới nhất"
                icon={<FirstPage fontSize="small" />}
                onClick={() => setCursor(undefined)}
              />
            )}
            {list.currentData?.nextCursor && (
              <IconAction
                label="Bài tiếp theo"
                icon={<ArrowForward fontSize="small" />}
                onClick={() =>
                  setCursor(list.currentData?.nextCursor ?? undefined)
                }
              />
            )}
          </Stack>
        </Stack>
      </Box>
      <Dialog
        open={open && editable}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: "24px", maxWidth: 680 } } }}
      >
        <DialogTitle>{editingId ? "Sửa bài đăng" : "Tạo bài đăng"}</DialogTitle>
        <DialogContent sx={{ px: { xs: 1, sm: 3 } }}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                size="small"
                fullWidth
                select
                label="Loại bài đăng"
                value={draft.postType ?? "DISCUSSION"}
                disabled={!!sessionId}
                onChange={(e) => {
                  setDraft((d) => ({
                    ...d,
                    postType: e.target.value as PostInput["postType"],
                    sessionId: null,
                  }));
                  setDirty(true);
                }}
              >
                {Object.entries(postTypeLabels).map(([v, l]) => (
                  <MenuItem key={v} value={v}>
                    {l}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                fullWidth
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
            </Stack>
            {!sessionId && draft.postType === "SESSION_MATERIAL" && (
              <>
                <Autocomplete
                  size="small"
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
            <PostSurface
              draft
              post={{
                id: editingId ?? "draft",
                classId: classId ?? "",
                className: undefined,
                sessionId: draft.sessionId ?? null,
                postType: draft.postType,
                title: draft.title,
                body: draft.body,
                status: draft.status,
                authorId: me?.id ?? "",
                authorName: me?.name ?? "",
                publishedBy: me?.id ?? "",
                publisherName: me?.name ?? "",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: draft.version,
                reactions: [],
                myReaction: null,
                commentCount: 0,
                attachments: draft.attachments.map((a) => ({
                  ...a,
                  available: !!chosen[a.materialId],
                  file: chosen[a.materialId] ?? null,
                })),
              }}
              content={
                <Stack spacing={1}>
                  <InputBase
                    fullWidth
                    size="small"
                    placeholder="Tiêu đề bài đăng"
                    inputProps={{ "aria-label": "Tiêu đề", maxLength: 200 }}
                    value={draft.title}
                    onChange={(e) => {
                      setDraft((d) => ({ ...d, title: e.target.value }));
                      setDirty(true);
                    }}
                    sx={{ fontSize: 23, fontWeight: 600 }}
                  />
                  <InputBase
                    fullWidth
                    size="small"
                    multiline
                    minRows={3}
                    maxRows={12}
                    placeholder="Chia sẻ tài liệu, thông báo hoặc hướng dẫn với lớp…"
                    inputProps={{
                      "aria-label": "Nội dung / hướng dẫn",
                      maxLength: 20000,
                    }}
                    value={draft.body}
                    onChange={(e) => {
                      setDraft((d) => ({ ...d, body: e.target.value }));
                      setDirty(true);
                    }}
                    sx={{ fontSize: 14, color: "var(--post-muted)" }}
                  />
                </Stack>
              }
              afterMedia={
                <Stack spacing={1.5}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                      gap: 1.5,
                    }}
                  >
                    {[
                      {
                        label: "Chọn từ kho",
                        icon: <FolderOutlined sx={{ fontSize: 40 }} />,
                        action: () => setPicker(true),
                      },
                      {
                        label: "Upload trực tiếp",
                        icon: <CloudUploadOutlined sx={{ fontSize: 40 }} />,
                        action: () => setUpload(true),
                      },
                    ].map((item) => (
                      <ButtonBase
                        key={item.label}
                        onClick={item.action}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          border: "1px dashed var(--post-border)",
                          borderRadius: "14px",
                          p: 2,
                          minHeight: 130,
                          bgcolor: "var(--post-soft)",
                          color: "var(--post-green)",
                          gap: 1,
                        }}
                      >
                        {item.icon}
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                          {item.label}
                        </Typography>
                      </ButtonBase>
                    ))}
                  </Box>
                  {draft.attachments.map((a) => (
                    <Stack
                      key={a.materialId}
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center", minWidth: 0 }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}
                      >
                        {chosen[a.materialId]?.displayName ?? "Tài liệu"}
                      </Typography>
                      <TextField
                        size="small"
                        select
                        label="Nhóm"
                        value={a.group}
                        sx={{ minWidth: 110 }}
                        onChange={(e) => {
                          setDraft((d) => ({
                            ...d,
                            attachments: d.attachments.map((x) =>
                              x.materialId === a.materialId
                                ? {
                                    ...x,
                                    group: e.target
                                      .value as Attachment["group"],
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
                      <IconAction
                        label="Bỏ file khỏi bài đăng"
                        icon={<Close fontSize="small" />}
                        onClick={() => {
                          setDraft((d) => ({
                            ...d,
                            attachments: d.attachments.filter(
                              (x) => x.materialId !== a.materialId,
                            ),
                          }));
                          setDirty(true);
                        }}
                      />
                    </Stack>
                  ))}
                </Stack>
              }
              commentOpen={false}
              openComments={() => {}}
              preview={() => {}}
              onReaction={() => {}}
              reacting={false}
            >
              <Feedback error={error} />
            </PostSurface>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setOpen(false)}>
            Đóng / giữ nháp
          </Button>
          <Button
            size="small"
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
            {state.isLoading ? "Đang lưu…" : "Lưu bài"}
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
