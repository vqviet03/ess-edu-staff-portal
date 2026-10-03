"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Provider } from "react-redux";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { makeStore } from "@/store";
import { AuthRuntime } from "@/features/auth/runtime";
import { UnsavedRuntime } from "@/shared/unsaved";
type Mode = "light" | "dark" | "system";
const Preferences = createContext<{
  mode: Mode;
  setMode: (mode: Mode) => void;
}>({ mode: "system", setMode: () => {} });
export const usePreferences = () => useContext(Preferences);
export function Providers({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore),
    [mode, setChoice] = useState<Mode>("system"),
    [systemDark, setSystemDark] = useState(false);
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
      createTheme({
        palette: {
          mode: dark ? "dark" : "light",
          primary: { main: dark ? "#9cdbb8" : "#287751" },
          background: {
            default: dark ? "#14251d" : "#f3f7f4",
            paper: dark ? "#20372b" : "#ffffff",
          },
          text: {
            primary: dark ? "#e4f1e8" : "#203d2d",
            secondary: dark ? "#b4c9bb" : "#617467",
          },
          divider: dark ? "#3c5546" : "#dce6de",
          success: { main: dark ? "#a5ddb9" : "#287751" },
        },
        typography: {
          fontFamily: "Roboto, sans-serif",
          fontSize: 14,
          h4: { fontSize: "1.875rem", fontWeight: 700 },
          h5: { fontSize: "1.25rem", fontWeight: 700 },
          h6: { fontSize: "1.1rem", fontWeight: 700 },
          button: { textTransform: "none", fontWeight: 600 },
        },
        shape: { borderRadius: 12 },
        components: {
          MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: { root: { minHeight: 44, borderRadius: 8 } },
          },
          MuiIconButton: {
            styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
          },
          MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
          MuiOutlinedInput: {
            styleOverrides: { root: { borderRadius: 8, minHeight: 46 } },
          },
          MuiPaper: { defaultProps: { elevation: 0 } },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderBottom: "1px solid",
                borderColor: dark ? "#3c5546" : "#dce6de",
              },
              head: {
                fontWeight: 600,
                background: dark ? "#294535" : "#f3f7f4",
              },
            },
          },
          MuiTab: {
            styleOverrides: { root: { minHeight: 44, textTransform: "none" } },
          },
          MuiLinearProgress: {
            styleOverrides: { root: { height: 7, borderRadius: 10 } },
          },
          MuiCheckbox: {
            styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
          },
        },
      }),
    [dark],
  );
  return (
    <Provider store={store}>
      <AppRouterCacheProvider>
        <Preferences.Provider value={{ mode, setMode }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthRuntime />
            <UnsavedRuntime />
            {children}
          </ThemeProvider>
        </Preferences.Provider>
      </AppRouterCacheProvider>
    </Provider>
  );
}
