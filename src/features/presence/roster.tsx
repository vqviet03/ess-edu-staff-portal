"use client";
import { useEffect,useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import GroupOutlined from "@mui/icons-material/GroupOutlined";
import Close from "@mui/icons-material/Close";
import Refresh from "@mui/icons-material/Refresh";
import { useClassMembersQuery,useLivePresenceQuery } from "@/api/collaboration-api";
import { Feedback } from "@/shared/ui";
import { memberOnline,offlineLabel,setPresenceContext } from "./state";
export function ClassPresenceContext({classId}:{classId:string}) {
 useEffect(()=>{setPresenceContext(classId);return()=>setPresenceContext(null);},[classId]);return null;
}
export function ClassMembers({classId}:{classId:string}) {
 const query=useClassMembersQuery(classId);
 const live=useLivePresenceQuery(query.currentData?.classId??"",{skip:!query.currentData});
 useEffect(()=>{if(query.currentData)setPresenceContext(query.currentData.classId);},[query.currentData]);
 return <Stack spacing={1.5}>
  <Stack direction="row" sx={{alignItems:"center",justifyContent:"space-between"}}><Typography variant="h6">Thành viên lớp</Typography><Tooltip title="Tải lại thành viên"><IconButton aria-label="Tải lại thành viên" onClick={()=>void query.refetch()}><Refresh/></IconButton></Tooltip></Stack>
  <Feedback loading={query.isLoading} error={query.error} retry={()=>void query.refetch()}/>
  {query.currentData?.items.length===0&&<Typography color="text.secondary">Lớp chưa có thành viên.</Typography>}
  <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"repeat(2,minmax(0,1fr))"},gap:1}}>
   {query.currentData?.items.map(m=>{const online=memberOnline(live.currentData,m.userId);return <Paper key={m.userId} sx={{p:1.5,display:"flex",gap:1.5,alignItems:"center"}}>
    <Avatar sx={{bgcolor:"action.selected",color:"primary.main"}}>{m.name.split(/\s+/).map(p=>p[0]).slice(-2).join("")}</Avatar>
    <Box sx={{minWidth:0,flex:1}}><Typography sx={{fontWeight:600}}>{m.name}{m.nickname?` (${m.nickname})`:""}</Typography><Typography variant="caption" color="text.secondary">{m.publicId} · {m.role}</Typography><Stack direction="row" spacing={0.75} sx={{alignItems:"center"}}><Box sx={{width:8,height:8,borderRadius:"50%",bgcolor:online?"success.main":"text.disabled"}}/><Typography variant="caption" color={online?"success.main":"text.secondary"}>{online?"Đang online":live.currentData?.connected?offlineLabel(live.currentData.lastSeen[m.userId]??m.lastSeenAt):"Chưa kết nối trạng thái"}</Typography></Stack></Box>
   </Paper>;})}
  </Box>
 </Stack>;
}

export function ClassMembersButton({classId}:{classId:string}){
 const [open,setOpen]=useState(false);return <><Tooltip title="Thành viên và trạng thái online"><IconButton aria-label="Thành viên và trạng thái online" onClick={()=>setOpen(true)}><GroupOutlined/></IconButton></Tooltip><Dialog open={open} onClose={()=>setOpen(false)} maxWidth="md" fullWidth><DialogTitle>Thành viên lớp<IconButton aria-label="Đóng thành viên" onClick={()=>setOpen(false)} sx={{float:"right"}}><Close/></IconButton></DialogTitle><DialogContent>{open&&<ClassMembers classId={classId}/>}</DialogContent></Dialog></>;
}
