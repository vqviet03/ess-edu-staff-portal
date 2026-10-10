"use client";
import {useState} from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";
import NotificationsActiveOutlined from "@mui/icons-material/NotificationsActiveOutlined";
import Close from "@mui/icons-material/Close";
import {useWorkspace} from "@/features/access/hooks";
import {useNotificationSettingsQuery,useSaveNotificationSettingsMutation,type NotificationRule} from "@/api/notification-policy-api";
import {Feedback} from "@/shared/ui";
import {useUnsaved} from "@/shared/unsaved";
const labels:Record<string,string>={MATERIAL:"Bài đăng / tài liệu",SOCIAL:"Bình luận / tương tác",REPLY:"Trả lời bình luận",ATTENDANCE:"Điểm danh",SCHEDULE:"Thay đổi lịch học",REWARD:"Điểm động viên",SCORE:"Công bố điểm",APPROVAL:"Phê duyệt",SYSTEM:"Hệ thống"};
function Editor({classId,close}:{classId:string;close:()=>void}){
 const q=useNotificationSettingsQuery(classId),[draft,setDraft]=useState<NotificationRule[]|null>(null),[save,saving]=useSaveNotificationSettingsMutation(),[error,setError]=useState<unknown>();
 useUnsaved(!!draft);
 const rows=draft??q.currentData??[],change=(feature:string,patch:Partial<NotificationRule>)=>setDraft(rows.map(r=>r.feature===feature?{...r,...patch}:r));
 return <><DialogContent><Feedback loading={q.isLoading} error={q.error||error} retry={()=>void q.refetch()}/><Typography variant="body2" color="text.secondary" sx={{mb:2}}>Chọn nhóm nhận cho từng tính năng. Thông báo quan trọng chưa đọc được giữ; lịch học và phê duyệt luôn quan trọng.</Typography><Box sx={{overflowX:"auto"}}><Box sx={{minWidth:560}}>
  <Box sx={{display:"grid",gridTemplateColumns:"1.5fr 70px 70px 70px 1fr",gap:1,fontSize:12,mb:1}}><span>Tính năng</span><span>Quản lý</span><span>Giảng viên</span><span>Học sinh</span><span>Ưu tiên</span></Box>
  {rows.map(r=><Box key={r.feature} sx={{display:"grid",gridTemplateColumns:"1.5fr 70px 70px 70px 1fr",gap:1,alignItems:"center",py:1,borderBottom:"1px solid",borderColor:"divider"}}><Typography variant="body2">{labels[r.feature]??r.feature}</Typography>{(["managers","teachers","students"] as const).map(k=><Checkbox key={k} size="small" checked={r[k]} onChange={(_,v)=>change(r.feature,{[k]:v})} slotProps={{input:{"aria-label":`${labels[r.feature]}: ${k==="managers"?"Quản lý":k==="teachers"?"Giảng viên":"Học sinh"}`}}}/>)}<TextField select size="small" value={r.priority} disabled={["SCHEDULE","APPROVAL"].includes(r.feature)} onChange={e=>change(r.feature,{priority:e.target.value as NotificationRule["priority"]})}><MenuItem value="NORMAL">Thường</MenuItem><MenuItem value="IMPORTANT">Quan trọng</MenuItem></TextField></Box>)}
 </Box></Box></DialogContent><DialogActions><Button disabled={saving.isLoading} onClick={()=>{if(!draft||window.confirm("Bỏ cài đặt chưa lưu?")){setDraft(null);close();}}}>Đóng</Button><Button variant="contained" disabled={!draft||saving.isLoading} onClick={async()=>{try{await save({classId,rules:rows}).unwrap();setDraft(null);close();}catch(e){setError(e);}}}>Lưu cài đặt</Button></DialogActions></>;
}
export function ClassNotificationSettings({classId}:{classId:string}){
 const {staff}=useWorkspace(),[open,setOpen]=useState(false);
 if(!staff?.roles?.includes("MANAGER"))return null;
 return <><Tooltip title="Cài đặt thông báo lớp"><IconButton aria-label="Cài đặt thông báo lớp" onClick={()=>setOpen(true)}><NotificationsActiveOutlined/></IconButton></Tooltip><Dialog fullWidth maxWidth="md" open={open}><DialogTitle>Cài đặt thông báo lớp<IconButton aria-label="Đóng cài đặt thông báo" onClick={()=>{if(window.confirm("Đóng cài đặt và bỏ thay đổi chưa lưu?"))setOpen(false);}} sx={{float:"right"}}><Close/></IconButton></DialogTitle>{open&&<Editor classId={classId} close={()=>setOpen(false)}/>}</Dialog></>;
}
