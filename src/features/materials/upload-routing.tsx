"use client";
import { useState } from "react";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import {
  useUploadSettingsQuery,
  useSaveUploadRouteMutation,
} from "@/api/library-api";
import { Feedback } from "@/shared/ui";
import { useUnsaved } from "@/shared/unsaved";
export const uploadKindLabels: Record<string, string> = {
  all: "Tất cả",
  image: "Ảnh",
  audio: "Âm thanh",
  video: "Video",
  pdf: "PDF",
  document: "Tài liệu",
  other: "Khác",
};
export function UploadRouting() {
  const q = useUploadSettingsQuery(),
    [save, state] = useSaveUploadRouteMutation(),
    [source, setSource] = useState("comment"),
    [kind, setKind] = useState("all"),
    [storage, setStorage] = useState(""),
    [dirty, setDirty] = useState(false);
  useUnsaved(dirty);
  const current = q.currentData?.routes?.find(
    (r) => r.source === source && r.fileType === kind,
  );
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Ổ nhận upload mặc định</Typography>
        <Typography variant="body2">
          File bình luận tự vào External source theo loại file. Quy tắc từng
          loại ưu tiên hơn quy tắc Tất cả.
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="Nguồn"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setStorage("");
            }}
            sx={{ minWidth: 180 }}
          >
            {[
              ["comment", "Bình luận"],
              ["session", "Phiên học"],
              ["library", "Kho tài liệu"],
            ].map(([v, l]) => (
              <MenuItem key={v} value={v}>
                {l}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Loại file"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setStorage("");
            }}
            sx={{ minWidth: 160 }}
          >
            {[
              ["all", "Tất cả"],
              ["image", "Ảnh"],
              ["audio", "Âm thanh"],
              ["video", "Video"],
              ["pdf", "PDF"],
              ["document", "Văn bản"],
              ["other", "Khác"],
            ].map(([v, l]) => (
              <MenuItem key={v} value={v}>
                {l}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Ổ nhận"
            value={storage || current?.storageId || ""}
            onChange={(e) => {
              setStorage(e.target.value);
              setDirty(true);
            }}
            sx={{ minWidth: 220 }}
          >
            {q.currentData?.storages?.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={state.isLoading || !(storage || current?.storageId)}
            onClick={async () => {
              if (!window.confirm("Đổi ổ mặc định cho các lượt upload mới? File cũ giữ nguyên.")) return;
              try {
                await save({source,fileType:kind,storageId:storage || current!.storageId,version:current?.version ?? 1}).unwrap();
                setDirty(false);
              } catch { /* Keep the selection for retry. */ }
            }}
          >
            Lưu
          </Button>
        </Stack>
        <Feedback
          loading={q.isLoading}
          error={q.error || state.error}
          retry={() => void q.refetch()}
        />
        {state.isSuccess && <Alert severity="success">Đã lưu quy tắc.</Alert>}
      </Stack>
    </Paper>
  );
}
