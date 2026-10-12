"use client";
import {useEffect,useRef,useState} from "react";
import Box from "@mui/material/Box";
import { useContentQuery } from "@/api/library-api";
export function MaterialThumbnail({
  id,
  fit = "contain",
  fill = false,
  natural = false,
}: {
  id: string;
  fit?: "contain" | "cover";
  fill?: boolean;
  natural?: boolean;
}) {
  const container=useRef<HTMLDivElement>(null),[width,setWidth]=useState<number>();
  useEffect(()=>{const node=container.current;if(!node)return;const resize=new ResizeObserver(([entry])=>{const pixels=entry.contentRect.width*(window.devicePixelRatio||1);if(pixels>0)setWidth(pixels>640?1280:pixels>256?640:256);});resize.observe(node);return()=>resize.disconnect();},[]);
  const query = useContentQuery({ id, purpose: "thumbnail", width },{skip:!width});
  return <Box ref={container} sx={{width:fill||natural?"100%":108,height:fill&&!natural?"100%":"auto",minWidth:0}}>{query.currentData ? (
    <Box
      component="img"
      src={query.currentData}
      alt=""
      loading="lazy"
      sx={{
        display: "block",
        width: fill || natural ? "100%" : "auto",
        height: fill && !natural ? "100%" : "auto",
        maxWidth: "100%",
        maxHeight: natural ? "none" : fill ? "100%" : 108,
        objectFit: fit,
      }}
    />
  ) : (
    <span aria-label="Đang tải ảnh thu nhỏ">▧</span>
  )}</Box>;
}
