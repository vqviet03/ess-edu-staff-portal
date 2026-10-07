"use client";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useDecideSettingsMutation, useProposeSettingsMutation, useSettingsProposalsQuery } from "@/api/settings-api";
import { Card, Feedback, Title } from "@/shared/ui";
import { useUnsaved } from "@/shared/unsaved";
import { useAppSelector } from "@/store";
import { ManagerOnly } from "@/features/management/shared";
import { useApplicationSettings } from "./hooks";
import type { ApplicationSettings } from "./models";
export function SettingsPage() { return <ManagerOnly><SettingsContent /></ManagerOnly>; }
function SettingsContent() {
  const { settings, query } = useApplicationSettings(), proposals = useSettingsProposalsQuery(), actor = useAppSelector(s => s.auth.session?.teacher.id);
  return <><Title title="Cấu hình ứng dụng" subtitle="Đề xuất đổi tên và tiền tố gợi ý lớp. Các quản lý khác đồng ý trước khi áp dụng; ID lớp đã có được giữ nguyên." />
    <Feedback loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />
    {query.data && <SettingsForm key={settings.version} settings={settings} />}
    <Typography component="h2" variant="h6" sx={{ my: 2 }}>Đề xuất & xác nhận</Typography>
    <Feedback loading={proposals.isLoading} error={proposals.error} retry={() => void proposals.refetch()} />
    <Stack spacing={2}>{proposals.currentData?.items.map(p => <ProposalCard key={p.id + ":" + p.version} proposal={p} actor={actor} />)}</Stack>
    {proposals.currentData && !proposals.currentData.items.length && <Feedback empty="Chưa có đề xuất." />}
  </>;
}
function SettingsForm({ settings }: { settings: ApplicationSettings }) {
  const [name, setName] = useState(settings.appName), [prefix, setPrefix] = useState(settings.classIdPrefix), [reason, setReason] = useState(""), [success, setSuccess] = useState("");
  const [save, state] = useProposeSettingsMutation();
  const dirty = name !== settings.appName || prefix !== settings.classIdPrefix;
  useUnsaved(dirty && !success);
  return <Card><Stack component="form" spacing={2} onSubmit={async e => {
    e.preventDefault(); if (!window.confirm("Gửi đề xuất cho tất cả quản lý khác? Chỉ khi đủ đồng ý mới áp dụng. Nếu bạn là quản lý duy nhất, cấu hình sẽ được áp dụng sau xác nhận này.")) return;
    try { const r = await save({ appName: name.trim(), classIdPrefix: prefix, version: settings.version, reason, confirmSolo: true }).unwrap(); setSuccess(r.status === "APPLIED" ? "Đã áp dụng cấu hình." : "Đã gửi đề xuất, đang chờ các quản lý khác đồng ý."); } catch {}
  }}>
    <TextField label="Tên ứng dụng" value={name} onChange={e => { setName(e.target.value); setSuccess(""); }} slotProps={{ htmlInput: { maxLength: 80 } }} required />
    <TextField label="Tiền tố gợi ý ID lớp" value={prefix} onChange={e => { setPrefix(e.target.value); setSuccess(""); }} error={!/^[a-z][a-z0-9-]{1,15}$/.test(prefix)} helperText={`2–16 ký tự; chữ thường, số, -. Ví dụ lớp mới: ${prefix}21. Có thể sửa ID khi tạo lớp.`} required />
    <TextField label="Lý do thay đổi" value={reason} onChange={e => setReason(e.target.value)} multiline required slotProps={{ htmlInput: { maxLength: 2000 } }} />
    <Alert severity="info">Mọi quản lý khác đang hoạt động phải đồng ý. Đề xuất hết hạn sau 7 ngày; thay đổi danh sách quản lý hoặc phiên bản cấu hình yêu cầu gửi đề xuất mới.</Alert>
    <Feedback error={state.error} />{success && <Alert severity="success">{success}</Alert>}
    <Button type="submit" variant="contained" loading={state.isLoading} disabled={!dirty || !name.trim() || !reason.trim() || !/^[a-z][a-z0-9-]{1,15}$/.test(prefix)}>Gửi đề xuất thay đổi</Button>
  </Stack></Card>;
}
function ProposalCard({ proposal: p, actor }: { proposal: import("./models").SettingsProposal; actor?: string }) {
  const [decide, state] = useDecideSettingsMutation();
  const canDecide = p.status === "PENDING" && p.proposedBy !== actor && p.requiredManagers.some(m => m.id === actor) && !p.approvals.includes(actor ?? "");
  return <Card><Stack spacing={1}>
    <Typography variant="h6">{p.appName} · tiền tố {p.classIdPrefix}</Typography>
    <Chip label={{ PENDING: "Chờ xác nhận", EXPIRED: "Hết hạn", APPLIED: "Đã áp dụng", REJECTED: "Đã từ chối" }[p.status]} sx={{ alignSelf: "start" }} />
    <Typography>Đề xuất bởi {p.proposerName ?? p.proposedBy} · {p.reason}</Typography>
    <Typography variant="body2">{p.approvals.length}/{p.requiredManagers.length} quản lý khác đã đồng ý · Hết hạn {new Date(p.expiresAt).toLocaleString("vi-VN")}</Typography>
    {p.requiredManagers.map(m => <Typography key={m.id} variant="body2">{m.name} ({m.userId}) · {p.approvals.includes(m.id) ? "Đã đồng ý" : "Chưa đồng ý"}</Typography>)}
    <Feedback error={state.error} />
    {canDecide && <Stack direction="row" spacing={1}>{(["APPROVED", "REJECTED"] as const).map(decision => <Button key={decision} loading={state.isLoading} variant={decision === "APPROVED" ? "contained" : "outlined"} onClick={async () => { if (!window.confirm(decision === "APPROVED" ? "Đồng ý áp dụng tên / tiền tố khi đủ xác nhận?" : "Từ chối đề xuất này?")) return; try { await decide({ id: p.id, version: p.version, decision }).unwrap(); } catch {} }}>{decision === "APPROVED" ? "Đồng ý" : "Từ chối"}</Button>)}</Stack>}
  </Stack></Card>;
}
