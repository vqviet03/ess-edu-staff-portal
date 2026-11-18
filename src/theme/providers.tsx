"use client";
import Grow from "@mui/material/Grow";
import { compactControls } from "@/theme/compact";
import { RealtimeBoundary } from "@/shared/realtime-activity";
import { RouteStateProvider } from "@/shared/route-state";
import { NavigationRuntime } from "@/shared/page-navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PwaRuntime } from "@/features/pwa/runtime";
import { Provider } from "react-redux";
import { setupListeners } from "@reduxjs/toolkit/query";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { viVN } from "@mui/material/locale";
import CssBaseline from "@mui/material/CssBaseline";
import { makeStore } from "@/store";
import { AppDisplayProvider } from "@/features/help/display";
import { WorkspaceRuntime } from "@/features/access/hooks";
import { AuthRuntime } from "@/features/auth/runtime";
import { UnsavedRuntime } from "@/shared/unsaved";
import { OperationsRuntime } from "@/features/operations/runtime";
// Motion curves shared by the theme.
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const EMPHASIZED = "cubic-bezier(0.2, 0, 0, 1)";
const DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)";
type Mode = "light" | "dark" | "system";
const Preferences = createContext<{
  mode: Mode;
  setMode: (mode: Mode) => void;
}>({ mode: "system", setMode: () => {} });
export const usePreferences = () => useContext(Preferences);
export function Providers({ children }: { children: ReactNode }) {
  const [store] = useState(() => makeStore()),
    [mode, setChoice] = useState<Mode>("system"),
    [systemDark, setSystemDark] = useState(false);
  useEffect(() => setupListeners(store.dispatch), [store]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("learnleaf.theme");
      if (saved === "light" || saved === "dark" || saved === "system")
        setChoice(saved);
    } catch {}
    const media = matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    const change = () => setSystemDark(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const setMode = (value: Mode) => {
    setChoice(value);
    try {
      localStorage.setItem("learnleaf.theme", value);
    } catch {}
  };
  const dark = mode === "dark" || (mode === "system" && systemDark);
  const theme = useMemo(
    () =>
      createTheme(
        {
          palette: {
            mode: dark ? "dark" : "light",
            action: { selected: dark ? "#294535" : "#e2f1e7" },
            primary: { main: dark ? "#9cdbb8" : "#317b58" },
            background: {
              default: dark ? "#14251d" : "#f4f8f5",
              paper: dark ? "#20372b" : "#ffffff",
            },
            text: {
              primary: dark ? "#e4f1e8" : "#203c30",
              secondary: dark ? "#b4c9bb" : "#60776b",
            },
            divider: dark ? "#3c5546" : "#dce7df",
            success: { main: dark ? "#a5ddb9" : "#317b58" },
          },
          typography: {
            fontFamily: "Roboto, sans-serif",
            fontSize: 14,
            h4: {
              fontSize: "1.875rem",
              fontWeight: 700,
              "@media (max-width:599.95px)": { fontSize: "1.25rem" },
            },
            h5: {
              fontSize: "1.25rem",
              fontWeight: 700,
              "@media (max-width:599.95px)": { fontSize: "1.1rem" },
            },
            h6: { fontSize: "1.1rem", fontWeight: 700 },
            button: { textTransform: "none", fontWeight: 600 },
          },
          shape: { borderRadius: 16 },
          // Shared motion: springy (slightly overshooting) easing for things that
          // appear or move, emphasized easing for colour changes. Only transform and
          // opacity animate, so interactions stay smooth; reduced motion disables it.
          transitions: {
            easing: {
              easeInOut: "cubic-bezier(0.2, 0, 0, 1)",
              easeOut: "cubic-bezier(0.05, 0.7, 0.1, 1)",
              easeIn: "cubic-bezier(0.3, 0, 0.8, 0.15)",
              sharp: "cubic-bezier(0.2, 0, 0, 1)",
            },
            duration: {
              shortest: 120,
              shorter: 180,
              short: 220,
              standard: 280,
              complex: 360,
              enteringScreen: 300,
              leavingScreen: 200,
            },
          },
          components: {
            MuiCssBaseline: {
              styleOverrides: {
                // Mobile browsers zoom the page when a focused field is under
                // 16px; keep typing text at 16px on touch screens instead.
                "@media (pointer: coarse)": {
                  "input, textarea, select": { fontSize: "16px !important" },
                },
                "@media (prefers-reduced-motion: reduce)": {
                  "*, *::before, *::after": {
                    animationDuration: "1ms !important",
                    transitionDuration: "1ms !important",
                  },
                },
              },
            },
            // Press: a quick squash, then an elastic bounce back on release.
            MuiButtonBase: {
              styleOverrides: {
                root: {
                  transition: `transform 460ms ${SPRING}, background-color 180ms ${EMPHASIZED}, color 180ms ${EMPHASIZED}, box-shadow 180ms ${EMPHASIZED}`,
                  "&:active:not(.Mui-disabled)": {
                    transform: "scale(1.05, 0.92)",
                    transition: `transform 90ms ease-out, background-color 180ms ${EMPHASIZED}`,
                  },
                },
              },
            },
            // Wide rows squash less so lists don't wobble.
            MuiMenuItem: {
              styleOverrides: {
                root: {
                  "&&:active:not(.Mui-disabled)": { transform: "scale(0.985)" },
                },
              },
            },
            MuiListItemButton: {
              styleOverrides: {
                root: {
                  "&&:active:not(.Mui-disabled)": { transform: "scale(0.985)" },
                },
              },
            },
            // Menus, popovers, dialogs and toasts pop open with a spring.
            MuiPopover: {
              defaultProps: {
                transitionDuration: { enter: 340, exit: 160 },
                slotProps: {
                  transition: { easing: { enter: SPRING, exit: EMPHASIZED } },
                },
              },
            },
            MuiMenu: {
              defaultProps: {
                transitionDuration: { enter: 340, exit: 160 },
                slotProps: {
                  transition: { easing: { enter: SPRING, exit: EMPHASIZED } },
                },
              },
            },
            MuiDialog: {
              defaultProps: {
                slots: { transition: Grow },
                transitionDuration: { enter: 380, exit: 180 },
                slotProps: {
                  transition: { easing: { enter: SPRING, exit: EMPHASIZED } },
                },
              },
            },
            MuiDrawer: {
              defaultProps: {
                transitionDuration: { enter: 420, exit: 240 },
                slotProps: {
                  transition: { easing: { enter: DRAWER, exit: EMPHASIZED } },
                },
              },
            },
            MuiCollapse: {
              defaultProps: {
                timeout: 320,
                easing: { enter: DRAWER, exit: EMPHASIZED },
              },
            },
            MuiTabs: {
              styleOverrides: {
                // Drawn on the selected tab itself (below): the measured indicator
                // is misplaced under the app's CSS zoom.
                indicator: { display: "none" },
              },
            },
            MuiSwitch: {
              styleOverrides: {
                switchBase: {
                  transition: `transform 380ms ${SPRING} !important`,
                },
                thumb: {
                  transition: `transform 380ms ${SPRING}`,
                },
              },
            },
            // Dragging a slider swells the thumb; releasing snaps it with a spring.
            MuiSlider: {
              styleOverrides: {
                thumb: {
                  transition: `left 360ms ${SPRING}, bottom 360ms ${SPRING}, transform 360ms ${SPRING}, box-shadow 150ms ease`,
                  "&.Mui-active": {
                    transform: "translate(-50%, -50%) scale(1.3)",
                  },
                },
                track: {
                  transition: `width 360ms ${SPRING}, left 360ms ${SPRING}`,
                },
                dragging: {
                  "& .MuiSlider-thumb, & .MuiSlider-track": {
                    transition: "transform 120ms ease-out",
                  },
                },
              },
            },
            MuiSnackbar: {
              defaultProps: {
                anchorOrigin: { vertical: "top", horizontal: "center" },
                slotProps: {
                  transition: { easing: { enter: SPRING, exit: EMPHASIZED } },
                },
              },
            },
            // Compact toasts at the top of the screen.
            MuiSnackbarContent: {
              styleOverrides: {
                root: {
                  minWidth: 0,
                  padding: "4px 12px",
                  borderRadius: 12,
                  fontSize: 13,
                  maxWidth: "calc(100vw - 24px)",
                },
                message: { padding: "6px 0" },
              },
            },
            MuiButton: {
              defaultProps: { disableElevation: true, size: "small" },
              styleOverrides: {
                root: {
                  borderRadius: 8,
                  "@media (pointer: coarse)": { minHeight: 44 },
                },
              },
            },
            MuiIconButton: {
              defaultProps: { size: "small" },
              styleOverrides: {
                root: {
                  "@media (pointer: coarse)": { minWidth: 44, minHeight: 44 },
                },
              },
            },
            MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
            MuiFormControl: { defaultProps: { size: "small" } },
            MuiSelect: { defaultProps: { size: "small" } },
            MuiInputBase: { defaultProps: { size: "small" } },
            MuiChip: { defaultProps: { size: "small" } },
            MuiOutlinedInput: {
              styleOverrides: { root: { borderRadius: 8 } },
            },
            MuiPaper: {
              defaultProps: { elevation: 0 },
              styleOverrides: {
                root: {
                  border: "1px solid",
                  borderColor: dark ? "#3c5546" : "#dce7df",
                },
              },
            },
            MuiTableCell: {
              styleOverrides: {
                root: {
                  borderBottom: "1px solid",
                  borderColor: dark ? "#3c5546" : "#dce7df",
                },
                head: {
                  fontWeight: 600,
                  background: dark ? "#294535" : "#f4f8f5",
                },
              },
            },
            MuiTab: {
              styleOverrides: {
                root: {
                  "&&:active:not(.Mui-disabled)": { transform: "scale(0.96)" },
                  position: "relative",
                  "&.Mui-selected::after": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 2,
                    borderRadius: "2px 2px 0 0",
                    backgroundColor: "currentColor",
                    animation: `ess-tab-underline 380ms ${SPRING} both`,
                  },
                  "@keyframes ess-tab-underline": {
                    from: { transform: "scaleX(0.2)", opacity: 0 },
                    to: { transform: "scaleX(1)", opacity: 1 },
                  },
                  minHeight: 44,
                  textTransform: "none",
                },
              },
            },
            MuiLinearProgress: {
              styleOverrides: { root: { height: 7, borderRadius: 10 } },
            },
            MuiCheckbox: {
              defaultProps: { size: "small" },
              styleOverrides: {
                root: {
                  "@media (pointer: coarse)": { minWidth: 44, minHeight: 44 },
                },
              },
            },

            ...compactControls,
          },
        },
        viVN,
      ),
    [dark],
  );
  return (
    <Provider store={store}>
      <NavigationRuntime />
      <RouteStateProvider>
        <AppRouterCacheProvider>
          <Preferences.Provider value={{ mode, setMode }}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <RealtimeBoundary>
                <PwaRuntime />
                <AuthRuntime />
                <WorkspaceRuntime />
                <OperationsRuntime />
                <UnsavedRuntime />
                <AppDisplayProvider storageKey="ess.staff.zoom">
                  {children}
                </AppDisplayProvider>
              </RealtimeBoundary>
            </ThemeProvider>
          </Preferences.Provider>
        </AppRouterCacheProvider>
      </RouteStateProvider>
    </Provider>
  );
}
