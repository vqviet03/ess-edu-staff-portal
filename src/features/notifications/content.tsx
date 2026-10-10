"use client";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import ChatBubble from "@mui/icons-material/ChatBubble";
import EventAvailable from "@mui/icons-material/EventAvailable";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";
import EmojiEvents from "@mui/icons-material/EmojiEvents";
import CampaignOutlined from "@mui/icons-material/CampaignOutlined";
import ArticleOutlined from "@mui/icons-material/ArticleOutlined";
import ReportOutlined from "@mui/icons-material/ReportOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import type {Notification} from "@/features/materials/models";
export function notificationStyle(type:string) {
 switch(type){
 case "SOCIAL":case "REPLY":return {icon:ChatBubble,color:"#6b86b9",tint:"#e9effa"};
 case "ATTENDANCE":return {icon:EventAvailable,color:"#54876d",tint:"#e6f3ec"};
 case "SCHEDULE":return {icon:EventAvailable,color:"#a47c27",tint:"#fff2c9"};
 case "SCORE":return {icon:SchoolOutlined,color:"#8d78ae",tint:"#eee9f7"};
 case "REWARD":return {icon:EmojiEvents,color:"#6d9c73",tint:"#e9f4e7"};
 case "APPROVAL":case "CONSENT":return {icon:ReportOutlined,color:"#b87667",tint:"#f9e8e1"};
 case "MATERIAL":return {icon:ArticleOutlined,color:"#689486",tint:"#e9f3ef"};
 case "SYSTEM":return {icon:SettingsOutlined,color:"#7b8795",tint:"#edf1f5"};
 default:return {icon:CampaignOutlined,color:"#7b8795",tint:"#edf1f5"};
 }
}
export function NotificationContent({notice:n}:{notice:Notification}){
 const style=notificationStyle(n.type),Icon=style.icon,social=["SOCIAL","REPLY","MATERIAL"].includes(n.type)&&!!n.actorName&&!!n.subject;
 return <Stack direction="row" spacing={1.25} sx={{alignItems:"flex-start",minWidth:0}}>
  <Avatar sx={{width:36,height:36,bgcolor:style.tint,color:style.color,fontSize:12}}>{social?n.actorName!.trim().split(/\s+/).map(p=>p[0]).slice(-2).join(""):<Icon fontSize="small"/>}</Avatar>
  <Box sx={{minWidth:0,flex:1}}><Typography sx={{fontSize:14,overflowWrap:"anywhere"}}>{social?<><Box component="span" sx={{fontWeight:600}}>{n.actorRole} {n.actorName}</Box>{" "}{n.message||"đã cập nhật bài viết"}{" "}<Box component="strong">{n.subject}</Box></>:n.title}</Typography>
   {n.priority==="IMPORTANT"&&<Chip size="small" label="Quan trọng" color="warning" variant="outlined" sx={{mt:0.5}}/>}
  </Box>
 </Stack>;
}
