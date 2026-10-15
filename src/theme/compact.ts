import type { Components, Theme } from "@mui/material/styles";
// Central control sizing: layouts opt into widths, theme changes stay in one place.
export const compactControls: Components<Theme> = {
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontSize: 14,
        "&:not(.MuiInputBase-multiline)": {
          height: 36,
          "@media (max-width:599.95px)": { height: 40 },
        },
        "&.MuiInputBase-multiline": { padding: "8px 12px" },
      },
      input: {
        padding: "8px 12px",
        minWidth: 0,
        "&.MuiInputBase-inputMultiline": { padding: 0 },
      },
    },
  },
  MuiInputLabel: {
    styleOverrides: {
      root: {
        fontSize: 14,
        whiteSpace: "nowrap",
        maxWidth: "calc(100% - 24px)",
        "&.MuiInputLabel-outlined:not(.MuiInputLabel-shrink)": {
          transform: "translate(12px, 8px) scale(1)",
          "@media (max-width:599.95px)": {
            transform: "translate(12px, 10px) scale(1)",
          },
        },
      },
    },
  },
  MuiFormControl: {
    defaultProps: { size: "small" },
    styleOverrides: { root: { minWidth: 0, maxWidth: "100%" } },
  },
  MuiSelect: {
    defaultProps: { size: "small" },
    styleOverrides: {
      select: {
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        overflow: "hidden",
      },
    },
  },
  MuiButton: {
    defaultProps: { size: "small", disableElevation: true },
    styleOverrides: {
      root: {
        borderRadius: 8,
        minHeight: 32,
        whiteSpace: "nowrap",
        maxWidth: "100%",
        "@media (pointer:coarse)": { minHeight: 44 },
      },
    },
  },
  MuiIconButton: {
    defaultProps: { size: "small" },
    styleOverrides: {
      root: { "@media (pointer:coarse)": { minHeight: 44, minWidth: 44 } },
    },
  },
  MuiChip: {
    defaultProps: { size: "small" },
    styleOverrides: {
      root: { maxWidth: "100%", flexShrink: 0 },
      label: { whiteSpace: "nowrap" },
    },
  },
};
