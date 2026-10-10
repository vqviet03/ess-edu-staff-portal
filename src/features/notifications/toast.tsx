"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import Snackbar from "@mui/material/Snackbar";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Close from "@mui/icons-material/Close";
import OpenInNew from "@mui/icons-material/OpenInNew";
import {NotificationContent} from "./content";
import {SwipeDismiss} from "@/shared/swipe-dismiss";
import {NOTICE_TOAST_EVENT} from "./events";
import type {Notification} from "@/features/materials/models";

export function NotificationToast(){
 const [queue,setQueue]=useState<Notification[]>([]),seen=useRef(new Set<string>());
 useEffect(()=>{const add=(event:Event)=>{const n=(event as CustomEvent<Notification>).detail;if(seen.current.has(n.id))return;seen.current.add(n.id);if(seen.current.size>256)seen.current.delete(seen.current.values().next().value!);setQueue(q=>[...q,n].slice(-15));};window.addEventListener(NOTICE_TOAST_EVENT,add);return()=>window.removeEventListener(NOTICE_TOAST_EVENT,add);},[]);
 const notice=queue[0],close=()=>setQueue(q=>q.slice(1)),href=notice?notice.href:null;
 return <Snackbar key={notice?.id} open={!!notice} autoHideDuration={notice?.priority==="IMPORTANT"?null:8000} anchorOrigin={{vertical:"top",horizontal:"right"}} onClose={(_,reason)=>{if(reason!=="clickaway")close();}}>
  <div>{notice&&<SwipeDismiss onDismiss={close}><Paper role="alert" sx={{p:1.5,maxWidth:420,width:"100%",boxShadow:4,border:"1px solid",borderColor:notice.priority==="IMPORTANT"?"warning.main":"divider"}}><Stack direction="row" sx={{gap:0.5,alignItems:"flex-start"}}><NotificationContent notice={notice}/>{href&&<Tooltip title="Mở nội dung"><IconButton component={Link} href={href} aria-label="Mở thông báo" onClick={close}><OpenInNew fontSize="small"/></IconButton></Tooltip>}<Tooltip title="Đóng thông báo"><IconButton aria-label="Đóng thông báo" onClick={close}><Close fontSize="small"/></IconButton></Tooltip></Stack></Paper></SwipeDismiss>}</div>
 </Snackbar>;
}
