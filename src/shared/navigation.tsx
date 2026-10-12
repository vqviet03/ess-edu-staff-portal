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
import Assignment from "@mui/icons-material/AssignmentOutlined";
import Assessment from "@mui/icons-material/AssessmentOutlined";
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
const items: {
  label: string;
  href: string;
  icon: SvgIconComponent;
  entity?: string;
  manager?: boolean;
}[] = [
  { label: "Hồ sơ cá nhân", href: "/profile/", icon: Account },
  { label: "Tổng quan", href: "/home/", icon: Dashboard },
  {
    label: "Học sinh",
    href: "/manage/list/?entity=students",
    icon: School,
    entity: "students",
    manager: true,
  },
  {
    label: "Giảng viên",
    href: "/manage/list/?entity=teachers",
    icon: People,
    entity: "teachers",
    manager: true,
  },
  {
    label: "Lớp học",
    href: "/manage/list/?entity=classes",
    icon: Class,
    entity: "classes",
    manager: true,
  },
  {
    label: "Tài khoản",
    href: "/manage/list/?entity=accounts",
    icon: Account,
    entity: "accounts",
    manager: true,
  },
  {
    label: "Nhãn phụ trách",
    href: "/manage/list/?entity=labels",
    icon: Label,
    entity: "labels",
    manager: true,
  },
  { label: "Kho tài liệu", href: "/materials/", icon: Folder },
  {
    label: "Storage & dung lượng",
    href: "/storages/",
    icon: Storage,
    manager: true,
  },
  { label: "Duyệt / yêu cầu xóa", href: "/deletion-requests/", icon: Delete },
  { label: "Thông báo", href: "/notifications/", icon: Notifications },
  {
    label: "Cảnh báo",
    href: "/manage/warnings/",
    icon: Warning,
    manager: true,
  },
  { label: "Nhật ký", href: "/manage/audit/", icon: History, manager: true },
  {
    label: "Cấu hình ứng dụng",
    href: "/manage/settings/",
    icon: Settings,
    manager: true,
  },
];
export function Sidebar({
  manager,
  appName,
  assignment = false,
}: {
  manager: boolean;
  appName: string;
  assignment?: boolean;
}) {
  const notices = libraryApi.endpoints.notifications.useQueryState({});
  const [collapsed, setCollapsed] = useState(false),
    pathname = usePathname(),
    params = useSearchParams();
  useEffect(() => {
    try {
      setCollapsed(
        localStorage.getItem("ess.staff.navigation.collapsed") === "true",
      );
    } catch {}
  }, []);
  const toggle = () => {
    setCollapsed((v) => {
      try {
        localStorage.setItem("ess.staff.navigation.collapsed", String(!v));
      } catch {}
      return !v;
    });
  };
  return (
    <Paper
      component="aside"
      data-testid="sidebar"
      data-collapsed={collapsed}
      sx={{
        display: assignment ? { xs: "none", md: "block" } : undefined,
        alignSelf: "start",
        p: assignment ? 2.5 : 1,
        width: { md: collapsed ? 68 : assignment ? 180 : 220 },
        position: { md: "sticky" },
        top: assignment ? 0 : 16,
        maxHeight: { md: "calc(100vh - 32px)" },
        overflowY: "auto",
        transition: "width .2s ease",
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
        }}
      >
        {!collapsed && (
          <Typography
            sx={{
              px: assignment ? 0 : 1,
              fontSize: assignment ? 18 : undefined,
              fontWeight: 700,
              overflowWrap: "anywhere",
            }}
            color="primary"
          >
            {appName}
          </Typography>
        )}
        <Tooltip title={collapsed ? "Mở menu" : "Thu menu"}>
          <IconButton
            sx={
              assignment
                ? {
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    minHeight: 24,
                    p: 0,
                    bgcolor: "transparent",
                  }
                : undefined
            }
            aria-label={collapsed ? "Mở menu" : "Thu menu"}
            aria-expanded={!collapsed}
            onClick={toggle}
          >
            {collapsed ? <Menu /> : <MenuOpen />}
          </IconButton>
        </Tooltip>
      </Stack>
      {assignment && !collapsed && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            mt: 1,
            mb: 1.5,
            borderBottom: 1,
            borderColor: "divider",
            pb: 1.5,
          }}
        >
          STAFF PORTAL
        </Typography>
      )}
      <Stack
        component="nav"
        aria-label={manager ? "Menu quản lý" : "Menu giảng viên"}
        direction={{ xs: "row", md: "column" }}
        sx={{ gap: 0.5, mt: 1, overflowX: { xs: "auto", md: "visible" } }}
      >
        {(assignment
          ? [
              { label: "Tổng quan", href: "/home/", icon: Dashboard },
              {
                label: "Lớp học",
                href: params.get("classId")
                  ? `/class/?classId=${encodeURIComponent(params.get("classId")!)}`
                  : "/home/",
                icon: Class,
              },
              {
                label: "Bài tập",
                href: `/class/?classId=${encodeURIComponent(params.get("classId") ?? "")}`,
                icon: Assignment,
              },
              {
                label: "Báo cáo",
                href: params.get("classId")
                  ? `/assignment-report/?classId=${encodeURIComponent(params.get("classId")!)}${params.get("studentId") ? `&studentId=${encodeURIComponent(params.get("studentId")!)}` : ""}`
                  : "/home/",
                icon: Assessment,
              },
              {
                label: "Thông báo",
                href: "/notifications/",
                icon: Notifications,
              },
              { label: "Tài khoản", href: "/profile/", icon: Account },
            ]
          : items.filter((i) => !i.manager || manager)
        ).map(
          (item: {
            label: string;
            href: string;
            icon: SvgIconComponent;
            entity?: string;
            manager?: boolean;
          }) => {
            const active = assignment
              ? item.label ===
                (pathname.includes("assignment-report") ? "Báo cáo" : "Bài tập")
              : item.entity
                ? [
                    "/manage/list/",
                    "/manage/profile/",
                    "/manage/excel/",
                  ].includes(pathname) && params.get("entity") === item.entity
                : pathname === item.href ||
                  (item.href === "/home/" &&
                    [
                      "/class/",
                      "/student/",
                      "/session/",
                      "/assessment/",
                      "/scores/",
                      "/student-score/",
                      "/import/",
                      "/reports/",
                    ].includes(pathname));
            const Icon = item.icon;
            return (
              <Tooltip
                key={item.label}
                title={collapsed ? item.label : ""}
                placement="right"
              >
                <ListItemButton
                  component={Link}
                  href={item.href}
                  aria-label={
                    item.label +
                    (item.href === "/notifications/" &&
                    notices.data?.unreadCount
                      ? ` (${notices.data.unreadCount})`
                      : "")
                  }
                  aria-current={active ? "page" : undefined}
                  selected={active}
                  sx={{
                    borderRadius: 2,
                    minHeight: assignment ? 32 : 44,
                    py: assignment ? 0 : undefined,
                    px: collapsed ? 1.5 : assignment ? 0 : 1,
                    justifyContent: collapsed ? "center" : "flex-start",
                    flexShrink: 0,
                    "&.Mui-selected": {
                      bgcolor: assignment ? "transparent" : "action.selected",
                      color: "primary.main",
                      boxShadow: assignment
                        ? "none"
                        : "inset 3px 0 0 currentColor",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      display: assignment && !collapsed ? "none" : "flex",
                      minWidth: collapsed ? 0 : 36,
                      color: "inherit",
                    }}
                  >
                    <Badge
                      badgeContent={
                        item.href === "/notifications/"
                          ? notices.data?.unreadCount
                          : 0
                      }
                      color="error"
                    >
                      <Icon />
                    </Badge>
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      slotProps={{
                        primary: {
                          variant: assignment ? "body1" : "body2",
                          sx: {
                            whiteSpace: "nowrap",
                            fontWeight: assignment ? 700 : undefined,
                          },
                        },
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          },
        )}
      </Stack>
    </Paper>
  );
}
export function BackButton() {
  const pathname = usePathname(),
    p = useSearchParams();
  if (["/home/", "/login/", "/login/link/", "/activate/"].includes(pathname))
    return null;
  let target = "/home/";
  if (pathname === "/manage/profile/")
    target = `/manage/list/?entity=${encodeURIComponent(p.get("entity") ?? "students")}`;
  if (["/session/", "/reports/", "/student/"].includes(pathname))
    target = `/class/?classId=${encodeURIComponent(p.get("classId") ?? "")}&tab=${pathname === "/session/" ? "progress" : "profile"}`;
  if (pathname === "/assessment/")
    target = `/session/?${new URLSearchParams({ classId: p.get("classId") ?? "", sessionId: p.get("sessionId") ?? "" })}`;
  if (["/scores/", "/student-score/", "/import/"].includes(pathname))
    target = `/assessment/?${new URLSearchParams({ classId: p.get("classId") ?? "", sessionId: p.get("sessionId") ?? "", assessmentId: p.get("assessmentId") ?? "" })}`;
  return (
    <Box>
      <Tooltip title="Quay lại">
        <IconButton component={Link} href={target} aria-label="Quay lại">
          <ArrowBack />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
