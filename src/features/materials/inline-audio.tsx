"use client";
import { useRef, useState } from "react";
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
export function InlineAudio({ file }: { file: MaterialFile }) {
  const audio = useRef<HTMLAudioElement>(null),
    [source, setSource] = useState<string>(),
    [playing, setPlaying] = useState(false),
    [current, setCurrent] = useState(0),
    [duration, setDuration] = useState(0),
    [speed, setSpeed] = useState(1),
    [error, setError] = useState<unknown>(),
    [load, state] = useLazyContentQuery();
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
        if (playing) audio.current.pause();
        else await audio.current.play();
      }
    } catch (e) {
      setError(e);
    }
  };
  return (
    <Box sx={{ p: 1.75, bgcolor: "var(--post-soft)", borderRadius: "14px" }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <IconButton
          aria-label={`${playing ? "Tạm dừng" : "Phát"} ${file.displayName}`}
          disabled={state.isFetching}
          onClick={() => void play()}
          sx={{
            width: 44,
            height: 44,
            bgcolor: "var(--post-green)",
            color: "var(--post-surface)",
            "&:hover": { bgcolor: "var(--post-green)", opacity: 0.85 },
          }}
        >
          {playing ? <Pause /> : <PlayArrow />}
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{ fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" }}
          >
            {file.displayName}
          </Typography>
          <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
            <Slider
              size="small"
              aria-label={`Tua ${file.displayName}`}
              value={current}
              min={0}
              max={duration || 1}
              disabled={!duration}
              onChange={(_, v) => {
                if (audio.current && typeof v === "number") {
                  audio.current.currentTime = v;
                  setCurrent(v);
                }
              }}
              sx={{ color: "var(--post-green)", p: "12px 0" }}
            />
            <Typography
              sx={{
                fontSize: 10,
                color: "var(--post-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {time(current)} / {time(duration)}
            </Typography>
          </Stack>
        </Box>
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
            select: { "aria-label": `Tốc độ audio ${file.displayName}` },
          }}
          sx={{
            width: 68,
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
      </Stack>
      <audio
        ref={audio}
        src={source}
        onLoadedMetadata={() => {
          if (audio.current) {
            setDuration(
              Number.isFinite(audio.current.duration)
                ? audio.current.duration
                : 0,
            );
            audio.current.playbackRate = speed;
            void audio.current.play().catch((e) => setError(e));
          }
        }}
        onTimeUpdate={() => setCurrent(audio.current?.currentTime ?? 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setError(new Error("Không phát được audio."))}
      />
      <Feedback loading={state.isFetching} error={error} />
    </Box>
  );
}
