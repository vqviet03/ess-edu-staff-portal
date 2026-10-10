"use client";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEnrollmentDatesQuery, usePreviewEnrollmentDatesMutation } from "@/api/management-api";
import { errorMessage } from "@/api/base-query";
import { Feedback } from "@/shared/ui";
import { confirmLeave, useUnsaved } from "@/shared/unsaved";
import { vietnamToday } from "@/features/rewards/models";
import { PreviewPanel, showValue } from "./shared";
import type { BulkPreview } from "./models";
import { validateEnrollmentDates, type EnrollmentDates } from "./enrollment-dates";

function DatesForm({data, close, reload}: {
  data: EnrollmentDates; close: (saved?: number) => void; reload: () => void;
}) {
  const [periods, setPeriods] = useState(() => data.history.map(({id, joinedOn, endedOn}) => ({id, joinedOn, endedOn})));
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [error, setError] = useState("");
  const [submit, state] = usePreviewEnrollmentDatesMutation();
  const dirty = JSON.stringify(periods) !== JSON.stringify(data.history.map(({id, joinedOn, endedOn}) => ({id, joinedOn, endedOn})));
  useUnsaved(dirty && !preview);
  const today = vietnamToday();
  const errors = validateEnrollmentDates(periods, data.history, today);
  if (preview) return (
    <Stack spacing={2}>
      <Typography variant="body2">Đối chiếu các đợt trước khi xác nhận. Điểm, báo cáo và lịch sử gốc được giữ nguyên.</Typography>
      {periods.map((p, i) => (
        <Typography key={p.id} variant="body2">
          Đợt {i + 1}: {data.history[i].joinedOn} → {p.joinedOn} · Nghỉ học: {data.history[i].endedOn ?? "Đang học"} → {p.endedOn ?? "Đang học"}
        </Typography>
      ))}
      <PreviewPanel preview={preview} close={() => setPreview(null)} onSaved={close}/>
    </Stack>
  );
  return (
    <Stack spacing={2} sx={{pt: 1}}>
      <Alert severity={data.datesConfirmed ? "info" : "warning"}>
        {data.datesConfirmed ? "Ngày học đã được quản lý xác nhận." : "Ngày đang lưu chưa được xác nhận là ngày học thực tế. Hãy đối chiếu hồ sơ và xác nhận toàn bộ các đợt."}
        {" "}Sửa ngày không thay trạng thái hoặc khôi phục quyền truy cập lớp.
      </Alert>
      <Typography variant="body2">Ngày nhập hệ thống: {new Date(data.recordedAt).toLocaleString("vi-VN")}. Ngày nhập học có thể trước ngày này.</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {periods.map((p, i) => (
        <Paper key={p.id} variant="outlined" sx={{p: 2}}>
          <Typography sx={{fontWeight: 700, mb: 1}}>Đợt {i + 1} · {showValue(data.history[i].status)}</Typography>
          <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
            <TextField fullWidth type="date" label={periods.length === 1 ? "Ngày tham gia lớp" : `Ngày tham gia · đợt ${i + 1}`} value={p.joinedOn}
              slotProps={{inputLabel: {shrink: true}, htmlInput: {max: today, min: `${Number(today.slice(0, 4)) - 10}${today.slice(4)}`}}}
              onChange={e => setPeriods(old => old.map((v, index) => index === i ? {...v, joinedOn: e.target.value} : v))}/>
            <TextField fullWidth type="date" label={`Ngày nghỉ học · đợt ${i + 1}`} value={p.endedOn ?? ""}
              disabled={data.history[i].status === "ACTIVE"}
              helperText={data.history[i].status === "ACTIVE" ? "Đợt đang học chưa có ngày nghỉ. Đổi trạng thái ở phần ghi danh." : "Bao gồm toàn bộ ngày nghỉ học."}
              slotProps={{inputLabel: {shrink: true}, htmlInput: {max: today, min: p.joinedOn}}}
              onChange={e => setPeriods(old => old.map((v, index) => index === i ? {...v, endedOn: e.target.value || null} : v))}/>
          </Stack>
        </Paper>
      ))}
      {errors.map(e => <Alert key={e} severity="error">{e}</Alert>)}
      <Stack direction="row" spacing={1}>
        <Button variant="contained" loading={state.isLoading} disabled={!!errors.length || (!dirty && data.datesConfirmed)}
          onClick={async () => {
            setError("");
            try {setPreview(await submit({classId: data.classId, studentId: data.studentId, version: data.version, periods}).unwrap());}
            catch (e) {setError(errorMessage(e));}
          }}>Kiểm tra ảnh hưởng</Button>
        <Button disabled={state.isLoading} onClick={() => {if (confirmLeave()) reload();}}>Tải lại lịch sử</Button>
        <Button disabled={state.isLoading} onClick={() => {if (confirmLeave()) close();}}>Hủy</Button>
      </Stack>
    </Stack>
  );
}
export function EnrollmentDatesEditor({classId, studentId, close}: {
  classId: string; studentId: string; close: (saved?: number) => void;
}) {
  const query = useEnrollmentDatesQuery({classId, studentId});
  return (
    <Dialog open fullWidth maxWidth="md" onClose={() => {if (confirmLeave()) close();}}>
      <DialogTitle>Sửa ngày nhập học / nghỉ học</DialogTitle>
      <DialogContent>
        <Feedback loading={!query.currentData && query.isFetching} error={query.error} retry={() => void query.refetch()}/>
        {query.currentData && <DatesForm key={query.currentData.version} data={query.currentData} close={close} reload={() => void query.refetch()}/>}
      </DialogContent>
    </Dialog>
  );
}
