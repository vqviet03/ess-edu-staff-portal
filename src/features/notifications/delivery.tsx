"use client";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
export function StudentNotificationSelect({value,onChange}:{value:boolean|undefined;onChange:(value:boolean|undefined)=>void}){
 return <TextField size="small" select label="Thông báo cho học sinh" value={value===undefined?"":String(value)} onChange={e=>onChange(e.target.value===""?undefined:e.target.value==="true")} helperText="Mặc định không gửi khi chỉnh sửa hoặc bổ sung dữ liệu quá khứ.">
  <MenuItem value="">Theo mặc định</MenuItem><MenuItem value="true">Có gửi thông báo</MenuItem><MenuItem value="false">Không gửi thông báo</MenuItem>
 </TextField>;
}
