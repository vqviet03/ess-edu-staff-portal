"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { usePreferences } from "@/theme/providers";
import { type RootState, useAppDispatch, useAppSelector } from "@/store";
import { signedOut } from "@/store/auth";
import { useLogoutMutation, useResetDemoMutation } from "@/api/api";
import { errorMessage, useMock } from "@/api/base-query";
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
      <Typography
        component="h1"
        variant="h4"
        sx={{ fontSize: { xs: 25, md: 30 } }}
      >
        {title}
      </Typography>
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
  const { mode, setMode } = usePreferences(),
    auth = useAppSelector((s) => s.auth),
    dispatch = useAppDispatch(),
    router = useRouter();
  const store = useStore<RootState>();
  const [logout, logoutState] = useLogoutMutation();
  const signOut = async () => {
    if (!confirmLeave()) return;
    const token = store.getState().auth.session?.accessToken;
    try { await logout().unwrap(); } catch { /* Always clear the browser session if revocation cannot reach the backend. */ }
    finally {
      if (store.getState().auth.session?.accessToken === token) {
        dispatch(signedOut());
        router.replace("/login/");
      }
    }
  };
  const [reset, { isLoading }] = useResetDemoMutation();
  return (
    <Box
      sx={{
        maxWidth: 1600,
        mx: "auto",
        p: { xs: 2.5, md: 4 },
        minHeight: "100vh",
      }}
    >
      <Stack
        component="header"
        direction="row"
        useFlexGap
        sx={{
          ...{ mb: { xs: 3, md: 4 } },
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
          ◈ ESS
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
          <TextField select label="Ngôn ngữ" value="vi" sx={{ width: 125 }}>
            <MenuItem value="vi">Tiếng Việt</MenuItem>
          </TextField>
          <TextField
            select
            label="Giao diện"
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
            sx={{ width: 150 }}
          >
            <MenuItem value="light">Sáng</MenuItem>
            <MenuItem value="dark">Tối</MenuItem>
            <MenuItem value="system">Theo hệ thống</MenuItem>
          </TextField>
          {auth.status === "authenticated" && (
            <>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: { xs: "none", sm: "block" } }}
              >
                {auth.session?.teacher.roles?.includes("ADMIN") ? "Quản trị viên" : "Giảng viên"} · {auth.session?.teacher.name}
              </Typography>
              <Button
                loading={logoutState.isLoading}
                onClick={signOut}
              >
                Đăng xuất
              </Button>
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
      </Stack>
      <Box component="main">{children}</Box>
      <Typography
        component="footer"
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 4 }}
      >
        {useMock
          ? "Bản demo · Dữ liệu giả lập được lưu trên thiết bị này."
          : "ESS · Cổng thông tin giảng viên"}
      </Typography>
    </Box>
  );
}
