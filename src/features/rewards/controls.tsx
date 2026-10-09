"use client";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Rating, { type RatingProps } from "@mui/material/Rating";
import Tooltip from "@mui/material/Tooltip";
import { rewardTint } from "./design";

export function RewardIcon({
  name,
}: {
  name: "save" | "note" | "detail" | "trash";
}) {
  const url = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/rewards/${name}.svg`;
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        width: 20,
        height: 20,
        display: "block",
        bgcolor: "currentColor",
        mask: `url(${url}) center / contain no-repeat`,
      }}
    />
  );
}
export function RewardIconAction({
  label,
  icon,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip title={label}>
      <span style={{ display: "inline-flex" }}>
        <IconButton
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          sx={{
            width: 44,
            height: 44,
            borderRadius: "10px",
            bgcolor: rewardTint,
            color: "primary.main",
            "&:hover": { bgcolor: "action.selected" },
            "&.Mui-disabled": {
              opacity: 0.35,
              color: "primary.main",
              bgcolor: rewardTint,
            },
          }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}
export function TrophyRating(props: RatingProps) {
  const trophy = (
    <Box component="span" aria-hidden sx={{ fontSize: 24, lineHeight: 1.45 }}>
      🏆
    </Box>
  );
  return (
    <Rating
      {...props}
      max={5}
      icon={trophy}
      emptyIcon={trophy}
      getLabelText={(v) => `${v} cúp`}
      sx={{
        gap: "5px",
        "& .MuiRating-iconEmpty": { opacity: 0.24 },
        "& .MuiRating-icon": { width: 30 },
        "& .MuiRating-label": { minHeight: 44, alignItems: "center" },
        "& .MuiRating-iconFocus": { outline: "2px solid", outlineOffset: 2 },
      }}
    />
  );
}
