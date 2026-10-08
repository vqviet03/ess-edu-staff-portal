"use client";
import { useRef, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
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
import {
  useCommentsQuery,
  useSaveCommentMutation,
  useRemoveCommentMutation,
} from "@/api/library-api";
import { useAppSelector } from "@/store";
import { Feedback } from "@/shared/ui";
import { useUnsaved } from "@/shared/unsaved";
import type { Comment, MaterialFile, Post } from "./models";
import { initials } from "./post-surface";
import { CommentAttachment } from "./comment-attachment";
import { IconAction } from "@/shared/icon-action";
import Reply from "@mui/icons-material/Reply";
import FirstPage from "@mui/icons-material/FirstPage";
import ArrowForward from "@mui/icons-material/ArrowForward";
import { MaterialViewer } from "./viewer";
import { UploadDialog } from "./upload";

export function Comments({
  post,
  expanded,
  expand,
}: {
  post: Post;
  expanded: boolean;
  expand: () => void;
}) {
  const me = useAppSelector((s) => s.auth.session?.teacher),
    [cursor, setCursor] = useState<string>(),
    query = useCommentsQuery({ postId: post.id, cursor }, { skip: !expanded }),
    [body, setBody] = useState(""),
    [upload, setUpload] = useState(false),
    [attachments, setAttachments] = useState<MaterialFile[]>([]),
    [preview, setPreview] = useState<MaterialFile | null>(null),
    [parent, setParent] = useState<string>(),
    [editing, setEditing] = useState<{ id: string; version: number } | null>(
      null,
    ),
    [menu, setMenu] = useState<{
      anchor: HTMLElement;
      comment: Comment;
    } | null>(null),
    [save, state] = useSaveCommentMutation(),
    [remove] = useRemoveCommentMutation(),
    [error, setError] = useState<unknown>();
  const input = useRef<HTMLTextAreaElement>(null);
  useUnsaved(!!body.trim() || attachments.length > 0);
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
        parentId: parent,
        materialIds: attachments.map((file) => file.id),
      }).unwrap();
      setBody("");
      setAttachments([]);
      setParent(undefined);
      setEditing(null);
      setCursor(undefined);
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
  return (
    <Stack spacing={1.5} data-testid="post-comments">
      {expanded && (
        <Box data-testid="comment-list">
          <Feedback
            loading={query.isLoading}
            error={query.error}
            retry={() => void query.refetch()}
          />
          <Stack spacing={1.5}>
            {query.currentData?.items.map((c) => (
              <Stack
                key={c.id}
                direction="row"
                spacing={1}
                data-testid="post-comment"
                sx={{
                  ml: c.parentId ? { xs: 1, sm: 4 } : 0,
                  alignItems: "flex-start",
                }}
              >
                <Avatar sx={avatarSx}>{initials(c.authorName)}</Avatar>
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    bgcolor: "var(--post-soft)",
                    borderRadius: "16px",
                    p: 1.5,
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center", gap: 0.5 }}
                  >
                    <Typography
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {c.authorName}
                      {c.authorId === post.authorId ? " · Giảng viên" : ""}
                    </Typography>
                    {(c.authorId === me?.id ||
                      me?.roles?.includes("MANAGER")) && (
                      <Tooltip title="Thao tác bình luận">
                        <span>
                          <IconButton
                            aria-label={`Thao tác bình luận của ${c.authorName}`}
                            disabled={c.version === 0}
                            onClick={(e) =>
                              setMenu({ anchor: e.currentTarget, comment: c })
                            }
                            sx={{
                              color: "var(--post-muted)",
                              width: 32,
                              height: 32,
                              my: -1,
                            }}
                          >
                            <MoreHoriz fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                  {c.parentId && (
                    <Typography
                      variant="caption"
                      sx={{ color: "var(--post-muted)" }}
                    >
                      Trả lời bình luận
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
                  <Stack
                    direction="row"
                    useFlexGap
                    sx={{
                      gap: 1,
                      flexWrap: "wrap",
                      mt: c.attachments?.length ? 1 : 0,
                    }}
                  >
                    {c.attachments?.map((file) => (
                      <CommentAttachment
                        key={file.id}
                        file={file}
                        preview={setPreview}
                      />
                    ))}
                  </Stack>
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
                  >
                    <Typography
                      component="time"
                      dateTime={c.createdAt}
                      sx={{ fontSize: 11, color: "var(--post-muted)" }}
                    >
                      {new Date(c.createdAt).toLocaleString("vi-VN")}
                    </Typography>
                    <IconAction
                      label="Trả lời"
                      icon={<Reply fontSize="small" />}
                      disabled={c.version === 0}
                      onClick={() => {
                        setParent(c.id);
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
            ))}
          </Stack>
          {(cursor || query.currentData?.nextCursor) && (
            <Stack direction="row">
              {cursor && (
                <IconAction
                  label="Bình luận đầu"
                  icon={<FirstPage fontSize="small" />}
                  onClick={() => setCursor(undefined)}
                />
              )}
              {query.currentData?.nextCursor && (
                <IconAction
                  label="Bình luận tiếp theo"
                  icon={<ArrowForward fontSize="small" />}
                  onClick={() =>
                    setCursor(query.currentData?.nextCursor ?? undefined)
                  }
                />
              )}
            </Stack>
          )}
        </Box>
      )}
      <Feedback error={error} />
      {(parent || editing) && (
        <Chip
          size="small"
          label={editing ? "Đang sửa bình luận" : "Đang trả lời"}
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
          {attachments.map((file) => (
            <Chip
              size="small"
              key={file.id}
              label={file.displayName}
              sx={{ maxWidth: "100%" }}
              onDelete={() =>
                setAttachments((old) => old.filter((f) => f.id !== file.id))
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
      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
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
      </Menu>
      {upload && (
        <UploadDialog
          folderId={null}
          sessionId={post.sessionId ?? undefined}
          postId={post.id}
          close={() => setUpload(false)}
          added={(file) => setAttachments((old) => [...old, file])}
        />
      )}
      {preview && (
        <MaterialViewer file={preview} close={() => setPreview(null)} />
      )}
    </Stack>
  );
}
