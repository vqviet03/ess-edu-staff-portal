"use client";
import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Tooltip from "@mui/material/Tooltip";
import MoreVert from "@mui/icons-material/MoreVert";
import Edit from "@mui/icons-material/EditOutlined";
import Delete from "@mui/icons-material/DeleteOutlined";
import type { Folder } from "./models";
export function FolderMenu({ folder, edit, remove }: { folder: Folder; edit: (f: Folder) => void; remove: (f: Folder) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return <><Tooltip title={`Thao tác thư mục ${folder.name}`}><IconButton aria-label={`Thao tác thư mục ${folder.name}`} aria-haspopup="menu" aria-expanded={!!anchor} onClick={e => { e.stopPropagation(); setAnchor(e.currentTarget); }}><MoreVert /></IconButton></Tooltip>
    <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
      <MenuItem onClick={() => { setAnchor(null); edit(folder); }}><ListItemIcon><Edit fontSize="small" /></ListItemIcon>Sửa thư mục</MenuItem>
      <MenuItem onClick={() => { setAnchor(null); remove(folder); }}><ListItemIcon><Delete fontSize="small" /></ListItemIcon>Ngừng thư mục</MenuItem>
    </Menu></>;
}
