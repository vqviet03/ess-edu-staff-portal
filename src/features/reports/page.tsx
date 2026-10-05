"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { useClassesQuery, useClassQuery, useHistoricalStudentsQuery } from "@/api/api";
import { useStudentUnitsQuery, useStudentProgressQuery, useStudentReportQuery } from "@/api/report-api";
import { ReadOnlyNotice, useClassCapabilities, useWorkspace } from "@/features/access/hooks";
import { Card, Feedback, NavButton, Title } from "@/shared/ui";
import { selectUnit } from "./utils";
import { CommentEditor } from "./comments";
const ReportView = dynamic(() => import("./view"), {ssr: false, loading: () => <Feedback loading/>});
export function StudentReports() {
  const params = useSearchParams(), {selected: workspace} = useWorkspace();
  const [selection, setSelection] = useState({classId: params.get("classId") ?? "", studentId: params.get("studentId") ?? "", unitId: params.get("unitId") ?? ""}), [editing, setEditing] = useState(false), [message, setMessage] = useState("");
  const classes = useClassesQuery({search:"",status:"",page:1,pageSize:100,workspace:workspace ?? undefined}), classId = selection.classId || classes.currentData?.data.find(c => c.status === "ACTIVE")?.id || classes.currentData?.data[0]?.id || "";
  const details = useClassQuery(classId,{skip:!classId}), permissions = useClassCapabilities(classId), roster = useHistoricalStudentsQuery(classId,{skip:!classId});
  const students = roster.currentData ?? [], student = selection.studentId ? students.find(s => [s.id,s.publicId,s.studentCode].includes(selection.studentId)) : students.find(s => s.status === "ACTIVE") ?? students[0], studentId = student?.id ?? "", context = {classId,studentId};
  const units = useStudentUnitsQuery(context,{skip:!classId || !studentId}), unit = selectUnit(units.currentData ?? [],selection.unitId), unitId = unit?.id ?? "";
  const progress = useStudentProgressQuery(context,{skip:!classId || !studentId, pollingInterval:30000,skipPollingIfUnfocused:true});
  const report = useStudentReportQuery({...context,unitId},{skip:!classId || !studentId || !unitId || !unit?.hasReport,pollingInterval:30000,skipPollingIfUnfocused:true});
  const editable = permissions.editLearning && !permissions.error && !report.error && !!report.currentData?.canEditComments;
  const retry = () => { void classes.refetch(); if(classId) { void details.refetch(); void roster.refetch(); permissions.retry(); } };
  return <><Title title="Báo cáo học tập học sinh" subtitle="Báo cáo đã công bố, cùng dữ liệu học sinh đang xem." actions={<><NavButton href={classId ? `/class/?classId=${encodeURIComponent(classId)}` : "/home/"}>← Lớp học</NavButton><Button disabled={!editable} variant="contained" onClick={() => setEditing(true)}>Sửa nhận xét</Button></>}/><ReadOnlyNotice editable={editable}/>{message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
    <Card><Stack spacing={2}><TextField select label="Lớp học" value={details.currentData ? classId : ""} onChange={e => {setSelection({classId:e.target.value,studentId:"",unitId:""});setMessage("");}}><MenuItem value="" disabled>Chọn lớp học</MenuItem>{[...(classes.currentData?.data ?? []), ...(details.currentData && !classes.currentData?.data.some(c => c.id === details.currentData!.id) ? [details.currentData] : [])].map(c => <MenuItem key={c.id} value={c.id === details.currentData?.id ? classId : c.id}>{c.name} · {c.code}</MenuItem>)}</TextField>
    <TextField select label="Học sinh" value={studentId} onChange={e => {setSelection({classId,studentId:e.target.value,unitId:""});setMessage("");}} disabled={!students.length}><MenuItem value="" disabled>Chọn học sinh</MenuItem>{students.map(s => <MenuItem key={s.id} value={s.id}>{s.name}{s.nickname ? ` (${s.nickname})` : ""}{s.status !== "ACTIVE" ? " · Lịch sử" : ""}</MenuItem>)}</TextField>
    <Feedback loading={classes.isLoading || details.isLoading || roster.isLoading || permissions.loading} error={classes.error || details.error || roster.error || permissions.error} retry={retry}/>
    {!classes.isLoading && !classId && <Feedback empty="Chưa có lớp được phép xem."/>}{classId && !roster.isFetching && !roster.error && !students.length && <Feedback empty="Lớp chưa có học sinh."/>}
    {selection.studentId && !roster.isFetching && !roster.error && students.length > 0 && !student && <Alert severity="warning">Không tìm thấy học sinh đã chọn trong lớp này. Chọn lại học sinh để xem đúng báo cáo.</Alert>}
    {student && <Typography>{student.name} {student.nickname ? `· ${student.nickname}` : ""} · {student.publicId || student.studentCode || student.id}</Typography>}
    <Feedback loading={units.isLoading || (units.isFetching && !units.currentData)} error={units.error} retry={() => void units.refetch()}/>
    {unit && <Tabs value={unitId} onChange={(_,value:string) => {setSelection({classId,studentId,unitId:value});setMessage("");}} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="Chọn Unit báo cáo">{units.currentData?.map(u => <Tab key={u.id} value={u.id} label={u.name}/>)}</Tabs>}
    {student && !units.isFetching && !units.error && !unit && <Feedback empty="Học sinh chưa có Unit hoặc báo cáo đã công bố trong lớp này."/>}
    </Stack></Card>
    {unit && !unit.hasReport && <Feedback empty="Unit này chưa có báo cáo đã công bố."/>}
    {unit?.hasReport && <><Feedback loading={report.isLoading || (report.isFetching && !report.currentData)} error={report.error} retry={() => void report.refetch()}/>{report.currentData && <Stack sx={{mt:2}}><Typography color="text.secondary" sx={{mb:2}}>Ngày kiểm tra: {report.currentData.report.testedAt ? new Date(report.currentData.report.testedAt).toLocaleDateString("vi-VN") : "Chưa có thông tin"}</Typography><ReportView report={report.currentData.report} unitName={unit.name} entries={progress.currentData ?? []} progressLoading={progress.isLoading || (progress.isFetching && !progress.currentData)} progressError={progress.error} retryProgress={() => void progress.refetch()}/></Stack>}</>}
    {editing && report.currentData && student && unit && <CommentEditor data={report.currentData} canSave={editable} context={{...context,unitId}} studentName={student.name} unitName={unit.name} onClose={() => setEditing(false)} onReload={() => report.refetch().unwrap()} onSaved={() => {setEditing(false);setMessage("Đã cập nhật nhận xét trên báo cáo học sinh.");}}/>}
  </>;
}
