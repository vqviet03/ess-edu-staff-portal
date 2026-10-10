"use client";
import {forwardRef,useRef} from "react";
import Box,{type BoxProps} from "@mui/material/Box";

export const SwipeDismiss=forwardRef<HTMLDivElement,BoxProps&{onDismiss:()=>void}>(function SwipeDismiss({children,onDismiss,sx=[],...props},ref){
 const start=useRef<{x:number;y:number;id:number}|null>(null);
 return <Box {...props} ref={ref} sx={[{touchAction:"pan-y"},...(Array.isArray(sx)?sx:[sx])]} onPointerDown={e=>{start.current={x:e.clientX,y:e.clientY,id:e.pointerId};}} onPointerCancel={()=>{start.current=null;}} onPointerUp={e=>{const at=start.current;start.current=null;if(at&&at.id===e.pointerId&&Math.abs(e.clientX-at.x)>70&&Math.abs(e.clientX-at.x)>Math.abs(e.clientY-at.y)*1.5)onDismiss();}}>{children}</Box>;
});
