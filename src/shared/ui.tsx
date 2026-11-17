"use client";
import { compactRadii } from "@/theme/compact";
import { AppIcon } from "@/features/pwa/app-icon";
import {
  Children,
  Fragment,
  isValidElement,
  Suspense,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import Popover from "@mui/material/Popover";
import MoreVert from "@mui/icons-material/MoreVert";
import type { Theme } from "@mui/material/styles";
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
import { ProfileAvatar } from "@/features/profile/avatar";
import { Sidebar } from "./navigation";
import { PageBack } from "./page-back";
import { PreferencesMenu } from "./preferences-menu";
import { MobileAppBar } from "./mobile-bar";
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
    <Paper
      sx={{
        p: { xs: 1.5, md: 2.5 },
        borderRadius: compactRadii.surface,
        minWidth: 0,
      }}
    >
      {children}
    </Paper>
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
  const compact = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"));
  const split = compact ? splitActions(actions) : null;
  return (
    <Stack spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, sm: 2.5 } }}>
      <Stack
        direction="row"
        sx={{ alignItems: "center", gap: { xs: 0.5, sm: 1 } }}
      >
        <Typography
          component="h1"
          variant="h4"
          sx={{
            fontSize: { xs: 19, sm: 25, md: 30 },
            lineHeight: { xs: 1.3, sm: 1.235 },
            flex: { xs: 1, sm: "0 1 auto" },
            minWidth: 0,
            overflowWrap: "anywhere",
          }}
        >
          {title}
        </Typography>
        {split && split.overflow.length > 0 && (
          <OverflowActions>{split.overflow}</OverflowActions>
        )}
      </Stack>
      {subtitle && (
        <Typography
          color="text.secondary"
          sx={{ fontSize: { xs: 13, sm: 16 } }}
        >
          {subtitle}
        </Typography>
      )}
      {split
        ? split.visible.length > 0 && (
            <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
              {split.visible}
            </Stack>
          )
        : actions && (
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
/** Flattens fragments so page actions can be distributed one by one. */
function flattenActions(node: ReactNode): ReactElement[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement(child) && child.type === Fragment
      ? flattenActions((child.props as { children?: ReactNode }).children)
      : isValidElement(child)
        ? [child]
        : [],
  );
}
/**
 * Mobile page actions: primary actions stay visible and the remaining ones
 * move behind ⋮. Back lives in the app header for every page.
 */
function splitActions(actions: ReactNode) {
  const items = flattenActions(actions);
  const primary = (item: ReactElement) => {
    const props = item.props as { variant?: string; primary?: boolean };
    return props.variant === "contained" || props.primary === true;
  };
  let visible = items.filter(primary).slice(0, 2);
  if (!visible.length) visible = items.slice(0, 2);
  let overflow = items.filter((item) => !visible.includes(item));
  if (overflow.length === 1) {
    visible = items;
    overflow = [];
  }
  return { visible, overflow };
}
export function OverflowActions({
  children,
  label = "Thao tác khác",
}: {
  children: ReactNode;
  label?: string;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Tooltip title={label}>
        <IconButton
          aria-label={label}
          aria-haspopup="true"
          aria-expanded={!!anchor}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ flexShrink: 0 }}
        >
          <MoreVert />
        </IconButton>
      </Tooltip>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        keepMounted
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 220, py: 0.5 } } }}
      >
        <Stack
          role="group"
          aria-label={label}
          onClick={() => setAnchor(null)}
          sx={{
            "& .MuiButton-root, & .MuiIconButton-root": {
              width: "100%",
              justifyContent: "flex-start",
              border: 0,
              borderRadius: 0,
              bgcolor: "transparent",
              boxShadow: "none",
              color: "text.primary",
              fontWeight: 500,
              fontSize: 14,
              minHeight: 44,
              px: 2,
              textAlign: "left",
              "&:hover": { bgcolor: "action.hover" },
            },
          }}
        >
          {children}
        </Stack>
      </Popover>
    </>
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
  useEffect(() => {
    document.title =
      (settings.portals?.staff?.name || settings.appName) + " · Staff Portal";
  }, [settings.appName, settings.portals?.staff?.name]);
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
  const mobileLayout = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("md"),
  );
  const [reset, { isLoading }] = useResetDemoMutation();
  const resetDemo = async () => {
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
  };
  const appName = settings.portals?.staff?.name || settings.appName;
  const mobileBrand = (
    <Box
      component={Link}
      href={auth.status === "authenticated" ? "/home/" : "/login/"}
      aria-label={appName}
      title={appName}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        "& > *": { mr: "0 !important" },
      }}
    >
      <AppIcon />
    </Box>
  );
  const brand = (
    <Typography
      component={Link}
      href={auth.status === "authenticated" ? "/home/" : "/login/"}
      sx={{
        fontSize: { xs: 18, md: 20 },
        fontWeight: 700,
        color: "primary.main",
        textDecoration: "none",
        minWidth: 0,
      }}
    >
      <AppIcon />
      {appName}
    </Typography>
  );
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
        <Button disabled={isLoading} onClick={resetDemo}>
          Reset demo
        </Button>
      )}
    </Stack>
  );
  return (
    <AppScale>
      <Box
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
          {auth.status === "authenticated" && (
            <Suspense>
              <Sidebar
                manager={workspace.selected === "manager"}
                appName={appName}
              />
            </Suspense>
          )}
          <Box
            sx={{
              minWidth: 0,
            }}
          >
            {/* Only one header is mounted so controls are never duplicated;
                CSS still hides the desktop header before the query resolves. */}
            {mobileLayout && (
              <MobileAppBar
                lead={
                  <Suspense fallback={mobileBrand}>
                    <PageBack otherwise={mobileBrand} />
                  </Suspense>
                }
                brand={mobileBrand}
                authenticated={auth.status === "authenticated"}
                manager={workspace.selected === "manager"}
                avatar={
                  <ProfileAvatar
                    name={auth.session?.teacher.name ?? "Bạn"}
                    value={auth.session?.teacher.avatar}
                    size={30}
                  />
                }
                workspaces={workspace.allowed as ("manager" | "teacher")[]}
                workspace={workspace.selected as "manager" | "teacher" | null}
                onWorkspace={(value) => {
                  if (confirmLeave()) {
                    workspace.choose(value);
                    if (pathname.startsWith("/manage/")) router.push("/home/");
                  }
                }}
                onSignOut={() => void signOut()}
                signingOut={logoutState.isLoading}
                onResetDemo={useMock ? () => void resetDemo() : undefined}
              />
            )}
            {!mobileLayout && (
              <Stack
                component="header"
                direction="row"
                useFlexGap
                sx={{
                  display: { xs: "none", md: "flex" },
                  mb: 2,
                  py: 1,
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Stack direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
                  <Suspense>
                    <PageBack />
                  </Suspense>
                  {brand}
                </Stack>
                {headerControls}
              </Stack>
            )}
            <GuideLayout workspace={workspace.selected}>
              <Box component="main">{children}</Box>
            </GuideLayout>
            <Typography
              component="footer"
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 4 }}
            >
              {useMock
                ? "Bản demo · Dữ liệu giả lập được lưu trên thiết bị này."
                : `${settings.portals?.staff?.name || settings.appName} · Cổng thông tin giảng viên`}
            </Typography>
          </Box>
        </Box>
      </Box>
    </AppScale>
  );
}
