"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Pagination from "@mui/material/Pagination";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useAccountSessionPolicyQuery, useAccountLoginHistoryQuery, useUpdateSessionPolicyMutation, useRevokeAccountSessionsMutation } from "@/api/management-api";
import { Card, Feedback } from "@/shared/ui";
import { confirmLeave, useUnsaved } from "@/shared/unsaved";
import { durationLabels, durationText, emptyDuration, minutesToDuration, sessionExpiry } from "./session-duration";
import type { SessionDuration } from "./session-duration";
import type { AccountSessionPolicy } from "./models";

const durationSchema = z.object({ years: z.number(), months: z.number(), days: z.number(), hours: z.number(), minutes: z.number() });
function schemaFor(at: string) {
  return z.object({ useDefault: z.boolean(), duration: durationSchema, reason: z.string().trim().min(1, "Nhập lý do thay đổi.").max(500, "Tối đa 500 ký tự.") }).superRefine((v, ctx) => {
    if (!v.useDefault) { try { sessionExpiry(at, v.duration); } catch (e) { ctx.addIssue({ code: "custom", path: ["duration", "years"], message: e instanceof Error ? e.message : "Thời hạn không hợp lệ." }); } }
  });
}
type Values = { useDefault: boolean; duration: SessionDuration; reason: string };
const defaults = (p: AccountSessionPolicy): Values => ({ useDefault: p.sessionLifetimeMinutes === null && !p.sessionDuration, duration: p.sessionDuration ?? (p.sessionLifetimeMinutes ? minutesToDuration(p.sessionLifetimeMinutes) : { ...emptyDuration }), reason: "" });
const localDateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
export function AccountSessions({ accountId, loginId, onSaved }: { accountId: string; loginId: string; onSaved: (message: string) => void }) {
  const q = useAccountSessionPolicyQuery(accountId, { pollingInterval: 30000, skipPollingIfUnfocused: true, refetchOnFocus: true });
  if (!q.currentData) return <Card><Typography variant="h5">Phiên đăng nhập</Typography><Feedback loading={q.isLoading} error={q.error} retry={() => void q.refetch()} /></Card>;
  return <Stack spacing={2}><SessionEditor key={accountId} policy={q.currentData} loginId={loginId} queryError={q.error} reload={async () => q.refetch().unwrap()} onSaved={onSaved} /><LoginHistoryCard accountId={accountId} /></Stack>;
}
function SessionEditor({ policy, loginId, queryError, reload, onSaved }: { policy: AccountSessionPolicy; loginId: string; queryError: unknown; reload: () => Promise<AccountSessionPolicy>; onSaved: (message: string) => void }) {
  const [save, saving] = useUpdateSessionPolicyMutation(), [revoke, revoking] = useRevokeAccountSessionsMutation();
  const [open, setOpen] = useState(false), [reason, setReason] = useState(""), [reasonError, setReasonError] = useState("");
  const form = useForm<Values>({ resolver: zodResolver(schemaFor(policy.serverNow)), defaultValues: defaults(policy) });
  const { register, handleSubmit, reset, control, formState: { errors, isDirty } } = form;
  const version = useRef(policy.version), defaultChecked = useWatch({ control, name: "useDefault" }), duration = useWatch({ control, name: "duration" });
  let preview = "";
  try { preview = localDateTime(sessionExpiry(policy.serverNow, defaultChecked ? null : duration, policy.defaultLifetimeMinutes)); } catch { /* Validation displays the error on submit. */ }
  const busy = saving.isLoading || revoking.isLoading;
  useUnsaved(isDirty || (open && !!reason));
  useEffect(() => {
    if (!isDirty && !busy && policy.version > version.current) { version.current = policy.version; reset(defaults(policy)); }
  }, [policy, isDirty, busy, reset]);
  const submit = (event: FormEvent<HTMLFormElement>) => handleSubmit(async (values) => {
    try {
      const next = await save({ id: policy.accountId, body: { sessionLifetimeMinutes: null, sessionDuration: values.useDefault ? null : values.duration, reason: values.reason, version: version.current } }).unwrap();
      version.current = next.version; reset(defaults(next)); onSaved("Đã lưu thời hạn phiên. Áp dụng từ lần đăng nhập tiếp theo.");
    } catch { /* Preserve the form and show the RTK Query error. */ }
  })(event);
  const refresh = async () => {
    if (!confirmLeave()) return;
    try { const next = await reload(); version.current = next.version; reset(defaults(next)); saving.reset(); revoking.reset(); } catch {}
  };
  return <Card>
    <Stack spacing={2}>
      <Typography variant="h5">Phiên đăng nhập</Typography>
      <Typography>{policy.activeSessionCount} phiên còn hiệu lực · Thời hạn: {durationText(policy.sessionDuration, policy.effectiveLifetimeMinutes)}</Typography>
      <Typography color="text.secondary">Thời hạn áp dụng cho lần đăng nhập bằng mật khẩu hoặc link tiếp theo. Các phiên đang đăng nhập giữ thời hạn cũ.</Typography>
      {queryError ? <Feedback error={queryError} retry={() => void refresh()} /> : null}
      <Stack component="form" noValidate onSubmit={submit} spacing={2}>
        <FormControlLabel control={<Checkbox {...register("useDefault")} checked={defaultChecked} disabled={busy} />} label="Dùng thời hạn mặc định của hệ thống" />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(5, minmax(0, 1fr))" }, gap: 2 }}>
          {(Object.keys(durationLabels) as (keyof SessionDuration)[]).map((key) => <TextField key={key} label={`Thời hạn · ${durationLabels[key]}`} type="number" {...register(`duration.${key}`, { setValueAs: (v: string) => v === "" ? 0 : Number(v) })} disabled={busy || defaultChecked} error={!!errors.duration?.[key]} helperText={errors.duration?.[key]?.message} slotProps={{ htmlInput: { min: 0, max: key === "years" ? 10 : undefined, step: 1 } }} />)}
        </Box>
        <Typography variant="body2" color="text.secondary">Cộng năm, tháng theo lịch, sau đó cộng ngày, giờ, phút. Tổng thời hạn lớn hơn 0 và tối đa 10 năm.</Typography>
        <Alert severity="info">Nếu đăng nhập tại thời điểm máy chủ đang hiển thị, phiên sẽ hết hạn: {preview || "Chọn thời hạn hợp lệ"} (giờ Việt Nam). Thời điểm thật được tính lại khi đăng nhập.</Alert>
        <TextField label="Lý do thay đổi thời hạn" {...register("reason")} disabled={busy} error={!!errors.reason} helperText={errors.reason?.message} multiline minRows={2} />
        {saving.error ? <Feedback error={saving.error} retry={() => void refresh()} /> : null}
        <Button type="submit" variant="contained" loading={saving.isLoading} disabled={busy || !isDirty || !!queryError}>Lưu thời hạn phiên</Button>
      </Stack>
      {policy.managerProtected ? <Alert severity="info">Tài khoản có vai trò MANAGER được bảo vệ: không thể buộc kết thúc phiên. Có thể đặt thời hạn cho lần đăng nhập sau.</Alert> : <Typography color="text.secondary">Kết thúc tất cả phiên sẽ yêu cầu đăng nhập lại; tài khoản, hồ sơ và dữ liệu học tập vẫn được giữ.</Typography>}
      <Button color="error" variant="outlined" disabled={busy || policy.managerProtected || !!queryError} onClick={() => { setReason(""); setReasonError(""); revoking.reset(); setOpen(true); }}>Buộc kết thúc tất cả phiên</Button>
      {!open && revoking.error ? <Feedback error={revoking.error} retry={() => void refresh()} /> : null}
    </Stack>
    <Dialog open={open} onClose={() => { if (!busy && (!reason || window.confirm("Bỏ lý do đã nhập?"))) setOpen(false); }} fullWidth maxWidth="sm">
      <DialogTitle>Kết thúc phiên của {loginId}?</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <Alert severity="warning">Tất cả phiên còn hiệu lực của tài khoản này sẽ bị thu hồi khi tác vụ hoàn tất. Người dùng vẫn có thể đăng nhập lại.</Alert>
        <TextField label="Lý do kết thúc phiên" value={reason} onChange={(e) => setReason(e.target.value)} error={!!reasonError} helperText={reasonError || "Bắt buộc; được ghi vào nhật ký quản lý."} multiline minRows={2} disabled={busy} />
        {revoking.error ? <Feedback error={revoking.error} /> : null}
      </Stack></DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={() => setOpen(false)}>Hủy</Button>
        <Button color="error" variant="contained" loading={revoking.isLoading} disabled={busy || policy.managerProtected} onClick={async () => {
          if (!reason.trim() || reason.trim().length > 500) { setReasonError("Nhập lý do từ 1 đến 500 ký tự."); return; }
          setReasonError("");
          try { const done = await revoke({ id: policy.accountId, version: policy.version, reason: reason.trim() }).unwrap(); version.current = done.policy.version; setOpen(false); setReason(""); onSaved(`Đã kết thúc ${done.revokedSessions} phiên đăng nhập.`); } catch {}
        }}>Xác nhận kết thúc phiên</Button>
      </DialogActions>
    </Dialog>
  </Card>;
}

