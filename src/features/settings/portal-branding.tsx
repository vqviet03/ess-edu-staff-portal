"use client";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import MenuBook from "@mui/icons-material/MenuBook";
import {useState} from "react";
import type {PortalBranding} from "@/features/pwa/models";
export function PortalBrandingEditor({label,value,onChange}:{label:string;value:PortalBranding;onChange:(value:PortalBranding)=>void}){const [error,setError]=useState("");return <Stack spacing={1.5}><Typography variant="subtitle1">{label}</Typography><TextField label={`Tên hiển thị · ${label}`} value={value.name} onChange={e=>onChange({...value,name:e.target.value})} slotProps={{htmlInput:{maxLength:80}}} helperText="Để trống để dùng tên trung tâm"/><Stack direction="row" spacing={1}><TextField label={`Màu icon · ${label}`} type="color" value={value.foreground} onChange={e=>onChange({...value,foreground:e.target.value})}/><TextField label={`Màu nền · ${label}`} type="color" value={value.background} onChange={e=>onChange({...value,background:e.target.value})}/></Stack><Stack direction="row" spacing={1} sx={{alignItems:"center"}}>{value.iconSvg?<Box component="img" src={`data:image/svg+xml,${encodeURIComponent(value.iconSvg)}`} width={48} height={48} alt={label}/>:<MenuBook sx={{fontSize:48,color:value.foreground,bgcolor:value.background,borderRadius:1}}/>}<Button component="label">Chọn SVG<input hidden type="file" accept="image/svg+xml,.svg" onChange={async e=>{const f=e.target.files?.[0];e.target.value="";if(!f)return;if(f.size>32768){setError("SVG tối đa 32 KB.");return;}setError("");onChange({...value,iconSvg:await f.text()});}}/></Button><Button onClick={()=>onChange({...value,iconSvg:null})}>Icon mặc định</Button></Stack>{error&&<Alert severity="error">{error}</Alert>}</Stack>;}
