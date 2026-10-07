"use client";
import { useEffect, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import {
  useUploadSettingsQuery,
  useInitiateUploadMutation,
  useTransferUploadMutation,
  useCancelUploadMutation,
} from "@/api/library-api";
import { Feedback } from "@/shared/ui";
import { errorMessage } from "@/api/base-query";
import { useUnsaved } from "@/shared/unsaved";
import { areaLabels, bytes, defaultArea, validateUpload } from "./utils";
import { uploadBuffers } from "./upload-transport";
import type { MaterialFile, UploadTicket } from "./models";
function ticketExpired(value: string) {
  return Date.parse(value) <= Date.now();
}
interface Row {
  key: string;
  file: File;
  area: string;
  progress: number;
  status: "WAITING" | "UPLOADING" | "DONE" | "ERROR" | "CANCELLED";
  error?: string;
  ticket?: UploadTicket;
}
async function thumbnail(file: File) {
  if (file.type === "application/pdf")
    return (await import("./pdf-viewer")).pdfThumbnail(file);
  if (!file.type.startsWith("image/")) return null;
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas
      .getContext("2d")
      ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/webp", 0.75),
    );
  } finally {
    bitmap.close();
  }
}
export function UploadDialog({
  folderId,
  sessionId,
  close,
  added,
}: {
  folderId: string | null;
  sessionId?: string;
  close: () => void;
  added?: (f: MaterialFile) => void;
}) {
  const settings = useUploadSettingsQuery(),
    [rows, setRows] = useState<Row[]>([]),
    [initiate] = useInitiateUploadMutation(),
    [transfer] = useTransferUploadMutation(),
    [cancel] = useCancelUploadMutation(),
    active = useRef(new Map<string, { abort: () => void }>()),
    cancelled = useRef(new Set<string>()),
    tickets = useRef(new Map<string, UploadTicket>()),
    [busy, setBusy] = useState(false),
    mounted = useRef(true);
  const drives = settings.data?.storages ?? Object.entries(areaLabels).map(([id, name]) => ({ id, name, category: id }));
  const initialDrive = (mime: string) => drives.find(s => s.category === defaultArea(mime))?.id ?? defaultArea(mime);
  useUnsaved(
    rows.some((r) => r.status === "WAITING" || r.status === "UPLOADING"),
  );
  useEffect(() => {
    mounted.current = true;
    const tasks = active.current;
    return () => {
      mounted.current = false;
      tasks.forEach((t) => t.abort());
    };
  }, []);
  const patch = (key: string, data: Partial<Row>) => {
    if (mounted.current)
      setRows((old) => old.map((r) => (r.key === key ? { ...r, ...data } : r)));
  };
  const run = async (row: Row) => {
    const error = validateUpload(
      row.file,
      settings.currentData?.maxUploadBytes ?? 0,
    );
    if (error) {
      patch(row.key, { status: "ERROR", error });
      return;
    }
    cancelled.current.delete(row.key);
    patch(row.key, { status: "UPLOADING", error: undefined, progress: 0 });
    let ticket = row.ticket;
    try {
      const thumb = await thumbnail(row.file).catch(() => null);
      uploadBuffers.set(row.key, {
        file: row.file,
        thumbnail: thumb,
        progress: (p) => patch(row.key, { progress: p }),
      });
      if (!ticket || ticketExpired(ticket.expiresAt)) {
        const begin = initiate({
          originalName: row.file.name,
          mimeType: row.file.type || "application/octet-stream",
          sizeBytes: row.file.size,
          storageId: row.area,
          folderId,
          uploadSource: sessionId ? "session" : "library",
          sourceSessionId: sessionId,
          thumbnailMime: thumb?.type,
          thumbnailBytes: thumb?.size ?? 0,
        });
        active.current.set(row.key, begin);
        ticket = await begin.unwrap();
        tickets.current.set(row.key, ticket);
        patch(row.key, { ticket });
      }
      if (cancelled.current.has(row.key) || !mounted.current) {
        await cancel({
          uploadId: ticket.uploadId,
          version: ticket.version,
        }).unwrap();
        return;
      }
      const task = transfer({ key: row.key, ticket });
      active.current.set(row.key, task);
      const file = await task.unwrap();
      if (cancelled.current.has(row.key)) return;
      patch(row.key, { status: "DONE", progress: 100 });
      added?.(file);
    } catch (e) {
      if (!cancelled.current.has(row.key))
        patch(row.key, { status: "ERROR", error: errorMessage(e) });
    } finally {
      active.current.delete(row.key);
      uploadBuffers.delete(row.key);
    }
  };
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) close();
      }}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        Upload {sessionId ? "vào phiên học" : "vào kho"}
      </DialogTitle>
      <DialogContent>
        <Feedback
          loading={settings.isLoading}
          error={settings.error}
          retry={() => void settings.refetch()}
        />
        <Stack spacing={2}>
          {settings.currentData && (
            <>
              <Typography variant="body2">
                Tối đa {bytes(settings.currentData.maxUploadBytes)}/file. Ảnh và
                audio tự chọn storage tương ứng.
              </Typography>
              <Button component="label" variant="outlined" disabled={busy}>
                Chọn nhiều file
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => {
                    const chosen = Array.from(e.target.files ?? []).map(
                      (file) => ({
                        key: crypto.randomUUID(),
                        file,
                        area: initialDrive(file.type),
                        progress: 0,
                        status: "WAITING" as const,
                      }),
                    );
                    setRows((r) => [...r, ...chosen]);
                    e.target.value = "";
                  }}
                />
              </Button>
            </>
          )}
          {rows.map((row) => (
            <Stack
              key={row.key}
              spacing={1}
              sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2 }}
            >
              <Typography sx={{ overflowWrap: "anywhere" }}>
                {row.file.name} · {bytes(row.file.size)}
              </Typography>
              {row.file.size >
                (settings.currentData?.largeFileWarningBytes ?? Infinity) && (
                <Alert severity="warning">
                  File lớn, thời gian tải có thể lâu.
                </Alert>
              )}
              <TextField
                select
                label="Nhóm storage"
                value={row.area}
                disabled={row.status !== "WAITING"}
                onChange={(e) =>
                  patch(row.key, { area: e.target.value })
                }
              >
                {drives.filter(s => (!row.file.type.startsWith("image/") && !row.file.type.startsWith("audio/")) || s.category === defaultArea(row.file.type)).map(s => <MenuItem key={s.id} value={s.id}>{s.name} ({s.id})</MenuItem>)}
              </TextField>
              <LinearProgress variant="determinate" value={row.progress} />
              <Typography variant="caption">
                {row.status === "DONE"
                  ? "Đã tải và xác minh"
                  : row.status === "UPLOADING"
                    ? `${row.progress}%`
                    : row.status === "CANCELLED"
                      ? "Đã hủy"
                      : "Chưa hoàn tất"}
              </Typography>
              {row.error && <Alert severity="error">{row.error}</Alert>}
              <Stack direction="row">
                {row.status === "ERROR" && (
                  <Button disabled={busy} onClick={() => void run(row)}>
                    Thử lại
                  </Button>
                )}
                {row.status !== "DONE" && row.status !== "CANCELLED" && (
                  <Button
                    onClick={async () => {
                      cancelled.current.add(row.key);
                      active.current.get(row.key)?.abort();
                      const ticket = row.ticket ?? tickets.current.get(row.key);
                      if (ticket)
                        try {
                          await cancel({
                            uploadId: ticket.uploadId,
                            version: ticket.version,
                          }).unwrap();
                          patch(row.key, {
                            status: "CANCELLED",
                            error: undefined,
                          });
                        } catch (e) {
                          patch(row.key, {
                            status: "ERROR",
                            error: errorMessage(e),
                          });
                        }
                      else setRows((r) => r.filter((x) => x.key !== row.key));
                    }}
                  >
                    Hủy file
                  </Button>
                )}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={close}>
          Đóng
        </Button>
        <Button
          variant="contained"
          disabled={
            busy ||
            !settings.currentData ||
            !rows.some((r) => r.status === "WAITING")
          }
          onClick={async () => {
            setBusy(true);
            try {
              for (const r of rows.filter((r) => r.status === "WAITING"))
                await run(r);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Đang tải…" : "Tải các file đã chọn"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
