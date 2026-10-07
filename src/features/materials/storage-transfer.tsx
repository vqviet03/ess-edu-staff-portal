"use client";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useStoragesQuery } from "@/api/library-api";
import { useMoveStorageFilesMutation } from "@/api/storage-api";
import { Feedback } from "@/shared/ui";
import { publicId } from "@/shared/public-id";
import { useUnsaved } from "@/shared/unsaved";
import type { MaterialFile } from "./models";
import { bytes } from "./utils";
export function StorageTransferDialog({ files, close, saved }: { files: MaterialFile[]; close: () => void; saved: () => void }) {
  const q = useStoragesQuery(), [target, setTarget] = useState(""), [reason, setReason] = useState(""), [move, state] = useMoveStorageFilesMutation();
  useUnsaved(Boolean(target || reason));
  const drives = q.currentData?.items ?? [], categories = new Set(files.map(f => drives.find(s => s.id === f.storageId)?.category)),
    targets = drives.filter(s => (s.lifecycle ?? "ACTIVE") === "ACTIVE" && s.configured !== false && !files.some(f => f.storageId === s.id) && categories.size === 1 && categories.has(s.category)),
    size = files.reduce((n, f) => n + (f.storageBytes ?? f.sizeBytes + (f.thumbnailBytes ?? 0)), 0), destination = targets.find(s => s.id === target);
  const tryClose = () => { if (!(target || reason) || window.confirm("Bạn có thao tác chuyển chưa gửi. Đóng và bỏ thay đổi?")) close(); };
  return <Dialog open fullWidth maxWidth="sm" onClose={() => !state.isLoading && tryClose()}><DialogTitle>Chuyển file sang ổ khác</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
    <Feedback loading={q.isLoading} error={q.error ?? state.error} retry={() => void q.refetch()} />
    <Typography>{files.length} file · {bytes(size)}, gồm thumbnail</Typography>
    {files.map(f => <Typography key={f.id} variant="body2">{publicId(f.publicId)} · {f.displayName}</Typography>)}
    <TextField select label="Ổ đích cùng nhóm" value={target} onChange={e => setTarget(e.target.value)}>{targets.map(s => <MenuItem key={s.id} value={s.id}>{s.name ?? s.id} · Còn {bytes(s.remainingBytes)}</MenuItem>)}</TextField>
    {!q.isLoading && !targets.length && <Alert severity="warning">Cần ổ đích đang hoạt động, cùng nhóm với tất cả file đã chọn. Anh có thể thêm ổ tại Storage.</Alert>}
    {destination && size > destination.remainingBytes && <Alert severity="error">Ổ đích không đủ dung lượng.</Alert>}
    <TextField label="Lý do chuyển" value={reason} onChange={e => setReason(e.target.value)} required multiline />
    <Alert severity="info">Giữ nguyên mã tài liệu, tác giả và liên kết bài đăng. File vẫn sử dụng được trong lúc chuyển; tác vụ xác minh bản đích rồi mới dọn nguồn. Có thể phải chờ lượt upload trước đó hết hạn.</Alert>
  </Stack></DialogContent><DialogActions><Button disabled={state.isLoading} onClick={tryClose}>Hủy</Button><Button variant="contained" disabled={state.isLoading || !destination || size > destination.remainingBytes || !reason.trim() || files.length > 50} onClick={async () => { if (!window.confirm(`Chuyển ${files.length} file sang ${destination?.name ?? target}?`)) return; try { await move({ targetStorageId: target, ids: files.map(f => f.id), versions: Object.fromEntries(files.map(f => [f.id, f.version])), reason }).unwrap(); saved(); } catch {} }}>Xác nhận chuyển</Button></DialogActions></Dialog>;
}
