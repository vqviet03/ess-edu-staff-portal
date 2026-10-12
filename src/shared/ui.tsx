"use client";
import { Suspense, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useStore } from "react-redux";
import Alert from "@mui/material/Alert";
import Popover from "@mui/material/Popover";
import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import { AssignmentSurface } from "@/features/assignments/surface";
import { useClassQuery } from "@/api/api";
import { useClassCapabilities } from "@/features/access/hooks";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import LogoutIcon from "@mui/icons-material/Logout";
import { ProfileAvatar } from "@/features/profile/avatar";
import { Sidebar, BackButton } from "./navigation";
import { PreferencesMenu } from "./preferences-menu";
import { useApplicationSettings } from "@/features/settings/hooks";
import { type RootState, useAppDispatch, useAppSelector } from "@/store";
import { signedOut } from "@/store/auth";
import { useLogoutMutation, useResetDemoMutation } from "@/api/api";
import { errorMessage, useMock } from "@/api/base-query";
import { useWorkspace } from "@/features/access/hooks";
import {
  AppScale,
  DisplayTools,
  GuideLayout,
  useAppDisplay,
} from "@/features/help/display";
import { confirmLeave } from "./unsaved";
export function Feedback({
  loading,
  error,
  empty,
  retry,
}: {
  loading?: boolean;
  error?: unknown;
  empty?: string;
  retry?: () => void;
}) {
  if (loading)
    return (
      <Box role="status" sx={{ py: 4 }}>
        <Typography sx={{ mb: 2 }}>Đang tải…</Typography>
        <LinearProgress />
      </Box>
    );
  if (error)
    return (
      <Alert
        severity="error"
        action={retry && <Button onClick={retry}>Thử lại</Button>}
      >
        {errorMessage(error)}
      </Alert>
    );
  if (empty)
    return (
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">{empty}</Typography>
      </Paper>
    );
  return null;
}
export function Card({ children }: { children: ReactNode }) {
  return (
    <Paper sx={{ p: { xs: 2.5, md: 2.5 }, minWidth: 0 }}>{children}</Paper>
  );
}
export function Title({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <Stack spacing={2} sx={{ mb: 2.5 }}>
      <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
        <Suspense>
          <BackButton />
        </Suspense>
        <Typography
          component="h1"
          variant="h4"
          sx={{ fontSize: { xs: 25, md: 30 } }}
        >
          {title}
        </Typography>
      </Stack>
      {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
      {actions && (
        <Stack
          direction="row"
          useFlexGap
          sx={{
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
export const labelStatus: Record<string, string> = {
  ACTIVE: "Đang học",
  COMPLETED: "Hoàn thành",
  PAUSED: "Tạm dừng",
  INACTIVE: "Ngừng học",
  DRAFT: "Nháp",
};
export function StatusChip({ status }: { status: string }) {
  return (
    <Chip
      label={labelStatus[status] ?? status}
      color={status === "COMPLETED" ? "success" : "default"}
      size="small"
    />
  );
}
export function NavButton({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <Button
      component={Link}
      href={href}
      variant={primary ? "contained" : "outlined"}
    >
      {children}
    </Button>
  );
}
export function Progress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  return (
    <Stack spacing={1} sx={{ minWidth: 130 }}>
      <Typography variant="body2">
        {completed}/{total} Unit ·{" "}
        {total ? Math.round((completed / total) * 100) : 0}%
      </Typography>
      <LinearProgress
        variant="determinate"
        value={total ? Math.min(100, (completed / total) * 100) : 0}
      />
    </Stack>
  );
}
function AssignmentBreadcrumb({ appName }: { appName: string }) {
  const params = useSearchParams(),
    classId = params.get("classId") ?? "",
    access = useClassCapabilities(classId);
  const room = useClassQuery(classId, {
    skip: !classId || !access.viewLearning,
  });
  return (
    <>
      {appName}
      {room.currentData?.name ? ` / ${room.currentData.name}` : ""}
    </>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  const workspace = useWorkspace(),
    pathname = usePathname();
  const { settings } = useApplicationSettings();
  useEffect(() => {
    document.title = settings.appName + " · Staff Portal";
  }, [settings.appName]);
  const auth = useAppSelector((s) => s.auth),
    dispatch = useAppDispatch(),
    router = useRouter();
  const store = useStore<RootState>();
  const [logout, logoutState] = useLogoutMutation();
  const signOut = async () => {
    if (!confirmLeave()) return;
    const token = store.getState().auth.session?.accessToken;
    try {
      await logout().unwrap();
    } catch {
      /* Always clear the browser session if revocation cannot reach the backend. */
    } finally {
      if (store.getState().auth.session?.accessToken === token) {
        dispatch(signedOut());
        router.replace("/login/");
      }
    }
  };
  const { zoom } = useAppDisplay();
  const [reset, { isLoading }] = useResetDemoMutation();
  const assignmentRoute = /^\/assignment(?:-report)?\/?$/.test(pathname),
    theme = useTheme();
  const [optionsAnchor, setOptionsAnchor] = useState<HTMLElement | null>(null);
  const headerControls = (
    <Stack
      direction="row"
      useFlexGap
      sx={{
        alignItems: "center",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      {auth.status === "authenticated" && workspace.allowed.length > 1 && (
        <TextField
          select
          label="Không gian"
          value={workspace.selected ?? ""}
          sx={{ width: 145 }}
          onChange={(e) => {
            if (confirmLeave()) {
              workspace.choose(e.target.value as "manager" | "teacher");
              if (pathname.startsWith("/manage/")) router.push("/home/");
            }
          }}
        >
          <MenuItem value="manager">Quản lý</MenuItem>
          <MenuItem value="teacher">Giảng viên</MenuItem>
        </TextField>
      )}
      <DisplayTools />
      <PreferencesMenu />
      {auth.status === "authenticated" && (
        <>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            {auth.session?.teacher.roles?.includes("MANAGER")
              ? "Quản lý"
              : "Giảng viên"}{" "}
            · {auth.session?.teacher.name}
          </Typography>
          <Tooltip title="Hồ sơ cá nhân">
            <IconButton
              component={Link}
              href="/profile/"
              aria-label="Hồ sơ cá nhân"
            >
              <ProfileAvatar
                name={auth.session?.teacher.name ?? "Bạn"}
                value={auth.session?.teacher.avatar}
                size={30}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title="Đăng xuất">
            <IconButton
              aria-label="Đăng xuất"
              disabled={logoutState.isLoading}
              onClick={signOut}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </>
      )}
      {useMock && (
        <Button
          disabled={isLoading}
          onClick={async () => {
            if (
              confirmLeave() &&
              window.confirm("Khôi phục dữ liệu demo ban đầu và đăng xuất?")
            ) {
              try {
                await reset().unwrap();
                dispatch(signedOut());
                router.replace("/login/");
              } catch (e) {
                window.alert(errorMessage(e));
              }
            }
          }}
        >
          Reset demo
        </Button>
      )}
    </Stack>
  );
  const content = (
    <AppScale>
      <Box
        sx={{
          maxWidth: (assignmentRoute ? 1200 : 1800) / (zoom / 100),
          mx: "auto",
          p: assignmentRoute ? 0 : { xs: 1.5, md: 2 },
          bgcolor: assignmentRoute ? "var(--a-bg)" : undefined,
          minHeight: "100vh",
        }}
      >
        <Box
          sx={{
            display: { md: auth.status === "authenticated" ? "grid" : "block" },
            gridTemplateColumns: "auto minmax(0,1fr)",
            gap: assignmentRoute ? 0 : 3,
            alignItems: "start",
          }}
        >
          {auth.status === "authenticated" && (
            <Suspense>
              <Sidebar
                manager={workspace.selected === "manager"}
                appName={settings.appName}
                assignment={assignmentRoute}
              />
            </Suspense>
          )}
          <Box
            sx={{
              minWidth: 0,
              p: assignmentRoute ? { xs: 2, md: 3.5 } : undefined,
            }}
          >
            <Stack
              component="header"
              className={assignmentRoute ? "assignment-topbar" : undefined}
              direction="row"
              useFlexGap
              sx={{
                ...{
                  mb: assignmentRoute ? 2.5 : 2,
                  py: assignmentRoute ? 0 : 1,
                },
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Typography
                component={Link}
                href={auth.status === "authenticated" ? "/home/" : "/login/"}
                sx={{
                  fontSize: assignmentRoute ? 12 : 20,
                  fontWeight: assignmentRoute ? 400 : 700,
                  color: assignmentRoute ? "text.secondary" : "primary.main",
                  textDecoration: "none",
                }}
              >
                {assignmentRoute ? (
                  <Suspense fallback={settings.appName}>
                    <AssignmentBreadcrumb appName={settings.appName} />
                  </Suspense>
                ) : (
                  settings.appName
                )}
              </Typography>
              {assignmentRoute ? (
                <>
                  <Button
                    aria-label="Tuỳ chọn giao diện và tài khoản"
                    onClick={(e) => setOptionsAnchor(e.currentTarget)}
                    sx={{
                      p: 0,
                      minHeight: 18,
                      bgcolor: "transparent",
                      color: "text.secondary",
                      fontSize: 12,
                      fontWeight: 400,
                    }}
                  >
                    {workspace.selected === "manager"
                      ? "Quản lý"
                      : "Giảng viên"}{" "}
                    · VI · {theme.palette.mode === "dark" ? "Tối" : "Sáng"}
                  </Button>
                  <Popover
                    open={!!optionsAnchor}
                    anchorEl={optionsAnchor}
                    onClose={() => setOptionsAnchor(null)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                  >
                    <Box sx={{ p: 1.5, maxWidth: 480 }}>{headerControls}</Box>
                  </Popover>
                </>
              ) : (
                headerControls
              )}
            </Stack>
            <GuideLayout workspace={workspace.selected}>
              <Box component="main">{children}</Box>
            </GuideLayout>
            <Typography
              component="footer"
              variant="caption"
              color="text.secondary"
              sx={{ display: assignmentRoute ? "none" : "block", mt: 4 }}
            >
              {useMock
                ? "Bản demo · Dữ liệu giả lập được lưu trên thiết bị này."
                : `${settings.appName} · Cổng thông tin giảng viên`}
            </Typography>
          </Box>
        </Box>
      </Box>
    </AppScale>
  );
  return assignmentRoute ? (
    <AssignmentSurface>{content}</AssignmentSurface>
  ) : (
    content
  );
}
