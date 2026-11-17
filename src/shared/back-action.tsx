"use client";
import Link from "next/link";
import ArrowBack from "@mui/icons-material/ArrowBack";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import type { Theme } from "@mui/material/styles";
import { usePageBack } from "./page-navigation";
/** Tinted square used for Back everywhere (matches the assignment design). */
const backButtonSx = (theme: Theme) => {
  const dark = theme.palette.mode === "dark";
  return {
    width: 40,
    height: 40,
    minWidth: 40,
    flexShrink: 0,
    borderRadius: "12px",
    color: dark ? "#9dd5b6" : "#2b7c59",
    bgcolor: dark ? "#284737" : "#e2f1e7",
    "&:hover": { bgcolor: dark ? "#31553f" : "#d3eadb" },
  };
};
export function BackAction({
  fallback = "/home/",
  label = "Quay lại",
  focusable = true,
}: {
  fallback?: string;
  label?: string;
  /** `false` hides a duplicate (the floating copy) from keyboard and readers. */
  focusable?: boolean;
}) {
  const back = usePageBack(fallback);
  return (
    <Tooltip title={label}>
      <IconButton
        data-navigation-back
        component={Link}
        href={fallback}
        aria-label={label}
        tabIndex={focusable ? undefined : -1}
        aria-hidden={focusable ? undefined : true}
        sx={backButtonSx}
        onClick={(e) => {
          if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            back();
          }
        }}
      >
        <ArrowBack fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
