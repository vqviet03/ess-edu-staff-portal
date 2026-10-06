"use client";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useStorageAlertsQuery } from "@/api/library-api";
import { useWorkspace } from "@/features/access/hooks";
export function StorageNotice() {
  const { selected } = useWorkspace(),
    q = useStorageAlertsQuery(undefined, {
      skip: selected !== "manager",
      pollingInterval: 30000,
    });
  return q.currentData?.items.length ? (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
      action={
        <Button component={Link} href="/storages/">
          Xem storage
        </Button>
      }
    >
      {q.currentData.items.length} storage gần đầy hoặc sắp hết dung lượng.
    </Alert>
  ) : null;
}
