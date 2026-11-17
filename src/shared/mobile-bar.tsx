"use client";
import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuIcon from "@mui/icons-material/Menu";
import Close from "@mui/icons-material/Close";
import MoreVert from "@mui/icons-material/MoreVert";
import Person from "@mui/icons-material/PersonOutlined";
import Notifications from "@mui/icons-material/NotificationsNone";
import Help from "@mui/icons-material/HelpOutlined";
import Remove from "@mui/icons-material/Remove";
import Add from "@mui/icons-material/Add";
import Check from "@mui/icons-material/Check";
import DarkMode from "@mui/icons-material/DarkModeOutlined";
import LightMode from "@mui/icons-material/LightModeOutlined";
import SettingsBrightness from "@mui/icons-material/SettingsBrightnessOutlined";
import Language from "@mui/icons-material/Language";
import Logout from "@mui/icons-material/Logout";
import RestartAlt from "@mui/icons-material/RestartAlt";
import SwapHoriz from "@mui/icons-material/SwapHoriz";
import { libraryApi } from "@/api/library-api";
import { useAppDisplay, zoomLevels } from "@/features/help/display";
import { usePreferences } from "@/theme/providers";
import { NavList } from "./navigation";

type Workspace = "manager" | "teacher";

/**
 * One-row header used below the `md` breakpoint. Navigation lives in a drawer,
 * rarely used preferences live behind the overflow menu, and the desktop
 * header/sidebar are hidden with CSS so the first paint never flashes.
 */