function LoginHistoryCard({ accountId }: { accountId: string }) {
  const [page, setPage] = useState(1);
  const q = useAccountLoginHistoryQuery({ id: accountId, page }, { pollingInterval: 30000, skipPollingIfUnfocused: true, refetchOnFocus: true });
  return <Card><Stack spacing={2}>
    <Typography variant="h5">Lịch sử đăng nhập</Typography>
    <Typography variant="body2" color="text.secondary">Các lần đăng nhập thành công, mới nhất trước. Thiết bị được nhận diện từ trình duyệt và có thể không chính xác. IP có thể là địa chỉ proxy; không xác định vị trí GPS.</Typography>
    <Feedback loading={q.isFetching} error={q.error} retry={() => void q.refetch()} />
    {q.currentData?.items.length === 0 && <Alert severity="info">Chưa có lần đăng nhập được ghi nhận.</Alert>}
    {q.currentData?.items.map((entry, index) => <Box key={`${entry.loggedInAt}-${index}`} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, overflowWrap: "anywhere" }}>
      <Typography sx={{ fontWeight: 600 }}>{localDateTime(entry.loggedInAt)} (giờ Việt Nam)</Typography>
      <Typography>{[entry.device, entry.operatingSystem, entry.browser].filter(Boolean).join(" · ") || "Chưa ghi nhận thiết bị"}</Typography>
      <Typography variant="body2">IP kết nối: {entry.ipAddress ?? "Chưa ghi nhận"} · Vị trí: chưa xác định</Typography>
      <Typography variant="body2" color="text.secondary">{entry.revokedAt ? `Đã kết thúc: ${localDateTime(entry.revokedAt)}` : `Hết hạn: ${localDateTime(entry.expiresAt)}`}</Typography>
    </Box>)}
    {q.currentData && q.currentData.total > q.currentData.pageSize && <Pagination aria-label="Trang lịch sử đăng nhập" page={page} count={Math.ceil(q.currentData.total / q.currentData.pageSize)} onChange={(_, next) => setPage(next)} />}
  </Stack></Card>;
}
