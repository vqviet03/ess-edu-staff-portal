"use client";
import {useState} from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import NotificationsNone from "@mui/icons-material/NotificationsNone";
import {NotificationPrioritySelect} from "./priority";
export function NotificationActionPriority({classId,feature,value,onChange}:{classId:string;feature:string;value:"NORMAL"|"IMPORTANT"|undefined;onChange:(v:"NORMAL"|"IMPORTANT"|undefined)=>void}){
 const [open,setOpen]=useState(false);
 return <><Tooltip title="Ưu tiên thông báo cho thao tác trên bài"><IconButton size="small" aria-label="Ưu tiên thông báo cho thao tác trên bài" color={value==="IMPORTANT"?"warning":"default"} onClick={()=>setOpen(true)}><NotificationsNone fontSize="small"/></IconButton></Tooltip>
 <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="xs" fullWidth><DialogTitle>Ưu tiên thông báo thao tác</DialogTitle><DialogContent sx={{pt:1}}>{open&&<NotificationPrioritySelect classId={classId} feature={feature} value={value} onChange={onChange}/>}</DialogContent><DialogActions><Button onClick={()=>setOpen(false)}>Đóng</Button></DialogActions></Dialog></>;
}
