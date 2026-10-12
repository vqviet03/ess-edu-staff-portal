"use client";
import { useMemo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import { createTheme, ThemeProvider, useTheme } from "@mui/material/styles";

// Tokens measured from t3kAHowsm0FLtomJCMQiuv. Scoped to assignments so
// existing class, assessment, profile and library screens keep their theme.
export function AssignmentSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const parent = useTheme();
  const dark = parent.palette.mode === "dark";
  const theme = useMemo(
    () =>
      createTheme(parent, {
        shape: { borderRadius: 4 },
        palette: {
          primary: { main: dark ? "#9dd5b6" : "#2b7c59" },
          background: { paper: dark ? "#1a2b23" : "#ffffff" },
          text: {
            primary: dark ? "#e4f3ea" : "#203c30",
            secondary: dark ? "#b2c9bc" : "#60776b",
          },
          divider: dark ? "#365246" : "#dce7df",
        },
        typography: {
          fontFamily: "Roboto, Arial, sans-serif",
          fontSize: 14,
          body1: { fontSize: 14, lineHeight: 1.45 },
          body2: { fontSize: 12, lineHeight: 1.45 },
          caption: { fontSize: 12, lineHeight: 1.45 },
          h4: { fontSize: 26, lineHeight: 1.45, fontWeight: 700 },
          h5: { fontSize: 22, lineHeight: 1.45, fontWeight: 700 },
          h6: { fontSize: 18, lineHeight: 1.45, fontWeight: 700 },
          button: {
            fontSize: 14,
            lineHeight: 1.45,
            fontWeight: 700,
            textTransform: "none",
          },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                border: 0,
                borderRadius: 16,
                boxShadow: "none",
                minWidth: 0,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              contained: {
                backgroundColor: dark ? "#9dd5b6" : "#2b7c59",
                color: dark ? "#101c17" : "#ffffff",
              },
              root: {
                borderRadius: 8,
                minHeight: 40,
                padding: "8px 10px",
                fontSize: 14,
                "@media (pointer: coarse)": { minHeight: 40 },
              },
              text: { backgroundColor: dark ? "#284737" : "#e2f1e7" },
              outlined: {
                border: 0,
                backgroundColor: dark ? "#284737" : "#e2f1e7",
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                width: 40,
                height: 40,
                minWidth: 40,
                minHeight: 40,
                padding: 8,
                borderRadius: 12,
                color: dark ? "#9dd5b6" : "#2b7c59",
                backgroundColor: dark ? "#284737" : "#e2f1e7",
                "@media (pointer: coarse)": { minWidth: 40, minHeight: 40 },
                "&.MuiIconButton-colorError": {
                  color: parent.palette.error.main,
                  backgroundColor: dark ? "#41262a" : "#fcecef",
                },
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 6,
                fontSize: 14,
                "&:not(.MuiInputBase-multiline)": { height: 40 },
                "&.MuiInputBase-multiline": { padding: 0 },
              },
              input: { padding: "9px 10px" },
              notchedOutline: { borderColor: dark ? "#365246" : "#dce7df" },
            },
          },
          MuiInputLabel: { styleOverrides: { root: { fontSize: 16 } } },
          MuiChip: {
            styleOverrides: {
              root: { borderRadius: 6, fontSize: 12, height: 24 },
            },
          },
          MuiAlert: {
            styleOverrides: {
              root: {
                border: 0,
                borderRadius: 16,
                padding: "14px 16px",
                fontSize: 14,
              },
              standardInfo: {
                backgroundColor: dark ? "#233e52" : "#e8f3ff",
                color: dark ? "#add2f5" : "#2b73b7",
              },
              standardWarning: {
                backgroundColor: dark ? "#493e22" : "#fff3d9",
              },
              standardError: { backgroundColor: dark ? "#41262a" : "#fcecef" },
            },
          },
          MuiRadio: {
            styleOverrides: {
              root: { padding: 4, "& .MuiSvgIcon-root": { fontSize: 18 } },
            },
          },
          MuiCheckbox: {
            styleOverrides: {
              root: { padding: 4, "& .MuiSvgIcon-root": { fontSize: 18 } },
            },
          },
        },
      }),
    [parent, dark],
  );
  return (
    <ThemeProvider theme={theme}>
      <Box
        data-assignment-surface
        className={`assignment-surface ${className}`}
        sx={{
          fontFamily: theme.typography.fontFamily,
          color: "text.primary",
          minWidth: 0,
          width: "100%",
          overflowWrap: "anywhere",
          "--a-bg": dark ? "#101c17" : "#f4f8f5",
          "--a-surface": dark ? "#1a2b23" : "#ffffff",
          "--a-tint": dark ? "#284737" : "#e2f1e7",
          "--a-muted": dark ? "#b2c9bc" : "#60776b",
          "--a-green": dark ? "#9dd5b6" : "#2b7c59",
          "--a-border": dark ? "#365246" : "#dce7df",
          "--a-info": dark ? "#233e52" : "#e8f3ff",
          "--a-blue": dark ? "#add2f5" : "#2b73b7",
          "--a-purple-bg": dark ? "#332842" : "#f1eaf7",
          "--a-purple": dark ? "#d4b9ed" : "#7c55aa",
          "--post-green": dark ? "#9dd5b6" : "#2b7c59",
          "--post-surface": dark ? "#1a2b23" : "#ffffff",
          "--post-soft": dark ? "#284737" : "#e2f1e7",
          "--post-muted": dark ? "#b2c9bc" : "#60776b",
          "--post-border": dark ? "#365246" : "#dce7df",
          "& .MuiAlert-standardInfo, & .MuiAlert-outlinedInfo": {
            backgroundColor: "var(--a-info)",
            color: "var(--a-blue)",
          },
          "& .assignment-bordered": {
            border: "1px solid var(--a-border)",
            borderRadius: "12px",
          },
          "& .assignment-labels .MuiInputLabel-root": {
            fontSize: 12,
            position: "relative",
            transform: "none",
            maxWidth: "100%",
            color: "var(--a-muted)",
            marginBottom: "4px",
            lineHeight: 1.45,
          },
          "& .assignment-labels .MuiOutlinedInput-notchedOutline": { top: 0 },
          "& .assignment-labels .MuiOutlinedInput-notchedOutline legend": {
            display: "none",
          },
          "& .assignment-labels .MuiOutlinedInput-root": { marginTop: 0 },
          "& .assignment-option-content .MuiOutlinedInput-notchedOutline": {
            border: 0,
          },
          "& .assignment-option-content .MuiInputBase-input": {
            padding: "4px 0",
          },
          "& .assignment-option-content .MuiInputLabel-root": {
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clipPath: "inset(50%)",
          },
          "& .assignment-badge": {
            backgroundColor: "var(--a-info)",
            color: "var(--a-blue)",
          },
          "& .assignment-chip-file": {
            backgroundColor: dark ? "#493e22" : "#fff3d9",
            color: dark ? "#eed79e" : "#a16b20",
            border: 0,
          },
          "& .assignment-chip-link": {
            backgroundColor: "var(--a-info)",
            color: "var(--a-blue)",
            border: 0,
          },
        }}
      >
        {children}
      </Box>
    </ThemeProvider>
  );
}

export function AssignmentIcon({
  name,
}: {
  name:
    "help" | "plus" | "copy" | "trash" | "attach" | "link" | "back" | "chevron";
}) {
  const dark = useTheme().palette.mode === "dark";
  const mode =
    dark && ["help", "plus", "attach", "link", "chevron"].includes(name)
      ? "dark"
      : "light";
  const icon = name === "chevron" ? "dark/chevron" : `${mode}/${name}`;
  // Exported SVG root dimensions are preserved at their original 20×20.
  return (
    <Box
      component="img"
      alt=""
      src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assignment-icons/${icon}.svg`}
      sx={{ display: "block", flexShrink: 0 }}
    />
  );
}
