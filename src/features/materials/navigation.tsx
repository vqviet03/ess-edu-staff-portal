"use client";
import Link from "next/link";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { libraryApi } from "@/api/library-api";
export function LibraryNavigation() {
  const q = libraryApi.endpoints.notifications.useQueryState({});
  return (
    <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
      <Button component={Link} href="/materials/">
        Kho tài liệu
      </Button>
      <Button component={Link} href="/notifications/">
        Thông báo{q.data?.unreadCount ? ` (${q.data.unreadCount})` : ""}
      </Button>
      <Button component={Link} href="/deletion-requests/">
        Yêu cầu xóa
      </Button>
    </Stack>
  );
}
