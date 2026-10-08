"use client";
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import Favorite from "@mui/icons-material/Favorite";
import ThumbUp from "@mui/icons-material/ThumbUp";
import ThumbUpOutlined from "@mui/icons-material/ThumbUpOutlined";
import Celebration from "@mui/icons-material/Celebration";
import CelebrationOutlined from "@mui/icons-material/CelebrationOutlined";
import type { Reaction } from "./models";
export const reactionLabels: Record<Reaction, string> = {
  LIKE: "Thích",
  LOVE: "Yêu thích",
  CELEBRATE: "Tuyệt vời",
};
const colors: Record<Reaction, string> = {
  LIKE: "#5397e5",
  LOVE: "#e76a91",
  CELEBRATE: "#d69b24",
};
export function ReactionIcon({
  value,
  active = true,
}: {
  value: Reaction;
  active?: boolean;
}) {
  const Icon =
    value === "LIKE"
      ? active
        ? ThumbUp
        : ThumbUpOutlined
      : value === "LOVE"
        ? active
          ? Favorite
          : FavoriteBorder
        : active
          ? Celebration
          : CelebrationOutlined;
  return <Icon fontSize="small" />;
}
export function ReactionCounts({
  counts,
}: {
  counts: { reaction: Reaction; count: number }[];
}) {
  return (
    <Stack
      direction="row"
      sx={{ gap: 1.5, alignItems: "center", flexWrap: "wrap" }}
    >
      {(Object.keys(reactionLabels) as Reaction[]).map((value) => (
        <Tooltip key={value} title={reactionLabels[value]}>
          <Stack
            direction="row"
            aria-label={`${reactionLabels[value]}: ${counts.find((r) => r.reaction === value)?.count ?? 0}`}
            sx={{ alignItems: "center", gap: 0.5, color: colors[value] }}
          >
            <ReactionIcon value={value} />
            <Typography
              component="span"
              sx={{ fontSize: 12, color: "var(--post-muted)" }}
            >
              {counts.find((r) => r.reaction === value)?.count ?? 0}
            </Typography>
          </Stack>
        </Tooltip>
      ))}
    </Stack>
  );
}
export function ReactionButton({
  value,
  disabled,
  onChange,
}: {
  value: Reaction | null;
  disabled: boolean;
  onChange: (value: Reaction) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null),
    [holding, setHolding] = useState(false);
  const button = useRef<HTMLButtonElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    suppressed = useRef(false),
    start = useRef({ x: 0, y: 0 });
  const selected = value ?? "LIKE";
  function cancel() {
    clearTimeout(timer.current);
    timer.current = undefined;
    setHolding(false);
  }
  function open() {
    cancel();
    suppressed.current = true;
    setAnchor(button.current);
    try {
      navigator.vibrate?.(12);
    } catch {
      /* Optional touch feedback. */
    }
  }
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (disabled) {
      clearTimeout(timer.current);
    }
  }, [disabled]);
  return (
    <>
      <Tooltip
        title={`${reactionLabels[selected]} · Nhấn giữ để chọn tương tác; dùng phím mũi tên xuống để mở`}
      >
        <span style={{ display: "flex", flex: 1 }}>
          <IconButton
            ref={button}
            size="small"
            aria-label={reactionLabels[selected]}
            aria-pressed={!!value}
            aria-haspopup="menu"
            aria-expanded={!!anchor}
            disabled={disabled}
            data-holding={holding}
            onPointerDown={(e) => {
              if (e.button !== 0 || disabled) return;
              suppressed.current = false;
              start.current = { x: e.clientX, y: e.clientY };
              setHolding(true);
              timer.current = setTimeout(open, 450);
            }}
            onPointerMove={(e) => {
              if (
                Math.hypot(
                  e.clientX - start.current.x,
                  e.clientY - start.current.y,
                ) > 10 &&
                timer.current
              ) {
                suppressed.current = true;
                cancel();
              }
            }}
            onPointerUp={cancel}
            onPointerCancel={() => {
              suppressed.current = true;
              cancel();
            }}
            onPointerLeave={() => {
              if (timer.current) suppressed.current = true;
              cancel();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (!disabled) open();
            }}
            onKeyDown={(e) => {
              if (
                e.key === "ArrowDown" ||
                e.key === "ContextMenu" ||
                (e.key === "F10" && e.shiftKey)
              ) {
                e.preventDefault();
                if (!disabled) open();
              }
            }}
            onClick={() => {
              cancel();
              if (suppressed.current) {
                suppressed.current = false;
                return;
              }
              onChange(selected);
            }}
            sx={{
              flex: 1,
              borderRadius: 2,
              color: value ? colors[selected] : "var(--post-muted)",
              bgcolor: value || holding ? "var(--post-tint)" : undefined,
              touchAction: "pan-y",
              userSelect: "none",
              WebkitTouchCallout: "none",
              transform: holding ? "scale(.94)" : "none",
              transition: "transform .15s, background-color .15s",
              outline: holding ? "2px solid var(--post-green)" : "none",
              outlineOffset: holding ? 2 : 0,
              "@media (prefers-reduced-motion: reduce)": { transition: "none" },
            }}
          >
            <ReactionIcon value={selected} active={!!value} />
          </IconButton>
        </span>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => {
          setAnchor(null);
          suppressed.current = false;
        }}
        slotProps={{
          list: {
            "aria-label": "Chọn tương tác",
            sx: { display: "flex", gap: 0.5, p: 0.5 },
          },
        }}
      >
        {(Object.keys(reactionLabels) as Reaction[]).map((reaction) => (
          <Tooltip key={reaction} title={reactionLabels[reaction]}>
            <MenuItem
              aria-label={`Chọn ${reactionLabels[reaction]}`}
              selected={value === reaction}
              sx={{
                color: colors[reaction],
                borderRadius: 2,
                minWidth: 36,
                minHeight: 36,
                justifyContent: "center",
              }}
              onClick={() => {
                setAnchor(null);
                suppressed.current = false;
                onChange(reaction);
              }}
            >
              <ReactionIcon value={reaction} />
            </MenuItem>
          </Tooltip>
        ))}
      </Menu>
      <Box
        component="span"
        sx={{
          position: "absolute",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          clipPath: "inset(50%)",
        }}
        aria-live="polite"
      >
        {anchor ? "Chọn loại tương tác" : ""}
      </Box>
    </>
  );
}
