"use client";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useMediaCleanup } from "@/shared/media-lifecycle";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import PlayArrow from "@mui/icons-material/PlayArrow";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { useLazyContentQuery } from "@/api/library-api";
import { InlineAudio } from "@/features/materials/inline-audio";
import { MaterialViewer } from "@/features/materials/viewer";
import { bytes } from "@/features/materials/utils";
import type { Media } from "./models";
export interface MediaDimensions {
  width: number;
  height: number;
}
export function AssignmentMedia({
  media,
  onDimensions,
  submissionAudio = false,
}: {
  media: Media[];
  onDimensions?: (dimensions: MediaDimensions) => void;
  submissionAudio?: boolean;
}) {
  if (!media.length) return null;
  return (
    <Stack spacing={1}>
      {media.map((m) => (
        <MediaItem
          key={m.materialId}
          item={m}
          onDimensions={onDimensions}
          submissionAudio={submissionAudio}
        />
      ))}
    </Stack>
  );
}
function MediaItem({
  item,
  onDimensions,
  submissionAudio = false,
}: {
  item: Media;
  onDimensions?: (dimensions: MediaDimensions) => void;
  submissionAudio?: boolean;
}) {
  const f = item.file,
    [load, state] = useLazyContentQuery(),
    [url, setUrl] = useState(""),
    [view, setView] = useState(false),
    host = useRef<HTMLDivElement>(null);
  useMediaCleanup(host);
  const needsOriginal = Boolean(onDimensions);
  useEffect(() => {
    if (!f || !f.mimeType.startsWith("image/")) return;
    let live = true;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        void load(
          {
            id: f.id,
            purpose: f.thumbnailUrl && !needsOriginal ? "thumbnail" : "preview",
            ...(f.thumbnailUrl && !needsOriginal ? { width: 1280 } : {}),
          },
          true,
        )
          .unwrap()
          .then((value) => {
            if (live) setUrl(value);
          })
          .catch(() => {});
      }
    });
    if (host.current) observer.observe(host.current);
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [f, load, needsOriginal]);
  if (!f)
    return (
      <Typography color="text.secondary">
        Tài liệu không còn khả dụng.
      </Typography>
    );
  const visual =
    f.mimeType.startsWith("image/") || f.mimeType.startsWith("video/");
  return (
    <Box
      ref={host}
      sx={{
        maxWidth: "100%",
        width: item.displayWidth ?? (visual ? "fit-content" : "100%"),
        height: "auto",
      }}
    >
      {visual ? (
        <>
          <Box
            sx={{
              width: item.displayWidth ?? "fit-content",
              maxWidth: "100%",
              aspectRatio:
                item.displayWidth && item.displayHeight
                  ? `${item.displayWidth}/${item.displayHeight}`
                  : undefined,
            }}
          >
            {url ? (
              <Box
                component={f.mimeType.startsWith("image/") ? "img" : "video"}
                src={url}
                controls={f.mimeType.startsWith("video/")}
                preload={needsOriginal ? "metadata" : "none"}
                onLoad={(
                  event: SyntheticEvent<HTMLImageElement | HTMLVideoElement>,
                ) => {
                  if (event.currentTarget instanceof HTMLImageElement)
                    onDimensions?.({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    });
                }}
                onLoadedMetadata={(
                  event: SyntheticEvent<HTMLImageElement | HTMLVideoElement>,
                ) => {
                  if (event.currentTarget instanceof HTMLVideoElement)
                    onDimensions?.({
                      width: event.currentTarget.videoWidth,
                      height: event.currentTarget.videoHeight,
                    });
                }}
                alt={
                  f.mimeType.startsWith("image/")
                    ? "Minh họa bài tập"
                    : undefined
                }
                sx={{
                  width: item.displayWidth ? "100%" : "auto",
                  height:
                    item.displayWidth && item.displayHeight ? "100%" : "auto",
                  display: "block",
                  maxWidth: "100%",
                  objectFit: item.keepAspectRatio ? "contain" : "fill",
                  borderRadius: "12px",
                }}
              />
            ) : (
              <Button
                aria-label={
                  f.mimeType.startsWith("video/") ? "Phát video" : "Xem ảnh"
                }
                sx={{
                  width: item.displayWidth ?? 320,
                  maxWidth: "100%",
                  height: item.displayHeight ?? 180,
                  bgcolor: f.mimeType.startsWith("video/")
                    ? "#263f4a"
                    : "var(--a-info)",
                  color: "white",
                }}
                onClick={() =>
                  void load({ id: f.id, purpose: "preview" }, true)
                    .unwrap()
                    .then(setUrl)
                    .catch(() => {})
                }
              >
                {state.isFetching ? (
                  <CircularProgress size={20} />
                ) : f.mimeType.startsWith("video/") ? (
                  <PlayArrow
                    sx={{
                      fontSize: 44,
                      bgcolor: "#6f9eaa",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  "Xem ảnh"
                )}
              </Button>
            )}
          </Box>
        </>
      ) : f.mimeType.startsWith("audio/") ? (
        <Box sx={{ maxWidth: 460, "--post-file": "transparent" }}>
          <InlineAudio file={f} submission={submissionAudio} />
        </Box>
      ) : (
        <Stack
          direction="column"
          spacing={1}
          sx={{
            p: 1.5,
            border: 0,
            bgcolor: "var(--a-bg)",
            borderRadius: "12px",
            alignItems: "stretch",
          }}
        >
          <Typography sx={{ overflowWrap: "anywhere", flex: 1 }}>
            {f.displayName}
            <Typography
              component="span"
              sx={{ display: "block" }}
              variant="caption"
              color="text.secondary"
            >
              {f.mimeType.split("/").at(-1)} · {bytes(f.sizeBytes)}
            </Typography>
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setView(true)}>Xem / phát</Button>
            <Button
              disabled={state.isFetching}
              onClick={() =>
                void load({ id: f.id, purpose: "download" })
                  .unwrap()
                  .then((value) => {
                    const a = document.createElement("a");
                    a.href = value;
                    a.download = f.displayName;
                    a.click();
                  })
                  .catch(() => {})
              }
            >
              Tải xuống
            </Button>
          </Stack>
        </Stack>
      )}
      {state.isError && (
        <Typography color="error">
          Không mở được tài liệu. Hãy thử lại.
        </Typography>
      )}
      {view && <MaterialViewer file={f} close={() => setView(false)} />}
    </Box>
  );
}
// Stored plain text with explicit inline tokens; no HTML execution. Chips preserve their position in text.
export function RichContent({
  value,
  media = [],
}: {
  value: string;
  media?: Media[];
}) {
  const [active, setActive] = useState<Media | null>(null);
  const parts = value.split(/(\[file:[a-fA-F0-9-]+\]|https?:\/\/[^\s<>]+)/g);
  return (
    <Box
      component="span"
      sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
    >
      {parts.map((text, i) => {
        if (text.startsWith("[file:")) {
          const file = media.find((m) => m.materialId === text.slice(6, -1));
          return file?.file ? (
            <Chip
              key={i}
              size="small"
              className="assignment-chip-file"
              label={file.file.displayName}
              title={file.file.displayName}
              sx={{ maxWidth: "100%", verticalAlign: "middle" }}
              onClick={() => setActive(file)}
            />
          ) : (
            <span key={i}>Tài liệu không còn khả dụng</span>
          );
        }
        if (/^https?:\/\//.test(text)) {
          try {
            const u = new URL(text);
            if (u.username || u.password) return text;
            return (
              <Chip
                key={i}
                component="a"
                href={u.href}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                className="assignment-chip-link"
                clickable
                label={u.hostname}
                title={u.href}
                sx={{ maxWidth: "100%", verticalAlign: "middle" }}
              />
            );
          } catch {
            return text;
          }
        }
        return <span key={i}>{text}</span>;
      })}
      {active && active.file && (
        <MaterialViewer file={active.file} close={() => setActive(null)} />
      )}
    </Box>
  );
}
