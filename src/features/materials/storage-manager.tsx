"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { useStoragesQuery } from "@/api/library-api";
import { useSaveStorageMutation, useProbeStorageMutation, useDeactivateStorageMutation, useTransfersQuery, useRetryTransferMutation, useCancelTransferMutation } from "@/api/storage-api";
import { useWorkspace } from "@/features/access/hooks";
import { Feedback, Title } from "@/shared/ui";
import { useUnsaved } from "@/shared/unsaved";
import { stageConnection, type StorageConnection } from "./storage-connections";
import type { Area, Storage } from "./models";
import { areaLabels, bytes } from "./utils";
import { MaterialBrowser } from "./browser";
const blankConnection = (): StorageConnection => ({ endpoint: "", region: "ap-southeast-1", bucket: "", accessKeyId: "", secretAccessKey: "" });
const usageLabels: Record<string, string> = { LOW: "Còn nhiều chỗ", NORMAL: "Bình thường", WATCH: "Cần theo dõi", HIGH: "Gần đầy", CRITICAL: "Sắp hết dung lượng" };
const usageColor = (percent: number): "error" | "warning" | "info" | "primary" | "success" => percent >= 95 ? "error" : percent >= 80 ? "warning" : percent >= 60 ? "info" : percent >= 30 ? "primary" : "success";
const lifecycleLabels = { ACTIVE: "Nhận upload", DRAINING: "Chỉ đọc / chuyển ra", INACTIVE: "Ngừng sử dụng" };
export function StorageManagerPage() {
  const { selected } = useWorkspace(), q = useStoragesQuery(undefined, { skip: selected !== "manager" }), jobs = useTransfersQuery(undefined, { skip: selected !== "manager" }),
    [edit, setEdit] = useState<Storage | null | undefined>(), [view, setView] = useState<Storage | null>(null), [message, setMessage] = useState(""),
    [remove, removal] = useDeactivateStorageMutation(), [retry, retryState] = useRetryTransferMutation(), [cancel, cancelState] = useCancelTransferMutation();
  if (selected !== "manager") return <Feedback error={new Error("Chỉ quản lý được cấu hình storage.")} />;
  return <Stack spacing={2}>
    <Title title="Storage & tài liệu" subtitle="Quản lý từng ổ, kết nối private và dung lượng của file gốc cùng thumbnail." />
    <Stack direction="row" spacing={1}><Button variant="contained" disabled={!q.currentData?.configurationEnabled} onClick={() => setEdit(null)}>Thêm ổ Neon</Button><Button onClick={() => { void q.refetch(); void jobs.refetch(); }}>Làm mới</Button></Stack>
    {q.currentData && !q.currentData.configurationEnabled && <Alert severity="info">Cần bật Secret Manager cho backend một lần để thêm kết nối. Các ổ hiện có tiếp tục dùng cấu hình đang chạy.</Alert>}
    {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
    <Feedback loading={q.isLoading} error={q.error ?? removal.error ?? retryState.error ?? cancelState.error} retry={() => void q.refetch()} />
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))" }, gap: 2 }}>
      {q.currentData?.items.map(s => <Paper key={s.id} sx={{ p: 2.5 }}><Stack spacing={1.5}>
        <Typography variant="h6">{s.name ?? areaLabels[s.id as Area] ?? s.id}</Typography>
        <Typography variant="body2">{s.id} · {areaLabels[s.category ?? s.id as Area] ?? "Tài liệu"}</Typography>
        <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}><Chip label={lifecycleLabels[s.lifecycle ?? "ACTIVE"]} /><Chip color={usageColor(s.percentage)} label={`${usageLabels[s.status] ?? s.status} · ${s.percentage.toFixed(1)}% đã dùng / giữ chỗ`} />{s.configured === false && <Chip label="Chưa có kết nối" color="warning" />}</Stack>
        <LinearProgress variant="determinate" value={Math.min(100, s.percentage)} color={usageColor(s.percentage)} sx={{ height: 8, borderRadius: 4 }} />
        <Typography variant="body2">Quota: {(s.totalBytes / 1e9).toLocaleString("vi-VN")} GB · Đã dùng {bytes(s.usedBytes)} · Giữ chỗ {bytes(s.reservedBytes)} · Còn {bytes(s.remainingBytes)}</Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}><Button onClick={() => setView(s)}>Xem file</Button><Button onClick={() => setEdit(s)}>Cấu hình</Button><Button color="warning" disabled={s.lifecycle === "INACTIVE" || removal.isLoading || s.usedBytes + s.reservedBytes > 0} onClick={async () => { const reason = window.prompt(`Ngừng sử dụng ${s.name ?? s.id}. Giữ lịch sử; không xóa bucket Neon. Nhập lý do:`); if (!reason?.trim()) return; try { await remove({ id: s.id, version: s.version ?? 1, reason }).unwrap(); setMessage("Đã ngừng sử dụng ổ."); } catch {} }}>Ngừng sử dụng</Button></Stack>
      </Stack></Paper>)}
    </Box>
    <Typography variant="body2" color="text.secondary">Quota là giới hạn ứng dụng, cần phù hợp hạn mức Neon thực tế. Neon có thể giữ phiên bản đã xóa theo chính sách lưu giữ của nhà cung cấp.</Typography>
    <Typography variant="h6">Tác vụ chuyển storage (100 lượt gần nhất)</Typography>
    <Feedback loading={jobs.isLoading} error={jobs.error} retry={() => void jobs.refetch()} />
    {!jobs.isLoading && !jobs.error && !jobs.currentData?.items.length && <Feedback empty="Chưa có tác vụ chuyển." />}
    {jobs.currentData?.items.map(j => <Paper key={j.id} sx={{ p: 2 }}><Stack spacing={1}><Typography>{j.filePublicId} · {j.fileName}</Typography><Typography variant="body2">{j.fromStorageId} → {j.toStorageId} · {{ PENDING: j.switched ? "Đang dọn nguồn" : "Đang chờ chuyển", FAILED: "Cần xử lý", DONE: "Hoàn tất", CANCELLED: "Đã hủy" }[j.status]}</Typography>{j.lastError && <Alert severity="warning">{j.lastError} · Bản hiện tại và giữ chỗ được giữ an toàn. Kiểm tra kết nối rồi thử lại.</Alert>}{j.status === "FAILED" && <Stack direction="row"><Button disabled={retryState.isLoading} onClick={() => void retry({ id: j.id, version: j.version })}>Thử lại</Button>{!j.switched && <Button color="warning" disabled={cancelState.isLoading} onClick={() => { const reason = window.prompt("Hủy chuyển, dọn bản đích dở dang và giữ file nguồn. Nhập lý do:"); if (reason?.trim()) void cancel({ id: j.id, version: j.version, reason }); }}>Hủy chuyển</Button>}</Stack>}</Stack></Paper>)}
    {edit !== undefined && <StorageEditor storage={edit} connectionEnabled={q.currentData?.configurationEnabled ?? false} close={() => setEdit(undefined)} saved={() => { setEdit(undefined); setMessage("Đã lưu cấu hình storage."); }} />}
    {view && <Dialog open fullWidth maxWidth="lg" onClose={() => setView(null)}><DialogTitle>File trong {view.name ?? view.id}</DialogTitle><DialogContent><MaterialBrowser storageId={view.id} /></DialogContent><DialogActions><Button onClick={() => setView(null)}>Đóng</Button></DialogActions></Dialog>}
  </Stack>;
}
function StorageEditor({ storage, connectionEnabled, close, saved }: { storage: Storage | null; connectionEnabled: boolean; close: () => void; saved: () => void }) {
  const [code, setCode] = useState(storage?.id ?? ""), [name, setName] = useState(storage?.name ?? ""), [category, setCategory] = useState<Area>(storage?.category ?? storage?.id as Area ?? "DOCUMENTS"),
    [quota, setQuota] = useState(String((storage?.totalBytes ?? 4.5e9) / 1e9)), [status, setStatus] = useState(storage?.lifecycle ?? "ACTIVE"), [reason, setReason] = useState(""),
    [replace, setReplace] = useState(!storage), [connection, setConnection] = useState(blankConnection), [tested, setTested] = useState(false),
    [save, saving] = useSaveStorageMutation(), [probe, probing] = useProbeStorageMutation(), [dirty, setDirty] = useState(false);
  useUnsaved(dirty);
  const busy = saving.isLoading || probing.isLoading, validConnection = Boolean(connection.endpoint && connection.bucket && connection.accessKeyId && connection.secretAccessKey),
    setField = (k: keyof StorageConnection, v: string) => { setConnection(c => ({ ...c, [k]: v })); setDirty(true); setTested(false); };
  const tryClose = () => { if (!dirty || window.confirm("Bạn có cấu hình chưa lưu. Đóng và bỏ thay đổi?")) close(); };
  return <Dialog open fullWidth maxWidth="sm" onClose={() => !busy && tryClose()}><DialogTitle>{storage ? "Cấu hình ổ" : "Thêm ổ Neon"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }} onChange={() => setDirty(true)}>
    <TextField label="Mã ổ công khai" value={code} disabled={!!storage} onChange={e => setCode(e.target.value)} required helperText="3–40 ký tự: chữ, số, dấu . _ -. Mã giữ nguyên để giữ liên kết file." />
    <TextField label="Tên ổ" value={name} onChange={e => setName(e.target.value)} required />
    <TextField select label="Nhóm tài liệu" value={category} onChange={e => setCategory(e.target.value as Area)}>{Object.entries(areaLabels).map(([id, label]) => <MenuItem key={id} value={id}>{label}</MenuItem>)}</TextField>
    <TextField type="number" label="Quota (GB, 1 GB = 1.000.000.000 byte)" value={quota} onChange={e => setQuota(e.target.value)} slotProps={{ htmlInput: { min: 0.001, step: 0.1 } }} required />
    <TextField select label="Trạng thái" value={status} onChange={e => setStatus(e.target.value as typeof status)}>{Object.entries(lifecycleLabels).map(([id, label]) => <MenuItem key={id} value={id}>{label}</MenuItem>)}</TextField>
    {storage && <Button disabled={!connectionEnabled || busy} onClick={() => { setReplace(v => !v); setConnection(blankConnection()); setTested(false); }}> {replace ? "Giữ kết nối đã lưu" : "Thay kết nối / S3 keys"}</Button>}
    {replace && <><Alert severity="info">Tạo bucket private trên Neon, nhánh production. Nhập thông số S3 có quyền storage:write. Không nhập chuỗi PostgreSQL. Không thể xem lại keys đã lưu.</Alert>
      <TextField label="Neon S3 endpoint (HTTPS)" value={connection.endpoint} onChange={e => setField("endpoint", e.target.value.trim())} autoComplete="off" required />
      <TextField select label="Region" value={connection.region} onChange={e => setField("region", e.target.value)}>{["ap-southeast-1", "us-east-1", "us-east-2", "eu-central-1"].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}</TextField>
      <TextField label="Bucket" value={connection.bucket} onChange={e => setField("bucket", e.target.value.trim())} autoComplete="off" required />
      <TextField label="S3 Access Key ID" type="password" value={connection.accessKeyId} onChange={e => setField("accessKeyId", e.target.value.trim())} autoComplete="new-password" required />
      <TextField label="S3 Secret Access Key" type="password" value={connection.secretAccessKey} onChange={e => setField("secretAccessKey", e.target.value.trim())} autoComplete="new-password" required />
      <Button disabled={busy || !validConnection} onClick={async () => { try { await probe({ connectionKey: stageConnection(connection) }).unwrap(); setTested(true); } catch { setTested(false); } finally { setConnection(c => ({ ...c, accessKeyId: "", secretAccessKey: "" })); } }}>Kiểm tra kết nối</Button>
      {tested && <Alert severity="success">Kết nối private hợp lệ. Nhập lại hai keys để lưu; keys kiểm tra đã được xóa khỏi form.</Alert>}
    </>}
    <TextField label="Lý do / nhật ký" value={reason} onChange={e => setReason(e.target.value)} multiline required />
    <Feedback error={saving.error ?? probing.error} />
    {storage && storage.usedBytes + storage.reservedBytes > 0 && <Alert severity="warning">Ổ đang chứa file: không đổi bucket/endpoint, đổi nhóm hoặc ngừng sử dụng. Có thể thay keys cùng bucket hoặc chuyển file sang ổ mới.</Alert>}
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={tryClose}>Đóng</Button><Button variant="contained" disabled={busy || !/^[A-Za-z][A-Za-z0-9_.-]{2,39}$/.test(code) || !name.trim() || !reason.trim() || !Number.isFinite(Number(quota)) || Number(quota) <= 0 || (replace && (!connectionEnabled || !validConnection))} onClick={async () => { try { await save({ id: storage?.id, publicId: code, name, category, capacityBytes: Math.round(Number(quota) * 1e9), status, version: storage?.version ?? 1, reason, connectionKey: replace ? stageConnection(connection) : undefined }).unwrap(); setDirty(false); saved(); } catch {} finally { setConnection(blankConnection()); } }}>Lưu cấu hình</Button></DialogActions></Dialog>;
}
