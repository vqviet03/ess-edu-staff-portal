"use client";
import {NotificationPrioritySelect} from "@/features/notifications/priority";
import {ContentViews} from "@/features/presence/views";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AttachFile from "@mui/icons-material/AttachFile";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import Reply from "@mui/icons-material/Reply";
import ThumbUp from "@mui/icons-material/ThumbUp";
import ThumbUpOutlined from "@mui/icons-material/ThumbUpOutlined";
import PushPin from "@mui/icons-material/PushPin";
import {
  useCommentsQuery,
  useSaveCommentMutation,
  useRemoveCommentMutation,
  usePinCommentMutation,
  useLikeCommentMutation,
} from "@/api/library-api";
import { useAppSelector } from "@/store";
import { Feedback } from "@/shared/ui";
import { useUnsaved } from "@/shared/unsaved";
import type { Comment, MaterialFile, Post } from "./models";
import { initials } from "./post-surface";
import { CommentAttachment } from "./comment-attachment";
import { IconAction } from "@/shared/icon-action";
import { MaterialViewer } from "./viewer";
import { UploadDialog } from "./upload";

function CommentPage({
  postId,
  cursor,
  around,
  render,
  pinned,
}: {
  postId: string;
  cursor?: string;
  around?: string;
  render: (c: Comment) => ReactNode;
  pinned: Set<string>;
}) {
  const query = useCommentsQuery({ postId, cursor, around }),
    [more, setMore] = useState(false);
  useEffect(() => {
    if (around && query.currentData)
      document
        .getElementById(`comment-${around}`)
        ?.scrollIntoView({ block: "center" });
  }, [around, query.currentData]);
  return (
    <Stack spacing={1.5}>
      <Feedback
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.currentData?.items.filter((c) => !pinned.has(c.id)).map(render)}
      {query.currentData?.nextCursor &&
        (more ? (
          <CommentPage
            postId={postId}
            cursor={query.currentData.nextCursor}
            render={render}
            pinned={pinned}
          />
        ) : (
          <Button
            size="small"
            onClick={() => setMore(true)}
            sx={{ alignSelf: "flex-start" }}
          >
            Xem thêm bình luận
          </Button>
        ))}
    </Stack>
  );
}
export function Comments({
  post,
  expanded,
  expand,
  collapse,
  targetComment,
}: {
  post: Post;
  expanded: boolean;
  expand: () => void;
  collapse?: () => void;
  targetComment?: string;
}) {
  const me = useAppSelector((s) => s.auth.session?.teacher);
  const [priority,setPriority]=useState<"NORMAL"|"IMPORTANT"|undefined>();
  const [body, setBody] = useState(""),
    [upload, setUpload] = useState(false),
    [attachments, setAttachments] = useState<MaterialFile[]>([]),
    [preview, setPreview] = useState<MaterialFile | null>(null),
    [parent, setParent] = useState<{ id: string; name: string }>(),
    [editing, setEditing] = useState<{ id: string; version: number } | null>(
      null,
    ),
    [menu, setMenu] = useState<{
      anchor: HTMLElement;
      comment: Comment;
    } | null>(null),
    [error, setError] = useState<unknown>();
  const [save, state] = useSaveCommentMutation(),
    [remove] = useRemoveCommentMutation(),
    [pin, pinning] = usePinCommentMutation(),
    [like, liking] = useLikeCommentMutation();
  const input = useRef<HTMLTextAreaElement>(null);
  useUnsaved(!!body.trim() || attachments.length > 0);
  useEffect(() => {
    if (expanded && targetComment)
      document
        .getElementById(`comment-${targetComment}`)
        ?.scrollIntoView({ block: "center" });
  }, [expanded, targetComment]);
  async function submit() {
    if (state.isLoading || (!body.trim() && !attachments.length)) return;
    expand();
    setError(undefined);
    try {
      await save({
        postId: post.id,
        id: editing?.id,
        version: editing?.version,
        body,
        parentId: parent?.id,
        materialIds: attachments.map((f) => f.id),
        notificationPriority:priority,
      }).unwrap();
      setBody("");
      setAttachments([]);
      setParent(undefined);
      setEditing(null);
    } catch (e) {
      setError(e);
    }
  }
  const avatarSx = {
    width: { xs: 32, sm: 36 },
    height: { xs: 32, sm: 36 },
    fontSize: 12,
    bgcolor: "var(--post-soft)",
    color: "var(--post-muted)",
    flexShrink: 0,
  };
  const render = (c: Comment) => (
    <Stack
      key={c.id}
      id={`comment-${c.id}`}
      data-testid="post-comment"
      direction="row"
      spacing={1}
      sx={{ ml: c.parentId ? 2 : 0, alignItems: "flex-start" }}
    >
      <Avatar sx={avatarSx}>{initials(c.authorName)}</Avatar>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          bgcolor: "var(--post-soft)",
          borderRadius: "18px",
          px: 2,
          py: 1.3,
          border: c.isPinned ? "1px solid var(--post-green)" : undefined,
        }}
      >
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            {c.authorName}
            {c.authorId === post.authorId ? " · Giảng viên" : ""}
          </Typography>
          <Stack direction="row" sx={{ alignItems: "center" }}>
            <ContentViews kind="COMMENT" id={c.id}/>
            {c.isPinned && (
              <Tooltip title="Bình luận đã ghim — luôn hiển thị">
                <PushPin sx={{ fontSize: 15, color: "var(--post-green)" }} />
              </Tooltip>
            )}
            {(c.authorId === me?.id ||
              post.canPinComment ||
              me?.roles?.includes("MANAGER")) && (
              <Tooltip title="Thao tác bình luận">
                <IconButton
                  size="small"
                  aria-label="Thao tác bình luận"
                  onClick={(e) =>
                    setMenu({ anchor: e.currentTarget, comment: c })
                  }
                >
                  <MoreHoriz fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
        {c.parentId && (
          <Typography variant="caption" sx={{ color: "var(--post-green)" }}>
            Trả lời {c.parentAuthorName ?? "người bình luận"}
          </Typography>
        )}
        <Typography
          sx={{
            fontSize: 14,
            mt: 0.4,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {c.body}
        </Typography>
        {!!c.attachments?.length && (
          <Stack
            direction="row"
            useFlexGap
            sx={{ gap: 1, flexWrap: "wrap", mt: 1 }}
          >
            {c.attachments.map((f) => (
              <CommentAttachment key={f.id} file={f} preview={setPreview} />
            ))}
          </Stack>
        )}
        <Stack
          direction="row"
          sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}
        >
          <Typography
            component="time"
            dateTime={c.createdAt}
            sx={{ fontSize: 11, color: "var(--post-muted)", mr: 0.5 }}
          >
            {new Date(c.createdAt).toLocaleString("vi-VN")}
          </Typography>
          <IconAction
            label={c.myLike ? "Bỏ thích bình luận" : "Thích bình luận"}
            icon={
              c.myLike ? (
                <ThumbUp fontSize="small" />
              ) : (
                <ThumbUpOutlined fontSize="small" />
              )
            }
            disabled={liking.isLoading || c.version === 0}
            onClick={async () => {
              setError(undefined);
              try {
                await like({
                  id: c.id,
                  postId: post.id,
                  liked: !c.myLike,
                }).unwrap();
              } catch (e) {
                setError(e);
              }
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: c.myLike ? "var(--post-green)" : "var(--post-muted)" }}
          >
            {c.likeCount ?? 0}
          </Typography>
          <IconAction
            label={`Trả lời ${c.authorName}`}
            icon={<Reply fontSize="small" />}
            disabled={c.version === 0}
            onClick={() => {
              setParent({ id: c.id, name: c.authorName });
              setEditing(null);
              input.current?.focus();
            }}
          />
          {c.version === 0 && (
            <Typography variant="caption">Đang gửi…</Typography>
          )}
        </Stack>
      </Box>
    </Stack>
  );
  return (
    <Stack spacing={1.5} data-testid="post-comments">
      {!!post.pinnedComments?.length && (
        <Stack spacing={1.5} data-testid="pinned-comments">
          {post.pinnedComments.map(render)}
        </Stack>
      )}
      {expanded && (
        <Stack spacing={1.5} data-testid="comment-list">
          <CommentPage
            postId={post.id}
            around={targetComment}
            render={render}
            pinned={new Set(post.pinnedComments?.map((c) => c.id) ?? [])}
          />
          {collapse && (
            <Button
              size="small"
              onClick={collapse}
              sx={{ alignSelf: "flex-start" }}
            >
              Đóng
            </Button>
          )}
        </Stack>
      )}
      <Feedback error={error} />
      {(parent || editing) && (
        <Chip
          size="small"
          label={editing ? "Đang sửa bình luận" : `Trả lời ${parent?.name}`}
          onDelete={() => {
            setParent(undefined);
            if (editing) {
              setBody("");
              setAttachments([]);
            }
            setEditing(null);
          }}
        />
      )}
      {!!attachments.length && (
        <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
          {attachments.map((f) => (
            <Chip
              size="small"
              key={f.id}
              label={f.displayName}
              sx={{ maxWidth: "100%" }}
              onDelete={() =>
                setAttachments((old) => old.filter((x) => x.id !== f.id))
              }
            />
          ))}
        </Stack>
      )}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Avatar sx={avatarSx}>{initials(me?.name ?? "Bạn")}</Avatar>
        <Box
          component="form"
          aria-label="Soạn bình luận"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "flex-end",
            bgcolor: "var(--post-soft)",
            border: "1px solid var(--post-border)",
            borderRadius: "28px",
            pl: 1.5,
            pr: 0.5,
            py: 0.5,
            "&:focus-within": {
              outline: "2px solid var(--post-green)",
              outlineOffset: 2,
            },
          }}
        >
          <InputBase
            size="small"
            multiline
            maxRows={6}
            inputRef={input}
            value={body}
            disabled={state.isLoading}
            placeholder="Viết bình luận…"
            onFocus={expand}
            onChange={(e) => setBody(e.target.value)}
            inputProps={{ "aria-label": "Viết bình luận", maxLength: 5000 }}
            sx={{
              flex: 1,
              minWidth: 0,
              alignSelf: "center",
              fontSize: 14,
              color: "var(--post-text)",
              "& textarea::placeholder": {
                color: "var(--post-muted)",
                opacity: 1,
              },
            }}
          />
          <Tooltip title="Đính kèm ảnh / file / audio / video">
            <IconButton
              aria-label="Đính kèm ảnh / file / audio / video"
              disabled={state.isLoading}
              onClick={() => setUpload(true)}
              sx={{ color: "var(--post-muted)", width: 32, height: 32 }}
            >
              <AttachFile fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={editing ? "Lưu bình luận" : "Gửi bình luận"}>
            <span>
              <IconButton
                type="submit"
                aria-label="Gửi bình luận"
                disabled={
                  (!body.trim() && !attachments.length) || state.isLoading
                }
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: "var(--post-green)",
                  color: "var(--post-surface)",
                  "&:hover": { bgcolor: "var(--post-green)", opacity: 0.85 },
                  "&.Mui-disabled": {
                    bgcolor: "var(--post-tint)",
                    color: "var(--post-muted)",
                  },
                }}
              >
                <ArrowUpward fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Stack>
      <NotificationPrioritySelect classId={post.classId} feature={parent?"REPLY":"SOCIAL"} value={priority} onChange={setPriority}/>
      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        {post.canPinComment && (
          <MenuItem
            disabled={pinning.isLoading}
            onClick={async () => {
              if (!menu) return;
              const c = menu.comment;
              setMenu(null);
              setError(undefined);
              try {
                await pin({
                  id: c.id,
                  postId: post.id,
                  isPinned: !c.isPinned,
                  version: c.version,
                  notificationPriority:priority,
                }).unwrap();
              } catch (e) {
                setError(e);
              }
            }}
          >
            {menu?.comment.isPinned ? "Bỏ ghim" : "Ghim bình luận"}
          </MenuItem>
        )}
        {menu?.comment.authorId === me?.id && (
          <MenuItem
            onClick={() => {
              if (!menu) return;
              setEditing({
                id: menu.comment.id,
                version: menu.comment.version,
              });
              setBody(menu.comment.body);
              setAttachments(menu.comment.attachments ?? []);
              setParent(undefined);
              setMenu(null);
              input.current?.focus();
            }}
          >
            Sửa bình luận
          </MenuItem>
        )}
        {(menu?.comment.authorId === me?.id ||
          me?.roles?.includes("MANAGER")) && (
          <MenuItem
            onClick={async () => {
              if (!menu) return;
              const c = menu.comment;
              setMenu(null);
              if (!window.confirm("Xóa bình luận này?")) return;
              setError(undefined);
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
            Xóa bình luận
          </MenuItem>
        )}
      </Menu>
      {upload && (
        <UploadDialog
          folderId={null}
          sessionId={post.sessionId ?? undefined}
          postId={post.id}
          close={() => setUpload(false)}
          added={(f) => setAttachments((old) => [...old, f])}
        />
      )}
      {preview && (
        <MaterialViewer file={preview} close={() => setPreview(null)} />
      )}
    </Stack>
  );
}
