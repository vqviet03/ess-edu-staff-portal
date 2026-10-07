"use client";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useDeleteFileMutation, useDeletionImpactQuery } from "@/api/library-api";
import { Feedback, NavButton } from "@/shared/ui";
import { bytes } from "./utils";
export function DeleteMaterialDialog({ id, close, deleted }: { id: string; close: () => void; deleted: () => void }) {
  const q = useDeletionImpactQuery(id), [remove, state] = useDeleteFileMutation(), [reason, setReason] = useState(""), [confirmed, setConfirmed] = useState(false), [linkAction, setLinkAction] = useState<"KEEP_UNAVAILABLE" | "DETACH">("DETACH");
  return <Dialog open onClose={state.isLoading ? undefined : close} fullWidth>
    <DialogTitle>Xóa tài liệu khỏi storage</DialogTitle>
    <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
      <Feedback loading={q.isLoading} error={q.error || state.error} retry={() => void q.refetch()} />
      {q.currentData && <>
        <Typography sx={{ fontWeight: 700 }}>{q.currentData.file.displayName}</Typography>
        <Typography>File: {bytes(q.currentData.file.sizeBytes)} · Thumbnail: {bytes(q.currentData.file.thumbnailBytes ?? 0)} · Tổng: {bytes(q.currentData.file.storageBytes ?? q.currentData.file.sizeBytes)}</Typography>
        <Typography>{q.currentData.usages.length} bài đăng đang sử dụng:</Typography>
        {q.currentData.usages.map(p => <NavButton key={p.id} href={`/session/?classId=${p.classId}&sessionId=${p.sessionId}`}>{p.title}</NavButton>)}
        <TextField select label="Xử lý liên kết" value={linkAction} onChange={e => setLinkAction(e.target.value as typeof linkAction)}><MenuItem value="DETACH">Gỡ file khỏi bài đăng, giữ nhật ký</MenuItem><MenuItem value="KEEP_UNAVAILABLE">Giữ liên kết, báo tài liệu không còn khả dụng</MenuItem></TextField>
        <TextField label="Lý do xóa" value={reason} onChange={e => setReason(e.target.value)} required multiline slotProps={{ htmlInput: { maxLength: 2000 } }} />
        <Alert severity="warning">File gốc và thumbnail sẽ bị xóa thật bởi server. Hồ sơ và nhật ký được giữ. File được ẩn ngay; dung lượng được giải phóng sau khi xóa thành công. Lượt vừa upload có thể chờ tối đa 10 phút để liên kết upload hết hạn.</Alert>
        <FormControlLabel control={<Checkbox checked={confirmed} onChange={(_, v) => setConfirmed(v)} />} label="Tôi đã kiểm tra ảnh hưởng và đồng ý xóa file thật" />
      </>}
    </Stack></DialogContent>
    <DialogActions><Button onClick={close} disabled={state.isLoading}>Hủy</Button><Button color="error" variant="contained" loading={state.isLoading} disabled={!q.currentData || !confirmed || !reason.trim()} onClick={async () => { if (!q.currentData) return; try { await remove({ id, version: q.currentData.file.version, reason, linkAction }).unwrap(); deleted(); } catch {} }}>Xác nhận xóa</Button></DialogActions>
  </Dialog>;
}
