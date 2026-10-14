"use client";
import Link from "next/link";
import ArrowBack from "@mui/icons-material/ArrowBack";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { usePageBack } from "./page-navigation";
export function BackAction({
  fallback = "/home/",
  label = "Quay lại",
}: {
  fallback?: string;
  label?: string;
}) {
  const back = usePageBack(fallback);
  return (
    <Tooltip title={label}>
      <IconButton
        data-navigation-back
        component={Link}
        href={fallback}
        aria-label={label}
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
