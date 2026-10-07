"use client";
import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Language from "@mui/icons-material/Language";
import DarkMode from "@mui/icons-material/DarkModeOutlined";
import LightMode from "@mui/icons-material/LightModeOutlined";
import SettingsBrightness from "@mui/icons-material/SettingsBrightnessOutlined";
import { usePreferences } from "@/theme/providers";
export function PreferencesMenu() {
  const { mode, setMode } = usePreferences(), [anchor, setAnchor] = useState<HTMLElement | null>(null), [menu, setMenu] = useState<"theme" | "language">("theme");
  return <><Tooltip title="Ngôn ngữ"><IconButton aria-label="Ngôn ngữ" onClick={e => { setAnchor(e.currentTarget); setMenu("language"); }}><Language /></IconButton></Tooltip>
    <Tooltip title="Giao diện"><IconButton aria-label="Giao diện" data-mode={mode} onClick={e => { setAnchor(e.currentTarget); setMenu("theme"); }}>{mode === "dark" ? <DarkMode /> : mode === "light" ? <LightMode /> : <SettingsBrightness />}</IconButton></Tooltip>
    <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>{menu === "language" ? <MenuItem selected onClick={() => setAnchor(null)}>Tiếng Việt</MenuItem> : (["light", "dark", "system"] as const).map(m => <MenuItem key={m} selected={m === mode} onClick={() => { setMode(m); setAnchor(null); }}>{m === "light" ? "Sáng" : m === "dark" ? "Tối" : "Theo hệ thống"}</MenuItem>)}</Menu>
  </>;
}
