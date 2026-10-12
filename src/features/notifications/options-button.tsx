"use client";
import {useState,type ReactNode} from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import NotificationsNone from "@mui/icons-material/NotificationsNone";
export function NotificationOptionsButton({children,important=false}:{children:ReactNode;important?:boolean}){
 const [open,setOpen]=useState(false);
 return <><Tooltip title="Tuỳ chọn gửi thông báo"><IconButton size="small" aria-label="Tuỳ chọn gửi thông báo" aria-haspopup="dialog" color={important?"warning":"default"} onClick={()=>setOpen(true)}><NotificationsNone fontSize="small"/></IconButton></Tooltip><Dialog open={open} onClose={()=>setOpen(false)} maxWidth="xs" fullWidth><DialogTitle>Gửi thông báo</DialogTitle><DialogContent sx={{pt:1}}>{open&&children}</DialogContent><DialogActions><Button onClick={()=>setOpen(false)}>Đóng</Button></DialogActions></Dialog></>;
}
