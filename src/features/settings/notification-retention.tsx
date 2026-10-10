"use client";
import {useState} from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import {api,unwrap} from "@/api/api";
import {Card,Feedback} from "@/shared/ui";
import {useUnsaved} from "@/shared/unsaved";
interface Retention {limit:number;deleteMode:"SOFT"|"HARD";version:number}
const retentionApi=api.enhanceEndpoints({addTagTypes:["NotificationRetention"]}).injectEndpoints({endpoints:b=>({
 notificationRetention:b.query<Retention,void>({query:()=>"/manager/notification-settings",transformResponse:unwrap<Retention>,providesTags:["NotificationRetention"]}),
 saveNotificationRetention:b.mutation<Retention,Retention>({query:body=>({url:"/manager/notification-settings",method:"PATCH",body}),transformResponse:unwrap<Retention>,
 async onQueryStarted(_,{dispatch,queryFulfilled}){try{const {data}=await queryFulfilled;dispatch(retentionApi.util.upsertQueryData("notificationRetention",undefined,data));}catch{}},
 invalidatesTags:(_,e)=>e?[]:["Audit"]
 })
})});
export function NotificationRetentionSettings(){
 const q=retentionApi.useNotificationRetentionQuery();
 const [message,setMessage]=useState("");
 return <Stack spacing={2} sx={{my:3}}><Typography variant="h6">Lưu trữ thông báo</Typography>
 <Feedback loading={q.isLoading} error={q.error} retry={()=>void q.refetch()}/>
 {message&&<Alert severity="success">{message}</Alert>}
 {q.data&&<RetentionForm key={q.data.version} initial={q.data} saved={()=>setMessage("Đã lưu cài đặt thông báo.")}/>}
 </Stack>;
}
function RetentionForm({initial,saved}:{initial:Retention;saved:()=>void}){
 const [limit,setLimit]=useState(initial.limit),[mode,setMode]=useState(initial.deleteMode);
 const [save,state]=retentionApi.useSaveNotificationRetentionMutation();
 const dirty=limit!==initial.limit||mode!==initial.deleteMode;useUnsaved(dirty);
 return <Card><Stack spacing={2} component="form" onSubmit={async e=>{
 e.preventDefault();if(mode==="HARD"&&initial.deleteMode!=="HARD"&&!window.confirm("Thông báo bị dọn sau này sẽ bị xóa thật khỏi DB. Áp dụng?"))return;
 try{await save({limit,deleteMode:mode,version:initial.version}).unwrap();saved();}catch{}
 }}>
 <TextField size="small" type="number" label="Số thông báo giữ lại mỗi tài khoản" value={limit} onChange={e=>setLimit(Number(e.target.value))} slotProps={{htmlInput:{min:1,max:1000,step:1}}}/>
 <TextField size="small" select label="Chế độ xóa" value={mode} onChange={e=>setMode(e.target.value as Retention["deleteMode"])}><MenuItem value="SOFT">Xóa mềm</MenuItem><MenuItem value="HARD">Xóa thật</MenuItem></TextField>
 <Typography variant="body2">Áp dụng khi nhận thông báo mới. Thông báo quan trọng chưa đọc luôn được giữ, kể cả vượt giới hạn. Xóa thật vẫn giữ dấu giao nhận để chống gửi lặp.</Typography>
 <Feedback error={state.error}/><Button type="submit" size="small" variant="contained" loading={state.isLoading} disabled={!dirty||!Number.isInteger(limit)||limit<1||limit>1000}>Lưu cài đặt</Button>
 </Stack></Card>;
}
