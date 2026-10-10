"use client";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import {useNotificationSettingsQuery,type NotificationPriority} from "@/api/notification-policy-api";
export function NotificationPrioritySelect({classId,feature,value,onChange}:{classId:string;feature:string;value:NotificationPriority|undefined;onChange:(v:NotificationPriority|undefined)=>void}){
 const q=useNotificationSettingsQuery(classId,{skip:!classId});
 const configured=q.currentData?.find(r=>r.feature===feature)?.priority??"NORMAL",forced=["SCHEDULE","APPROVAL","CONSENT"].includes(feature);
 return <TextField size="small" select label="Ưu tiên thông báo" value={forced?"IMPORTANT":value??""} disabled={forced} onChange={e=>onChange(e.target.value?(e.target.value as NotificationPriority):undefined)}><MenuItem value="">Theo cài đặt lớp ({configured==="IMPORTANT"?"quan trọng":"thường"})</MenuItem><MenuItem value="NORMAL">Thường</MenuItem><MenuItem value="IMPORTANT">Quan trọng · giữ đến khi đọc</MenuItem></TextField>;
}
