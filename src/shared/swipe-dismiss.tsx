"use client";
import {useRef,type ReactNode} from "react";
import Box from "@mui/material/Box";
export function SwipeDismiss({children,onDismiss}:{children:ReactNode;onDismiss:()=>void}){
 const start=useRef<{x:number;y:number;id:number}|null>(null);
 return <Box sx={{touchAction:"pan-y"}} onPointerDown={e=>{start.current={x:e.clientX,y:e.clientY,id:e.pointerId};}} onPointerCancel={()=>{start.current=null;}} onPointerUp={e=>{const at=start.current;start.current=null;if(at&&at.id===e.pointerId&&Math.abs(e.clientX-at.x)>70&&Math.abs(e.clientX-at.x)>Math.abs(e.clientY-at.y)*1.5)onDismiss();}}>{children}</Box>;
}
