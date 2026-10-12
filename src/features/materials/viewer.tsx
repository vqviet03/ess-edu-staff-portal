"use client";
import dynamic from "next/dynamic";
import {useRef,useState} from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Close from "@mui/icons-material/Close";
import Download from "@mui/icons-material/Download";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {Feedback} from "@/shared/ui";
import {useContentQuery,useLazyContentQuery} from "@/api/library-api";
import type {MaterialFile} from "./models";
const PdfViewer=dynamic(()=>import("./pdf-viewer"),{ssr:false,loading:()=> <Feedback loading/>});
export function MaterialViewer({file,close}:{file:Pick<MaterialFile,"id"|"displayName"|"mimeType">;close:()=>void}){
 const access=useContentQuery({id:file.id,purpose:"preview"}),[download,state]=useLazyContentQuery(),[error,setError]=useState<unknown>(),audio=useRef<HTMLAudioElement>(null),[speed,setSpeed]=useState(1);
 const url=access.currentData,mime=file.mimeType;
 async function save(){
   setError(undefined);
   try {
     const result=await download({id:file.id,purpose:"download"},false).unwrap();
     const link=document.createElement("a");link.href=result;link.download=file.displayName;link.target="_blank";link.rel="noopener noreferrer";link.click();
   }catch(e){setError(e);}
 }
 return <Dialog open fullScreen onClose={close} aria-labelledby="material-preview-title" data-testid="material-preview" slotProps={{paper:{sx:{m:0,borderRadius:0,overflow:"hidden",height:"100dvh"}}}}>
  <DialogTitle sx={{px:{xs:1,md:2},py:.5}}>
   <Stack direction="row" sx={{alignItems:"center",gap:.5}}>
    <Typography id="material-preview-title" component="span" sx={{flex:1,minWidth:0,fontSize:14,fontWeight:600}} noWrap title={file.displayName}>{file.displayName}</Typography>
    <Tooltip title="Tải xuống"><IconButton aria-label="Tải xuống" disabled={state.isFetching} onClick={()=>void save()}><Download fontSize="small"/></IconButton></Tooltip>
    <Tooltip title="Đóng"><IconButton aria-label="Đóng bản xem trước" onClick={close}><Close/></IconButton></Tooltip>
   </Stack>
  </DialogTitle>
  <DialogContent data-testid="preview-content" sx={{p:{xs:.5,md:1},flex:1,minHeight:0,overflow:"auto",touchAction:"pan-x pan-y pinch-zoom"}}>
   <Feedback loading={access.isLoading} error={access.error||error} retry={()=>{setError(undefined);void access.refetch();}}/>
   {url&&(mime==="application/pdf"?<PdfViewer url={url} retry={()=>void access.refetch()}/>:
    mime.startsWith("image/")?<Box sx={{minHeight:"100%",display:"grid",placeItems:"center"}}><Box component="img" src={url} alt={file.displayName} onError={()=>setError(new Error("Không tải được ảnh."))} sx={{display:"block",width:"auto",height:"auto",maxWidth:"100%",maxHeight:"calc(100dvh - 64px)",objectFit:"contain"}}/></Box>:
    mime.startsWith("audio/")?<Stack spacing={2} sx={{width:"100%",maxWidth:760,mx:"auto",pt:3}}>
     <audio ref={audio} controls preload="metadata" src={url} style={{width:"100%"}} onLoadedMetadata={()=>{if(audio.current)audio.current.playbackRate=speed;}} onError={()=>setError(new Error("Không phát được audio."))}/>
     <TextField select size="small" label="Tốc độ phát" value={speed} sx={{alignSelf:"flex-start",minWidth:120}} onChange={e=>{const n=Number(e.target.value);setSpeed(n);if(audio.current)audio.current.playbackRate=n;}}>{[.25,.5,.75,1,1.25,1.5,1.75,2].map(s=><MenuItem key={s} value={s}>{s}x</MenuItem>)}</TextField>
    </Stack>:
    mime.startsWith("video/")?<Box sx={{minHeight:"100%",display:"grid",placeItems:"center"}}><video controls preload="metadata" src={url} style={{maxWidth:"100%",maxHeight:"calc(100dvh - 64px)",objectFit:"contain"}} onError={()=>setError(new Error("Không phát được video. Có thể tải file để xem bằng ứng dụng phù hợp."))}/></Box>:
    <Feedback empty="Định dạng chưa hỗ trợ xem trực tiếp. Anh/chị có thể tải xuống."/>) }
  </DialogContent>
 </Dialog>;
}
