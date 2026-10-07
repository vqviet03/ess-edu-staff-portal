"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { SvgIconComponent } from "@mui/icons-material";
import Dashboard from "@mui/icons-material/DashboardOutlined";
import School from "@mui/icons-material/SchoolOutlined";
import People from "@mui/icons-material/PeopleOutlined";
import Class from "@mui/icons-material/ClassOutlined";
import Account from "@mui/icons-material/ManageAccountsOutlined";
import Label from "@mui/icons-material/LabelOutlined";
import Folder from "@mui/icons-material/FolderOutlined";
import Storage from "@mui/icons-material/StorageOutlined";
import Delete from "@mui/icons-material/DeleteOutlined";
import Notifications from "@mui/icons-material/NotificationsNone";
import Warning from "@mui/icons-material/WarningAmber";
import History from "@mui/icons-material/History";
import Settings from "@mui/icons-material/SettingsOutlined";
import MenuOpen from "@mui/icons-material/MenuOpen";
import Menu from "@mui/icons-material/Menu";
import ArrowBack from "@mui/icons-material/ArrowBack";
import Badge from "@mui/material/Badge";
import { libraryApi } from "@/api/library-api";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
const items: { label: string; href: string; icon: SvgIconComponent; entity?: string; manager?: boolean }[] = [
  { label: "Tổng quan", href: "/home/", icon: Dashboard },
  { label: "Học sinh", href: "/manage/list/?entity=students", icon: School, entity: "students", manager: true },
  { label: "Giảng viên", href: "/manage/list/?entity=teachers", icon: People, entity: "teachers", manager: true },
  { label: "Lớp học", href: "/manage/list/?entity=classes", icon: Class, entity: "classes", manager: true },
  { label: "Tài khoản", href: "/manage/list/?entity=accounts", icon: Account, entity: "accounts", manager: true },
  { label: "Nhãn phụ trách", href: "/manage/list/?entity=labels", icon: Label, entity: "labels", manager: true },
  { label: "Kho tài liệu", href: "/materials/", icon: Folder },
  { label: "Storage & dung lượng", href: "/storages/", icon: Storage, manager: true },
  { label: "Duyệt / yêu cầu xóa", href: "/deletion-requests/", icon: Delete },
  { label: "Thông báo", href: "/notifications/", icon: Notifications },
  { label: "Cảnh báo", href: "/manage/warnings/", icon: Warning, manager: true },
  { label: "Nhật ký", href: "/manage/audit/", icon: History, manager: true },
  { label: "Cấu hình ứng dụng", href: "/manage/settings/", icon: Settings, manager: true },
];
export function Sidebar({ manager, appName }: { manager: boolean; appName: string }) {
  const notices = libraryApi.endpoints.notifications.useQueryState({});
  const [collapsed, setCollapsed] = useState(false), pathname = usePathname(), params = useSearchParams();
  useEffect(() => { try { setCollapsed(localStorage.getItem("ess.staff.navigation.collapsed") === "true"); } catch {} }, []);
  const toggle = () => { setCollapsed(v => { try { localStorage.setItem("ess.staff.navigation.collapsed", String(!v)); } catch {} return !v; }); };
  return <Paper component="aside" data-testid="sidebar" data-collapsed={collapsed} sx={{ p: 1, width: { md: collapsed ? 68 : 220 }, position: { md: "sticky" }, top: 16, maxHeight: { md: "calc(100vh - 32px)" }, overflowY: "auto", transition: "width .2s ease" }}>
    <Stack direction="row" sx={{ alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
      {!collapsed && <Typography sx={{ px: 1, fontWeight: 700, overflowWrap: "anywhere" }} color="primary">{appName}</Typography>}
      <Tooltip title={collapsed ? "Mở menu" : "Thu menu"}><IconButton aria-label={collapsed ? "Mở menu" : "Thu menu"} aria-expanded={!collapsed} onClick={toggle}>{collapsed ? <Menu /> : <MenuOpen />}</IconButton></Tooltip>
    </Stack>
    <Stack component="nav" aria-label={manager ? "Menu quản lý" : "Menu giảng viên"} direction={{ xs: "row", md: "column" }} sx={{ gap: .5, mt: 1, overflowX: { xs: "auto", md: "visible" } }}>
      {items.filter(i => !i.manager || manager).map(item => {
        const active = item.entity ? ["/manage/list/", "/manage/profile/", "/manage/excel/"].includes(pathname) && params.get("entity") === item.entity : pathname === item.href || (item.href === "/home/" && ["/class/", "/session/", "/assessment/", "/scores/", "/student-score/", "/import/", "/reports/"].includes(pathname));
        const Icon = item.icon;
        return <Tooltip key={item.href} title={collapsed ? item.label : ""} placement="right"><ListItemButton component={Link} href={item.href} aria-label={item.label + (item.href === "/notifications/" && notices.data?.unreadCount ? ` (${notices.data.unreadCount})` : "")} aria-current={active ? "page" : undefined} selected={active} sx={{ borderRadius: 2, minHeight: 44, px: collapsed ? 1.5 : 1, justifyContent: collapsed ? "center" : "flex-start", flexShrink: 0, "&.Mui-selected": { bgcolor: "action.selected", color: "primary.main", boxShadow: "inset 3px 0 0 currentColor" } }}>
          <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: "inherit" }}><Badge badgeContent={item.href === "/notifications/" ? notices.data?.unreadCount : 0} color="error"><Icon /></Badge></ListItemIcon>
          {!collapsed && <ListItemText primary={item.label} slotProps={{ primary: { variant: "body2", sx: { whiteSpace: "nowrap" } } }} />}
        </ListItemButton></Tooltip>;
      })}
    </Stack>
  </Paper>;
}
export function BackButton() {
  const pathname = usePathname(), p = useSearchParams();
  if (["/home/", "/login/", "/login/link/", "/activate/"].includes(pathname)) return null;
  let target = "/home/";
  if (pathname === "/manage/profile/") target = `/manage/list/?entity=${encodeURIComponent(p.get("entity") ?? "students")}`;
  if (pathname === "/session/" || pathname === "/reports/") target = `/class/?classId=${encodeURIComponent(p.get("classId") ?? "")}`;
  if (pathname === "/assessment/") target = `/session/?${new URLSearchParams({ classId: p.get("classId") ?? "", sessionId: p.get("sessionId") ?? "" })}`;
  if (["/scores/", "/student-score/", "/import/"].includes(pathname)) target = `/assessment/?${new URLSearchParams({ classId: p.get("classId") ?? "", sessionId: p.get("sessionId") ?? "", assessmentId: p.get("assessmentId") ?? "" })}`;
  return <Box><Tooltip title="Quay lại"><IconButton component={Link} href={target} aria-label="Quay lại"><ArrowBack /></IconButton></Tooltip></Box>;
}
