"use client";
import {useEffect,useRef,useState} from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import Close from "@mui/icons-material/Close";
import {useRecordContentViewMutation,useContentViewersQuery} from "@/api/collaboration-api";
import {useAppSelector} from "@/store";
import {Feedback} from "@/shared/ui";
const recorded=new Set<string>();
export function ContentViews({kind,id}:{kind:"POST"|"COMMENT";id:string}){
 const userId=useAppSelector(s=>s.auth.session?.teacher.id);
 const root=useRef<HTMLDivElement>(null),[record]=useRecordContentViewMutation(),[open,setOpen]=useState(false),[page,setPage]=useState(1);
 const query=useContentViewersQuery({kind,id,page},{skip:!open});
 useEffect(()=>{
  const element=root.current,key=`${userId}:${kind}:${id}`;
  if(!element)return;
  const check=()=>{if(document.hidden||recorded.has(key)||!element.getClientRects().length)return;const r=element.getBoundingClientRect();if(r.bottom<=0||r.top>=window.innerHeight)return;recorded.add(key);void record({kind,id}).unwrap().catch(()=>recorded.delete(key));};
  const observer=new IntersectionObserver(check,{threshold:0.5});observer.observe(element);document.addEventListener("visibilitychange",check);
  return()=>{observer.disconnect();document.removeEventListener("visibilitychange",check);};
 },[kind,id,record,userId]);
 return <Box ref={root} sx={{display:"inline-flex"}}>
  <Tooltip title="Xem người đã đọc"><IconButton size="small" aria-label={kind==="POST"?"Người đã xem bài viết":"Người đã xem bình luận"} onClick={()=>setOpen(true)}><VisibilityOutlined fontSize="small"/></IconButton></Tooltip>
  <Dialog open={open} onClose={()=>setOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Người đã xem<Tooltip title="Đóng"><IconButton aria-label="Đóng lượt xem" onClick={()=>setOpen(false)} sx={{float:"right"}}><Close/></IconButton></Tooltip></DialogTitle><DialogContent><Feedback loading={query.isLoading} error={query.error} retry={()=>void query.refetch()}/><Stack spacing={1}>{query.currentData?.items.map(v=><Box key={v.publicId}><Typography fontWeight={600}>{v.name} · {v.role}</Typography><Typography variant="caption" color="text.secondary">{v.publicId} · {new Date(v.viewedAt).toLocaleString("vi-VN")}</Typography></Box>)}{query.currentData?.total===0&&<Typography>Chưa có lượt xem.</Typography>}</Stack></DialogContent><DialogActions><Button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Trước</Button><Button disabled={!query.currentData||page*30>=query.currentData.total} onClick={()=>setPage(p=>p+1)}>Tiếp</Button></DialogActions></Dialog>
 </Box>;
}