export function MobileAppBar({
  lead,
  brand,
  authenticated,
  manager,
  avatar,
  workspaces,
  workspace,
  onWorkspace,
  onSignOut,
  signingOut,
  onResetDemo,
}: {
  /** Leftmost slot after the menu (the app icon). */
  lead: ReactNode;
  /** App icon shown in the navigation drawer. */
  brand: ReactNode;
  authenticated: boolean;
  manager: boolean;
  avatar?: ReactNode;
  workspaces: Workspace[];
  workspace: Workspace | null;
  onWorkspace: (value: Workspace) => void;
  onSignOut: () => void;
  signingOut?: boolean;
  onResetDemo?: () => void;
}) {
  const [drawer, setDrawer] = useState(false),
    [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const display = useAppDisplay(),
    { mode, setMode } = usePreferences(),
    zoomIndex = (zoomLevels as readonly number[]).indexOf(display.zoom);
  const notices = libraryApi.endpoints.notifications.useQueryState({});
  const unread = notices.data?.unreadCount ?? 0;
  const close = () => setAnchor(null);
  return (
    <Paper
      component="header"
      data-testid="mobile-app-bar"
      elevation={0}
      sx={{
        display: { xs: "flex", md: "none" },
        alignItems: "center",
        gap: 0.25,
        position: "sticky",
        top: 8,
        zIndex: (theme) => theme.zIndex.appBar,
        mb: 1.5,
        pl: 0.5,
        pr: 0.25,
        minHeight: 52,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {authenticated && (
        <IconButton
          aria-label="Mở menu điều hướng"
          aria-expanded={drawer}
          onClick={() => setDrawer(true)}
        >
          <MenuIcon />
        </IconButton>
      )}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          pl: authenticated ? 0 : 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        {lead}
      </Box>
      {authenticated && workspaces.length > 1 && (
        // Dual-role staff switch workspaces constantly, so the switch stays
        // on the bar instead of the overflow menu.
        <TextField
          select
          size="small"
          value={workspace ?? ""}
          onChange={(e) => onWorkspace(e.target.value as Workspace)}
          slotProps={{
            select: {
              "aria-label": "Không gian",
              renderValue: (value) => (
                <Stack direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
                  <SwapHoriz sx={{ fontSize: 16 }} />
                  {value === "manager" ? "Quản lý" : "Giảng viên"}
                </Stack>
              ),
            },
          }}
          sx={{
            flex: "0 0 auto",
            width: "auto",
            minWidth: 0,
            mx: 0.25,
            "& .MuiOutlinedInput-root": {
              width: "auto",
              height: 34,
              fontSize: 13,
              fontWeight: 600,
              color: "primary.main",
              bgcolor: "action.hover",
              borderRadius: 999,
            },
            "& .MuiSelect-select": { py: 0.5, pl: 1.25 },
            "& fieldset": { borderColor: "transparent" },
          }}
        >
          {workspaces.map((value) => (
            <MenuItem key={value} value={value}>
              {value === "manager" ? "Quản lý" : "Giảng viên"}
            </MenuItem>
          ))}
        </TextField>
      )}
      {authenticated && (
        <IconButton
          component={Link}
          href="/notifications/"
          aria-label={unread ? `Thông báo (${unread} chưa đọc)` : "Thông báo"}
        >
          <Badge badgeContent={unread} color="error" max={99}>
            <Notifications />
          </Badge>
        </IconButton>
      )}
      {/* Signed-in users open account + preferences from their avatar;
          the sign-in page keeps a plain ⋮ for display preferences. */}
      <IconButton
        aria-label={authenticated && avatar ? "Tài khoản" : "Tùy chọn khác"}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          transition: (theme) =>
            theme.transitions.create(["transform", "box-shadow"], {
              duration: theme.transitions.duration.shorter,
            }),
          ...(anchor && {
            transform: "scale(0.94)",
            boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}`,
          }),
        }}
      >
        {authenticated && avatar ? avatar : <MoreVert />}
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: { sx: { minWidth: 240, maxWidth: "calc(100vw - 24px)" } },
        }}
      >
        {authenticated &&
          avatar && [
            <MenuItem
              key="profile"
              component={Link}
              href="/profile/"
              onClick={close}
            >
              <ListItemIcon>
                <Person fontSize="small" />
              </ListItemIcon>
              Hồ sơ cá nhân
            </MenuItem>,
            <Divider key="profile-d" />,
          ]}
        <MenuItem
          onClick={() => {
            close();
            display.toggle();
          }}
        >
          <ListItemIcon>
            <Help fontSize="small" />
          </ListItemIcon>
          {display.open ? "Ẩn hướng dẫn" : "Hướng dẫn"}
        </MenuItem>
        <Stack
          direction="row"
          role="group"
          aria-label="Cỡ giao diện"
          sx={{ alignItems: "center", px: 2, py: 0.5, gap: 1 }}
        >
          <Typography variant="body2" sx={{ flex: 1 }}>
            Cỡ giao diện
          </Typography>
          <IconButton
            size="small"
            aria-label="Thu nhỏ giao diện"
            disabled={zoomIndex <= 0}
            onClick={() => display.setZoom(zoomLevels[zoomIndex - 1])}
          >
            <Remove fontSize="small" />
          </IconButton>
          <Typography
            component="button"
            type="button"
            aria-label="Đặt lại kích thước 100%"
            onClick={() => display.setZoom(100)}
            sx={{
              border: 0,
              bgcolor: "transparent",
              color: "primary.main",
              font: "inherit",
              fontWeight: 700,
              fontSize: 13,
              minWidth: 44,
              cursor: "pointer",
            }}
          >
            {display.zoom}%
          </Typography>
          <IconButton
            size="small"
            aria-label="Phóng to giao diện"
            disabled={zoomIndex === zoomLevels.length - 1}
            onClick={() => display.setZoom(zoomLevels[zoomIndex + 1])}
          >
            <Add fontSize="small" />
          </IconButton>
        </Stack>
        <Divider />
        <ListSubheader sx={{ lineHeight: "32px" }}>Giao diện</ListSubheader>
        {(["light", "dark", "system"] as const).map((value) => (
          <MenuItem
            key={value}
            selected={mode === value}
            onClick={() => {
              setMode(value);
              close();
            }}
          >
            <ListItemIcon>
              {value === "light" ? (
                <LightMode fontSize="small" />
              ) : value === "dark" ? (
                <DarkMode fontSize="small" />
              ) : (
                <SettingsBrightness fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText>
              {value === "light"
                ? "Sáng"
                : value === "dark"
                  ? "Tối"
                  : "Theo hệ thống"}
            </ListItemText>
            {mode === value && <Check fontSize="small" color="primary" />}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={close}>
          <ListItemIcon>
            <Language fontSize="small" />
          </ListItemIcon>
          <ListItemText secondary="Tiếng Việt">Ngôn ngữ</ListItemText>
        </MenuItem>
        {onResetDemo && (
          <MenuItem
            onClick={() => {
              close();
              onResetDemo();
            }}
          >
            <ListItemIcon>
              <RestartAlt fontSize="small" />
            </ListItemIcon>
            Reset demo
          </MenuItem>
        )}
        {authenticated && [
          <Divider key="out-d" />,
          <MenuItem
            key="out"
            disabled={signingOut}
            onClick={() => {
              close();
              onSignOut();
            }}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon sx={{ color: "inherit" }}>
              <Logout fontSize="small" />
            </ListItemIcon>
            Đăng xuất
          </MenuItem>,
        ]}
      </Menu>
      {authenticated && (
        <Drawer
          open={drawer}
          onClose={() => setDrawer(false)}
          slotProps={{ paper: { sx: { width: 280, maxWidth: "85vw", p: 1 } } }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              pl: 1,
            }}
          >
            <Box sx={{ minWidth: 0, fontWeight: 700 }}>{brand}</Box>
            <IconButton
              aria-label="Đóng menu điều hướng"
              onClick={() => setDrawer(false)}
            >
              <Close />
            </IconButton>
          </Stack>
          <Suspense>
            <NavList
              manager={manager}
              vertical
              onNavigate={() => setDrawer(false)}
            />
          </Suspense>
        </Drawer>
      )}
    </Paper>
  );
}
