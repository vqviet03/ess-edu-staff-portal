import type { Theme } from "@mui/material/styles";
import type { RewardTotals } from "./models";

// Scoped to the rewards/schedule feature: other screens keep their theme.
export const rewardBackgrounds: Record<keyof RewardTotals, string> = {
  earned: "#e8f4ec",
  penalty: "#fbecee",
  spent: "#fbf4df",
  net: "#eaf2fb",
  balance: "#f1ebfa",
};
export const rewardSurface = {
  p: { xs: 2, sm: 2.5 },
  borderRadius: "16px",
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "none",
};
export const rewardTint = (theme: Theme) =>
  theme.palette.mode === "dark" ? "#294535" : "#e2f1e7";
export const rewardTabs = {
  minHeight: 40,
  "& .MuiTabs-indicator": { display: "none" },
  "& .MuiTabs-list": { gap: 1, flexWrap: { xs: "wrap", sm: "nowrap" } },
  "& .MuiTab-root": {
    minWidth: 0,
    minHeight: 40,
    px: 2,
    py: 1,
    borderRadius: "12px",
    bgcolor: rewardTint,
    color: "primary.main",
    fontSize: 13,
  },
  "& .MuiTab-root.Mui-selected": {
    bgcolor: "primary.main",
    color: "primary.contrastText",
  },
};
export const rewardButton = {
  minHeight: 40,
  px: 2,
  borderRadius: "12px",
  bgcolor: rewardTint,
  color: "primary.main",
  "&:hover": { bgcolor: "action.selected" },
};
export const rewardDialog = (maxWidth: number) => ({
  width: "calc(100% - 32px)",
  maxWidth,
  m: 2,
  backgroundImage: "none",
  borderRadius: "16px",
  "& .MuiDialogTitle-root": { px: { xs: 2, sm: 3.5 }, pt: 3.5, pb: 2 },
  "& .MuiDialogContent-root": { px: { xs: 2, sm: 3.5 }, pt: 0.75, pb: 2 },
  "& .MuiDialogActions-root": {
    px: { xs: 2, sm: 3.5 },
    pb: 3.5,
    pt: 0,
    justifyContent: "flex-start",
    gap: 1,
  },
  "& .MuiOutlinedInput-root": { borderRadius: "4px" },
});
