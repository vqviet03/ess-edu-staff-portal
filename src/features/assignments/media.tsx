"use client";
import { useEffect, useRef, useState } from "react";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { useLazyContentQuery } from "@/api/library-api";
import { InlineAudio } from "@/features/materials/inline-audio";
import { MaterialViewer } from "@/features/materials/viewer";
import { bytes } from "@/features/materials/utils";
import type { Media } from "./models";
export function AssignmentMedia({ media }: { media: Media[] }) {
  return (
    <Stack spacing={1}>
      {media.map((m) => (
        <MediaItem key={m.materialId} item={m} />
      ))}
    </Stack>
  );
}
function MediaItem({ item }: { item: Media }) {
  const f = item.file,
    [load, state] = useLazyContentQuery(),
    [url, setUrl] = useState(""),
    [view, setView] = useState(false),
    host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!f || !f.mimeType.startsWith("image/")) return;
    let live = true;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        void load({ id: f.id, purpose: "preview" }, true)
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
  }, [f, load]);
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
        width: item.displayWidth ?? "100%",
        height: "auto",
      }}
    >
      {visual ? (
        <>
          <Box
            sx={{
              width: "100%",
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
                preload="metadata"
                alt={
                  f.mimeType.startsWith("image/")
                    ? "Minh họa bài tập"
                    : undefined
                }
                sx={{
                  width: "100%",
                  height:
                    item.displayWidth && item.displayHeight ? "100%" : "auto",
                  display: "block",
                  maxWidth: "100%",
                  objectFit: "contain",
                  borderRadius: "12px",
                }}
              />
            ) : (
              <Button
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
                  "Phát video"
                ) : (
                  "Xem ảnh"
                )}
              </Button>
            )}
          </Box>
        </>
      ) : f.mimeType.startsWith("audio/") ? (
        <Box
          sx={{
            "--post-border": "#dce7df",
            "--post-file": "transparent",
            "--post-soft": "#e2f1e7",
            "--post-muted": "#60776b",
          }}
        >
          <InlineAudio file={f} />
        </Box>
      ) : (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            p: 1.5,
            border: 1,
            borderColor: "divider",
            borderRadius: "12px",
            alignItems: "center",
            flexWrap: "wrap",
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
          <Button onClick={() => setView(true)}>Xem / tải</Button>
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
    <Box sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {parts.map((text, i) => {
        if (text.startsWith("[file:")) {
          const file = media.find((m) => m.materialId === text.slice(6, -1));
          return file?.file ? (
            <Chip
              key={i}
              size="small"
              color="warning"
              variant="outlined"
              label={file.file.displayName}
              title={file.file.displayName}
              sx={{maxWidth:"100%",verticalAlign:"middle"}}
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
                color="success"
                variant="outlined"
                clickable
                label={u.hostname}
                title={u.href}
                sx={{maxWidth:"100%",verticalAlign:"middle"}}
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
