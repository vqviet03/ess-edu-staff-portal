"use client";
import { Suspense, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "react-redux";
import Alert from "@mui/material/Alert";
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
import { Sidebar, BackButton } from "./navigation";
import { PreferencesMenu } from "./preferences-menu";
import { useApplicationSettings } from "@/features/settings/hooks";
import { type RootState, useAppDispatch, useAppSelector } from "@/store";
import { signedOut } from "@/store/auth";
import { useLogoutMutation, useResetDemoMutation } from "@/api/api";
import { errorMessage, useMock } from "@/api/base-query";
import { useWorkspace } from "@/features/access/hooks";
import { AppScale, DisplayTools, GuideLayout, useAppDisplay } from "@/features/help/display";
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
      <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}><Suspense><BackButton /></Suspense>
      <Typography
        component="h1"
        variant="h4"
        sx={{ fontSize: { xs: 25, md: 30 } }}
      >
        {title}
      </Typography></Stack>
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
export function Shell({ children }: { children: ReactNode }) {
  const workspace = useWorkspace(),
    pathname = usePathname();
  const { settings } = useApplicationSettings();
  useEffect(() => { document.title = settings.appName + " · Staff Portal"; }, [settings.appName]);
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
  return (
    <AppScale><Box
      sx={{
        maxWidth: 1800 / (zoom / 100),
        mx: "auto",
        p: { xs: 1.5, md: 2 },
        minHeight: "100vh",
      }}
    >
      <Box
        sx={{
          display: { md: auth.status === "authenticated" ? "grid" : "block" },
          gridTemplateColumns: "auto minmax(0,1fr)",
          gap: 3,
          alignItems: "start",
        }}
      >
        {auth.status === "authenticated" && <Suspense><Sidebar manager={workspace.selected === "manager"} appName={settings.appName} /></Suspense>}
        <Box sx={{ minWidth: 0 }}>
          <Stack
            component="header"
            direction="row"
            useFlexGap
            sx={{
              ...{ mb: 2, py: 1 },
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
                fontSize: 20,
                fontWeight: 700,
                color: "primary.main",
                textDecoration: "none",
              }}
            >
              {settings.appName}
            </Typography>
            <Stack
              direction="row"
              useFlexGap
              sx={{
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              {auth.status === "authenticated" &&
                workspace.allowed.length > 1 && (
                  <TextField
                    select
                    label="Không gian"
                    value={workspace.selected ?? ""}
                    sx={{ width: 145 }}
                    onChange={(e) => {
                      if (confirmLeave()) {
                        workspace.choose(
                          e.target.value as "manager" | "teacher",
                        );
                        if (pathname.startsWith("/manage/"))
                          router.push("/home/");
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
<Tooltip title="Đăng xuất"><IconButton aria-label="Đăng xuất" disabled={logoutState.isLoading} onClick={signOut}><LogoutIcon /></IconButton></Tooltip>
                </>
              )}
              {useMock && (
                <Button
                  disabled={isLoading}
                  onClick={async () => {
                    if (
                      confirmLeave() &&
                      window.confirm(
                        "Khôi phục dữ liệu demo ban đầu và đăng xuất?",
                      )
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
          </Stack>
          <GuideLayout workspace={workspace.selected}><Box component="main">{children}</Box></GuideLayout>
          <Typography
            component="footer"
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 4 }}
          >
            {useMock
              ? "Bản demo · Dữ liệu giả lập được lưu trên thiết bị này."
              : `${settings.appName} · Cổng thông tin giảng viên`}
          </Typography>
        </Box>
      </Box>
    </Box></AppScale>
  );
}
