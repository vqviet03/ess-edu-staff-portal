"use client";
import { useEffect, useRef, useState } from "react";
import { useAudioTimeline } from "@/shared/audio-timeline";
import { releaseMedia } from "@/shared/media-lifecycle";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import PlayArrow from "@mui/icons-material/PlayArrow";
import Pause from "@mui/icons-material/Pause";
import { useLazyContentQuery } from "@/api/library-api";
import { Feedback } from "@/shared/ui";
import type { MaterialFile } from "./models";
const time = (value: number) =>
  `${Math.floor(value / 60)}:${Math.floor(value % 60)
    .toString()
    .padStart(2, "0")}`;
export function InlineAudio({
  file,
  submission = false,
}: {
  file: MaterialFile;
  submission?: boolean;
}) {
  const label = submission ? "Bản ghi bài nộp" : file.displayName;
  const audio = useRef<HTMLAudioElement>(null),
    [source, setSource] = useState<string>(),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [error, setError] = useState<unknown>(),
    [load, state] = useLazyContentQuery();
  const {
    position: current,
    duration,
    play: playAudio,
    pause: pauseAudio,
  } = useAudioTimeline(audio, source);
  useEffect(() => {
    const element = audio.current;
    return () => {
      if (element) releaseMedia(element);
    };
  }, []);
  useEffect(() => {
    if (source && audio.current) void playAudio().catch((e) => setError(e));
  }, [source, playAudio]);
  const play = async () => {
    setError(undefined);
    try {
      if (!source) {
        const v: unknown = await load({
          id: file.id,
          purpose: "preview",
        }).unwrap();
        setSource(
          typeof v === "string"
            ? v
            : v && typeof v === "object" && "url" in v
              ? String(v.url)
              : undefined,
        );
      } else if (audio.current) {
        if (playing) pauseAudio();
        else await playAudio();
      }
    } catch (e) {
      setError(e);
    }
  };
  const speedControl = (
    <TextField
      select
      value={speed}
      onChange={(e) => {
        const v = Number(e.target.value);
        setSpeed(v);
        if (audio.current) audio.current.playbackRate = v;
      }}
      size="small"
      slotProps={{
        select: { "aria-label": `Tốc độ audio ${label}` },
      }}
      sx={{
        width: submission ? 52 : 68,
        flexShrink: 0,
        "& .MuiInputBase-root": {
          height: submission ? 28 : undefined,
          color: submission ? "inherit" : undefined,
        },
        "& fieldset": { border: 0 },
        "& .MuiSelect-select": { fontSize: 12, p: 0.5 },
      }}
    >
      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((v) => (
        <MenuItem key={v} value={v}>
          {v}x
        </MenuItem>
      ))}
    </TextField>
  );
  return (
    <Box
      sx={{
        p: 1.75,
        bgcolor: submission ? "var(--a-recording-bg)" : "var(--post-soft)",
        color: submission ? "var(--a-recording-fg)" : undefined,
        borderRadius: "14px",
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <IconButton
          aria-label={`${playing ? "Tạm dừng" : "Phát"} ${label}`}
          disabled={state.isFetching}
          onClick={() => void play()}
          sx={{
            width: 44,
            height: 44,
            bgcolor: submission
              ? "var(--a-recording-accent)"
              : "var(--post-green)",
            color: submission ? "var(--a-recording-bg)" : "var(--post-surface)",
            "&:hover": {
              bgcolor: submission
                ? "var(--a-recording-accent)"
                : "var(--post-green)",
              opacity: 0.85,
            },
          }}
        >
          {playing ? <Pause /> : <PlayArrow />}
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{ fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" }}
          >
            {label}
          </Typography>
          <Stack
            direction={submission ? "column" : "row"}
            sx={{ alignItems: submission ? "stretch" : "center" }}
            spacing={submission ? 0 : 1}
          >
            <Slider
              size="small"
              aria-label={`Tua ${label}`}
              value={Math.min(current, duration || current)}
              min={0}
              max={duration || Math.max(current, 1)}
              disabled={!duration}
              onChange={(_, v) => {
                if (audio.current && typeof v === "number") {
                  audio.current.currentTime = v;
                }
              }}
              sx={{
                color: submission
                  ? "var(--a-recording-accent)"
                  : "var(--post-green)",
                p: "12px 0",
              }}
            />
            <Stack
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Typography
                sx={{
                  fontSize: 10,
                  color: submission ? "inherit" : "var(--post-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {time(current)} / {duration ? time(duration) : "--:--"}
              </Typography>
              {submission && speedControl}
            </Stack>
          </Stack>
        </Box>
        {!submission && speedControl}
      </Stack>
      <audio
        ref={audio}
        preload="none"
        src={source}
        onLoadedMetadata={() => {
          if (audio.current) {
            audio.current.playbackRate = speed;
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setError(new Error("Không phát được audio."))}
      />
      <Feedback loading={state.isFetching} error={error} />
    </Box>
  );
}
