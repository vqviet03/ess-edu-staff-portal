"use client";
import Link from "next/link";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Badge from "@mui/material/Badge";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import NotificationsNone from "@mui/icons-material/NotificationsNone";
import DeleteOutline from "@mui/icons-material/DeleteOutlined";
import Stack from "@mui/material/Stack";
import { libraryApi } from "@/api/library-api";
export function LibraryNavigation() {
  const q = libraryApi.endpoints.notifications.useQueryState({});
  return <Stack direction="row" spacing={.25}>
    <Tooltip title="Kho tài liệu"><IconButton component={Link} href="/materials/" aria-label="Kho tài liệu"><FolderOutlined /></IconButton></Tooltip>
    <Tooltip title="Thông báo"><IconButton component={Link} href="/notifications/" aria-label="Thông báo"><Badge badgeContent={q.data?.unreadCount ?? 0} color="error"><NotificationsNone /></Badge></IconButton></Tooltip>
    <Tooltip title="Yêu cầu xóa"><IconButton component={Link} href="/deletion-requests/" aria-label="Yêu cầu xóa"><DeleteOutline /></IconButton></Tooltip>
  </Stack>;
}
