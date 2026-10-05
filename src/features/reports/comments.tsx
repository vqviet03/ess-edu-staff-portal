"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { Feedback } from "@/shared/ui";
import { confirmLeave, useUnsaved } from "@/shared/unsaved";
import { useUpdateReportCommentsMutation } from "@/api/report-api";
import { skills } from "./utils";
import type { StaffReport, UnitContext } from "./models";
const schema = z.object({ skills: z.array(z.object({code: z.enum(["vocabulary", "grammar", "pronunciation", "listening", "reading", "speaking", "writing"]), comment: z.string().max(4000,"Tối đa 4.000 ký tự.")})).length(7), overallComment: z.string().max(4000,"Tối đa 4.000 ký tự.") });
type Fields = z.infer<typeof schema>;
export function CommentEditor({data, canSave, context, studentName, unitName, onClose, onSaved, onReload}: {data: StaffReport; canSave: boolean; context: UnitContext; studentName: string; unitName: string; onClose: () => void; onSaved: () => void; onReload: () => Promise<StaffReport>}) {
  const [save, state] = useUpdateReportCommentsMutation(), [failure, setFailure] = useState<unknown>(), [version, setVersion] = useState(data);
  const form = useForm<Fields>({resolver: zodResolver(schema), defaultValues: values(data)});
  useUnsaved(form.formState.isDirty);
  const close = () => { if (!state.isLoading && confirmLeave()) onClose(); };
  const submit = form.handleSubmit(async (fields) => { setFailure(undefined); try { const updated = await save({...context, comments: {...fields, version: version.version, assessmentId: version.assessmentId, resultVersion: version.resultVersion}}).unwrap(); form.reset(values(updated)); onSaved(); } catch (error) { setFailure(error); } });
  return <Dialog open onClose={close} fullWidth maxWidth="md"><DialogTitle>Sửa nhận xét · {studentName} · {unitName}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt: 1}}><Alert severity="info">Nhận xét được cập nhật ngay trên báo cáo học sinh và bài đánh giá nguồn. Điểm và lời khuyên được giữ nguyên.</Alert>{!canSave && <Alert severity="warning">Báo cáo hiện không cho phép sửa. Bản đang nhập vẫn được giữ; tải lại dữ liệu hoặc đóng form.</Alert>}<Feedback error={failure}/>{!!failure && <Button onClick={async () => { if (window.confirm("Tải nhận xét mới nhất và bỏ bản đang sửa?")) { try { const latest = await onReload(); setVersion(latest); form.reset(values(latest)); setFailure(undefined); } catch(error) { setFailure(error); } } }}>Dùng bản báo cáo mới nhất</Button>}
    {skills.map((skill,index) => <TextField key={skill.code} label={`Nhận xét ${skill.label}`} multiline minRows={2} {...form.register(`skills.${index}.comment`)} error={!!form.formState.errors.skills?.[index]?.comment} helperText={form.formState.errors.skills?.[index]?.comment?.message} disabled={state.isLoading}/>)}
    <TextField label="Nhận xét tổng thể" multiline minRows={3} {...form.register("overallComment")} error={!!form.formState.errors.overallComment} helperText={form.formState.errors.overallComment?.message} disabled={state.isLoading}/><Typography variant="body2" color="text.secondary">Lưu sử dụng phiên bản báo cáo và kết quả nguồn để tránh ghi đè thay đổi của giảng viên khác.</Typography>
  </Stack></DialogContent><DialogActions><Button disabled={state.isLoading} onClick={close}>Hủy</Button><Button variant="contained" disabled={!canSave || state.isLoading || !form.formState.isDirty} onClick={() => void submit()}>{state.isLoading ? "Đang lưu…" : "Lưu nhận xét"}</Button></DialogActions></Dialog>;
}
function values(data: StaffReport): Fields { return { skills: skills.map(skill => ({code: skill.code, comment: data.report.skills.find(row => row.code === skill.code)?.comment ?? ""})), overallComment: data.report.overallComment ?? "" }; }
