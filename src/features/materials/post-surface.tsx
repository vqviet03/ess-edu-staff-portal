"use client";
import { useState, type ReactNode } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import ChatBubble from "@mui/icons-material/ChatBubble";
import Download from "@mui/icons-material/Download";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import Description from "@mui/icons-material/Description";
import { useTheme } from "@mui/material/styles";
import { useLazyContentQuery } from "@/api/library-api";
import { Feedback } from "@/shared/ui";
import type { MaterialFile, Post, PostType, Reaction } from "./models";
import { MaterialThumbnail } from "./thumbnail";
import { InlineAudio } from "./inline-audio";
import { bytes, fileKind } from "./utils";
export const postTypeLabels: Record<PostType, string> = {
  SESSION_MATERIAL: "Tài liệu phiên học",
  ANNOUNCEMENT: "Thông báo",
  DISCUSSION: "Trao đổi",
};
export const reactionLabels: Record<Reaction, string> = {
  LIKE: "👍 Thích",
  LOVE: "♥ Yêu thích",
  CELEBRATE: "🎉 Tuyệt vời",
};
export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return [parts[0]?.[0], parts.length > 1 ? parts.at(-1)?.[0] : ""]
    .join("")
    .toUpperCase();
}
export function PostSurface({
  post,
  children,
  commentOpen,
  openComments,
  viewerName,
  preview,
  onReaction,
  reacting,
  onEdit,
  onDelete,
}: {
  post: Post;
  children: ReactNode;
  commentOpen: boolean;
  openComments: () => void;
  viewerName: string;
  preview: (file: MaterialFile) => void;
  onReaction: (value: Reaction) => void;
  reacting: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const theme = useTheme(),
    dark = theme.palette.mode === "dark";
  const [menu, setMenu] = useState<HTMLElement | null>(null),
    [reactions, setReactions] = useState<HTMLElement | null>(null),
    [downloads, setDownloads] = useState<HTMLElement | null>(null),
    [error, setError] = useState<unknown>();
  const [download, downloadState] = useLazyContentQuery();
  const selected = post.myReaction ?? "LOVE",
    files = post.attachments
      .filter((a) => a.available && a.file)
      .map((a) => a.file!);
  return (
    <Paper
      component="article"
      data-testid="lesson-post"
      sx={{
        width: "100%",
        maxWidth: 600,
        mx: "auto",
        p: { xs: "20px 18px", sm: "26px" },
        borderRadius: "24px",
        border: "1px solid",
        borderColor: "var(--post-border)",
        boxShadow: "none",
        color: "var(--post-text)",
        bgcolor: "var(--post-surface)",
        "--post-surface": dark ? "#182820" : "#fff",
        "--post-border": dark ? "#34493b" : "#e4ebe5",
        "--post-text": dark ? "#e4f0e8" : "#213c30",
        "--post-muted": dark ? "#adc2b4" : "#697b70",
        "--post-green": dark ? "#a2d6b3" : "#317a55",
        "--post-tint": dark ? "#2c4835" : "#e6f2e9",
        "--post-soft": dark ? "#20382a" : "#f2f7f3",
        "& .MuiTypography-root": { lineHeight: 1.55 },
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              fontSize: 14,
              fontWeight: 600,
              bgcolor: "var(--post-tint)",
              color: "var(--post-green)",
            }}
          >
            {initials(post.authorName)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{ fontSize: 14, fontWeight: 600, overflowWrap: "anywhere" }}
            >
              {post.authorName}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "var(--post-muted)" }}>
              Giảng viên ·{" "}
              {new Date(post.createdAt).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
            {post.editedAt && (
              <Typography
                variant="caption"
                title={new Date(post.editedAt).toLocaleString("vi-VN")}
                sx={{ color: "var(--post-muted)" }}
              >
                Đã chỉnh sửa
              </Typography>
            )}
          </Box>
          {(onEdit || onDelete) && (
            <>
              <IconButton
                aria-label="Thao tác bài đăng"
                onClick={(e) => setMenu(e.currentTarget)}
                sx={{ color: "var(--post-muted)", minWidth: 44, minHeight: 44 }}
              >
                <MoreHoriz />
              </IconButton>
              <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
                {onEdit && (
                  <MenuItem
                    onClick={() => {
                      setMenu(null);
                      onEdit();
                    }}
                  >
                    Sửa bài
                  </MenuItem>
                )}
                {onDelete && (
                  <MenuItem
                    onClick={() => {
                      setMenu(null);
                      onDelete();
                    }}
                  >
                    Xóa bài
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
        </Stack>
        <Box>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ mb: 1, flexWrap: "wrap" }}
          >
            <Chip
              size="small"
              label={[
                post.sessionName ||
                  postTypeLabels[post.postType ?? "SESSION_MATERIAL"],
                post.className,
              ]
                .filter(Boolean)
                .join(" · ")}
              sx={{
                bgcolor: "var(--post-tint)",
                color: "var(--post-green)",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: "7px",
              }}
            />
            {post.status === "DRAFT" && <Chip size="small" label="Nháp" />}
          </Stack>
          <Typography
            component="h2"
            sx={{
              fontSize: 23,
              fontWeight: 600,
              mb: 1,
              overflowWrap: "anywhere",
            }}
          >
            {post.title}
          </Typography>
          <Typography
            sx={{
              fontSize: 14,
              color: "var(--post-muted)",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {post.body}
          </Typography>
        </Box>
        {!!post.attachments.filter(
          (a) => !a.file?.mimeType.startsWith("audio/"),
        ).length && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 1.5,
            }}
          >
            {post.attachments
              .filter((a) => !a.file?.mimeType.startsWith("audio/"))
              .map((a) => (
                <Tooltip
                  key={a.materialId}
                  title={a.file?.displayName ?? "Tài liệu không còn khả dụng"}
                >
                  <ButtonBase
                    disabled={!a.available || !a.file}
                    onClick={() => a.file && preview(a.file)}
                    aria-label={`Xem ${a.file?.displayName ?? "Tài liệu không còn khả dụng"}`}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "stretch",
                      border: "1px solid var(--post-border)",
                      borderRadius: "14px",
                      overflow: "hidden",
                      textAlign: "left",
                      minWidth: 0,
                    }}
                  >
                    <Box
                      sx={{
                        height: 130,
                        bgcolor: "var(--post-soft)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        p: 1.5,
                      }}
                    >
                      {a.file?.thumbnailUrl ? (
                        <MaterialThumbnail id={a.file.id} />
                      ) : (
                        <Description
                          sx={{ fontSize: 56, color: "var(--post-green)" }}
                        />
                      )}
                    </Box>
                    <Box sx={{ p: "13px", flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 600,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {a.file?.displayName ?? "Tài liệu không còn khả dụng"}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: "var(--post-muted)",
                          mt: 0.4,
                        }}
                      >
                        {a.file
                          ? `${fileKind(a.file.mimeType)} · ${bytes(a.file.sizeBytes)}`
                          : "Đã ngừng sử dụng"}
                      </Typography>
                    </Box>
                  </ButtonBase>
                </Tooltip>
              ))}
          </Box>
        )}
        {files
          .filter((f) => f.mimeType.startsWith("audio/"))
          .map((f) => (
            <InlineAudio key={f.id} file={f} />
          ))}
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", color: "var(--post-muted)" }}
        >
          <Typography sx={{ fontSize: 12 }}>
            {post.reactions.reduce((n, r) => n + r.count, 0)} lượt tương tác
          </Typography>
          <Button
            onClick={openComments}
            sx={{ fontSize: 12, p: 0, color: "inherit", minHeight: 44 }}
          >
            {post.commentCount} bình luận
          </Button>
        </Stack>
        <Divider sx={{ borderColor: "var(--post-border)" }} />
        <Stack
          direction="row"
          sx={{
            gap: 0.5,
            "& .MuiButton-root": {
              fontSize: 12,
              minHeight: 44,
              minWidth: 0,
              color: "var(--post-muted)",
              textTransform: "none",
            },
          }}
        >
          <Box
            sx={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0 }}
          >
            <Button
              startIcon={<FavoriteBorder fontSize="small" />}
              sx={{
                flex: 1,
                bgcolor: post.myReaction ? "var(--post-tint)" : undefined,
              }}
              aria-label={reactionLabels[selected]}
              aria-pressed={!!post.myReaction}
              disabled={reacting}
              onClick={() => onReaction(selected)}
            >
              {selected === "LOVE"
                ? "Yêu thích"
                : selected === "LIKE"
                  ? "Thích"
                  : "Tuyệt vời"}
            </Button>
            <IconButton
              aria-label="Chọn tương tác"
              disabled={reacting}
              onClick={(e) => setReactions(e.currentTarget)}
              sx={{ p: 0.25, color: "var(--post-muted)", minHeight: 44 }}
            >
              <ExpandMore fontSize="small" />
            </IconButton>
          </Box>
          <Button
            sx={{ flex: 1 }}
            startIcon={<ChatBubble fontSize="small" />}
            onClick={openComments}
            aria-label={`Bình luận (${post.commentCount})`}
          >
            Bình luận
          </Button>
          <Button
            sx={{ flex: 1 }}
            startIcon={<Download fontSize="small" />}
            disabled={!files.length || downloadState.isFetching}
            onClick={(e) => setDownloads(e.currentTarget)}
          >
            Tải tài liệu
          </Button>
        </Stack>
        <Menu
          anchorEl={reactions}
          open={!!reactions}
          onClose={() => setReactions(null)}
        >
          {Object.entries(reactionLabels).map(([value, label]) => (
            <MenuItem
              key={value}
              selected={post.myReaction === value}
              onClick={() => {
                setReactions(null);
                onReaction(value as Reaction);
              }}
            >
              {label}
            </MenuItem>
          ))}
        </Menu>
        <Menu
          anchorEl={downloads}
          open={!!downloads}
          onClose={() => setDownloads(null)}
        >
          {files.map((f) => (
            <MenuItem
              key={f.id}
              sx={{
                maxWidth: 360,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              }}
              onClick={async () => {
                setDownloads(null);
                setError(undefined);
                try {
                  const v: unknown = await download({
                    id: f.id,
                    purpose: "download",
                  }).unwrap();
                  const url =
                    typeof v === "string"
                      ? v
                      : v && typeof v === "object" && "url" in v
                        ? String(v.url)
                        : "";
                  if (!url) throw new Error("Không tải được file.");
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = f.displayName;
                  link.click();
                } catch (e) {
                  setError(e);
                }
              }}
            >
              {f.displayName}
            </MenuItem>
          ))}
        </Menu>
        <Feedback error={error} />
        <Divider sx={{ borderColor: "var(--post-border)" }} />
        {commentOpen ? (
          children
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Avatar
              sx={{
                width: 29,
                height: 29,
                fontSize: 10,
                bgcolor: "var(--post-tint)",
                color: "var(--post-green)",
              }}
            >
              {initials(viewerName)}
            </Avatar>
            <ButtonBase
              aria-label="Mở phần bình luận"
              onClick={openComments}
              sx={{
                flex: 1,
                minWidth: 0,
                bgcolor: "var(--post-soft)",
                borderRadius: "22px",
                minHeight: 44,
                pl: 1.5,
                pr: 0.5,
                justifyContent: "space-between",
                color: "var(--post-muted)",
                fontSize: 12,
              }}
            >
              Viết bình luận…
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: "var(--post-green)",
                  color: "var(--post-surface)",
                }}
              >
                <ArrowUpward fontSize="small" />
              </Avatar>
            </ButtonBase>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
