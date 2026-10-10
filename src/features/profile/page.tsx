"use client";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import Save from "@mui/icons-material/Save";
import { usePersonalProfileQuery, useSavePersonalProfileMutation } from "@/api/profile-api";
import { errorMessage } from "@/api/base-query";
import { UploadDialog } from "@/features/materials/upload";
import { useUnsaved } from "@/shared/unsaved";
import { ProfileAvatar } from "./avatar";
import { avatarColors, avatarIcons, profileError, type PersonalProfile } from "./models";
export function PersonalProfilePage() {
  const q = usePersonalProfileQuery();
  const [message,setMessage]=useState("");
  return <Stack spacing={2} sx={{maxWidth:720,mx:"auto"}}>
    <Typography component="h1" variant="h4">Hồ sơ cá nhân</Typography>
    {q.isLoading && <LinearProgress />}
    {q.error && <Alert severity="error" action={<Button onClick={()=>void q.refetch()}>Thử lại</Button>}>{errorMessage(q.error)}</Alert>}
    {message&&<Alert severity="success">{message}</Alert>}
    {q.data && <ProfileForm key={q.data.version} initial={q.data} saved={()=>setMessage("Đã lưu hồ sơ.")}/>}
  </Stack>;
}
function ProfileForm({initial,saved}:{initial:PersonalProfile;saved:()=>void}) {
  const [draft,setDraft]=useState(initial),[password,setPassword]=useState(""),[upload,setUpload]=useState(false);
  const [save,state]=useSavePersonalProfileMutation();
  const dirty=JSON.stringify(draft)!==JSON.stringify(initial);
  useUnsaved(dirty);
  const validation=profileError(draft), changedId=draft.loginId!==initial.loginId;
  const field=(key:"loginId"|"fullName"|"nickname"|"email"|"phone"|"parentPhone"|"parentName"|"dateOfBirth",value:string)=>{setDraft(d=>({...d,[key]:value||((key==="dateOfBirth"||key==="nickname")?null:"")}));};
  return <Paper component="form" sx={{p:{xs:2,md:3}} onSubmit={async e=>{
    e.preventDefault();if(validation||state.isLoading)return;
    try{await save({...draft,currentPassword:changedId?password:undefined}).unwrap();setPassword("");saved();}catch{}
  }}><Stack spacing={2}>
    <Stack direction="row" spacing={2} sx={{alignItems:"center"}}>
      <ProfileAvatar name={draft.fullName} value={draft.avatar} size={80}/>
      <Tooltip title="Tải ảnh đại diện"><IconButton aria-label="Tải ảnh đại diện" onClick={()=>setUpload(true)}><PhotoCamera/></IconButton></Tooltip>
      {draft.avatar.fileId && <Button size="small" onClick={()=>setDraft(d=>({...d,avatar:{...d.avatar,fileId:null}}))}>Dùng biểu tượng</Button>}
    </Stack>
    <Typography variant="body2">Chọn biểu tượng và màu pastel hoặc tải ảnh của bạn.</Typography>
    <Stack direction="row" sx={{flexWrap:"wrap",gap:1}}>
      {avatarIcons.map(icon=><Tooltip key={icon} title={{person:"Người",pets:"Thú cưng",rabbit:"Thỏ",nature:"Thiên nhiên",robot:"Robot",face:"Gương mặt",child:"Em bé"}[icon]}>
        <IconButton aria-label={icon} aria-pressed={!draft.avatar.fileId&&draft.avatar.icon===icon} onClick={()=>setDraft(d=>({...d,avatar:{...d.avatar,fileId:null,icon}}))} sx={{outline:draft.avatar.icon===icon&&!draft.avatar.fileId?"2px solid":"none",outlineColor:"primary.main"}}>
          <ProfileAvatar name={icon} value={{fileId:null,icon,color:draft.avatar.color}}/>
        </IconButton></Tooltip>)}
    </Stack>
    <Stack direction="row" spacing={1}>{avatarColors.map(color=><IconButton key={color} aria-label={`Màu ${color}`} aria-pressed={draft.avatar.color===color} onClick={()=>setDraft(d=>({...d,avatar:{...d.avatar,color}}))} sx={{border:draft.avatar.color===color?"2px solid":"1px solid",borderColor:"primary.main",width:36,height:36}}><Box sx={{bgcolor:color,width:24,height:24,borderRadius:"50%"}}/></IconButton>)}</Stack>
    <TextField size="small" label="Họ tên" value={draft.fullName} onChange={e=>field("fullName",e.target.value)} required slotProps={{htmlInput:{maxLength:200}}}/>
    <Stack direction={{xs:"column",sm:"row"}} spacing={2}>
      <TextField fullWidth size="small" label="Biệt danh" value={draft.nickname??""} onChange={e=>field("nickname",e.target.value)}/>
      <TextField fullWidth size="small" label="Ngày sinh" type="date" value={draft.dateOfBirth??""} onChange={e=>field("dateOfBirth",e.target.value)} slotProps={{inputLabel:{shrink:true}}}/>
    </Stack>
    <TextField size="small" label="ID đăng nhập" value={draft.loginId} onChange={e=>field("loginId",e.target.value)} required helperText="Đổi ID cần mật khẩu hiện tại. ID hồ sơ và dữ liệu học tập được giữ nguyên."/>
    {changedId&&<TextField size="small" label="Mật khẩu hiện tại" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/>}
    <TextField size="small" label="Email cá nhân" type="email" value={draft.email} onChange={e=>field("email",e.target.value)} helperText="Có thể dùng email này để đăng nhập cùng mật khẩu."/>
    <TextField size="small" label="Số điện thoại cá nhân" type="tel" value={draft.phone} onChange={e=>field("phone",e.target.value)} helperText="Có thể dùng số này để đăng nhập; số phụ huynh chỉ dùng liên hệ."/>
    <TextField size="small" label="Tên phụ huynh" value={draft.parentName} onChange={e=>field("parentName",e.target.value)}/>
    <TextField size="small" label="Số điện thoại phụ huynh" type="tel" value={draft.parentPhone} onChange={e=>field("parentPhone",e.target.value)}/>
    {validation&&<Alert severity="warning">{validation}</Alert>}
    {state.error&&<Alert severity="error">{errorMessage(state.error)}</Alert>}
    <Button size="small" startIcon={<Save/>} type="submit" variant="contained" loading={state.isLoading} disabled={!dirty||!!validation||changedId&&!password}>Lưu hồ sơ</Button>
  </Stack>
  {upload&&<UploadDialog source="avatar" folderId={null} close={()=>setUpload(false)} added={f=>{setDraft(d=>({...d,avatar:{...d.avatar,fileId:f.id}}));setUpload(false);}}/>}
  </Paper>;
}
