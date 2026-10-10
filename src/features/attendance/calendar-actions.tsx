"use client";
import {useState} from "react";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import EventBusy from "@mui/icons-material/EventBusy";
import PushPin from "@mui/icons-material/PushPin";
import EventAvailable from "@mui/icons-material/EventAvailable";
import Close from "@mui/icons-material/Close";
import {IconAction} from "@/shared/icon-action";
import {Feedback} from "@/shared/ui";
import {useArrangeCalendarDayMutation,useCancelCalendarDayMutation} from "@/api/attendance-api";
import {useWorkspace} from "@/features/access/hooks";
import type {ClassAttendance} from "./models";
import {dateLabel} from "./models";
export function CalendarActions({data,classId,editable}:{data:ClassAttendance;classId:string;editable:boolean}){
 const {staff}=useWorkspace(),canArrange=!!staff?.roles?.includes("MANAGER")||editable;
 const [open,setOpen]=useState(false),[cancel,setCancel]=useState(false),[kind,setKind]=useState<"HOLIDAY"|"MAKEUP"|"SUPPLEMENTAL">(data.scheduled&&!data.isPlanned?"HOLIDAY":"SUPPLEMENTAL"),[reason,setReason]=useState(""),[confirmed,setConfirmed]=useState(false),[startTime,setStartTime]=useState(""),[endTime,setEndTime]=useState(""),[error,setError]=useState<unknown>();
 const [save,saving]=useArrangeCalendarDayMutation(),[remove,removing]=useCancelCalendarDayMutation(),busy=saving.isLoading||removing.isLoading;
 if(!canArrange||data.saved)return data.isHoliday?<Alert severity="warning">Nghỉ học · {data.reason}. Kế hoạch được nối thêm buổi phía sau.</Alert>:null;
 return <Stack spacing={1}>
  {data.isHoliday&&<Alert severity="warning">Nghỉ học · {data.reason}. Kế hoạch được nối thêm buổi phía sau.</Alert>}
  {data.isPlanned&&<Alert severity="info" icon={<PushPin/>}>{data.reasonKind==="MAKEUP"?"Học bù":"Học thêm"} dự kiến · {data.reason}. {data.date>data.today?"Đến ngày học mới được điểm danh.":"Có thể điểm danh buổi này."}</Alert>}
  <Stack direction="row" spacing={1}><IconAction label={data.scheduled&&!data.isPlanned?"Đánh dấu ngày nghỉ":"Ghim lịch học bù / học thêm"} icon={data.scheduled&&!data.isPlanned?<EventBusy sx={{color:"warning.main"}}/>:<PushPin/>} onClick={()=>{setCancel(false);setReason(data.reason);setOpen(true);}}/>
   {(data.isPinned||data.isHoliday)&&<IconAction label="Hủy lịch đã xếp" icon={<Close/>} onClick={()=>{setCancel(true);setReason("");setConfirmed(false);setOpen(true);}}/>}
  </Stack>
  <Dialog open={open} onClose={()=>{if(!busy)setOpen(false);}} fullWidth maxWidth="sm"><DialogTitle>{cancel?"Hủy lịch đã xếp":"Xếp lịch"} · {dateLabel(data.date)}</DialogTitle><DialogContent><Stack spacing={1.5} sx={{pt:1}}>
   {!cancel&&<TextField select size="small" label="Loại buổi" value={kind} onChange={e=>setKind(e.target.value as typeof kind)}>{(data.scheduled&&!data.isPlanned||data.isHoliday)&&<MenuItem value="HOLIDAY">Nghỉ học · tự nối kế hoạch</MenuItem>}{(!data.scheduled||data.isPlanned)&&<MenuItem value="MAKEUP">Học bù · thay buổi cuối kế hoạch</MenuItem>}{(!data.scheduled||data.isPlanned)&&<MenuItem value="SUPPLEMENTAL">Học thêm · ngoài kế hoạch</MenuItem>}</TextField>}
   <TextField size="small" multiline minRows={2} required label="Ghi chú / lý do" value={reason} onChange={e=>setReason(e.target.value)} slotProps={{htmlInput:{maxLength:2000}}}/>
   {!cancel&&kind!=="HOLIDAY"&&<Stack direction="row" spacing={1}><TextField size="small" type="time" label="Giờ bắt đầu (tùy chọn)" value={startTime} onChange={e=>setStartTime(e.target.value)} slotProps={{inputLabel:{shrink:true}}}/><TextField size="small" type="time" label="Giờ kết thúc" value={endTime} onChange={e=>setEndTime(e.target.value)} slotProps={{inputLabel:{shrink:true}}}/></Stack>}
   {cancel&&data.date<data.today&&<><Alert severity="warning">Buổi đã qua nhưng chưa điểm danh. Hủy sẽ tính lại các ngày học còn lại.</Alert><FormControlLabel control={<Checkbox checked={confirmed} onChange={(_,v)=>setConfirmed(v)}/>} label="Tôi xác nhận hủy lịch đã qua"/></>}
   {!cancel&&<Alert severity={kind==="HOLIDAY"?"warning":"info"}>{kind==="HOLIDAY"?"Ngày nghỉ không tính là buổi dạy; tự nối thêm ngày theo lịch cố định để đủ kế hoạch.":kind==="MAKEUP"?"Buổi học bù thay một buổi cố định cuối cùng chưa điểm danh, tổng kế hoạch giữ nguyên.":"Buổi học thêm không trừ buổi kế hoạch."} Thông báo quan trọng sẽ gửi theo cài đặt lớp.</Alert>}<Feedback error={error}/>
  </Stack></DialogContent><DialogActions><Button size="small" disabled={busy} onClick={()=>setOpen(false)}>Đóng</Button><Button size="small" variant="contained" color={kind==="HOLIDAY"?"warning":"primary"} startIcon={cancel?<Close/>:<EventAvailable/>} disabled={busy||!reason.trim()||(cancel&&data.date<data.today&&!confirmed)} onClick={async()=>{setError(undefined);try{if(cancel)await remove({classId,date:data.date,version:data.version,reason,confirmPast:confirmed}).unwrap();else await save({classId,date:data.date,version:data.version,kind,reason,startTime:startTime||undefined,endTime:endTime||undefined}).unwrap();setOpen(false);}catch(e){setError(e);}}}>{busy?"Đang lưu…":"Xác nhận"}</Button></DialogActions></Dialog>
 </Stack>;
}
