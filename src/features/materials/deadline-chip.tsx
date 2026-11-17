"use client";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import AccessTime from "@mui/icons-material/AccessTime";
import { deadlineUrgency } from "./deadline";
const styles = {
  none: { label: "Không có hạn nộp", color: "default" },
  normal: { label: "Hạn nộp", color: "success" },
  soon: { label: "Sắp đến hạn", color: "warning" },
  urgent: { label: "Còn dưới 24 giờ", color: "error" },
  overdue: { label: "Đã qua hạn", color: "error" },
} as const;
export function DeadlineChip({ deadline }: { deadline: string | null }) {
  const urgency = deadlineUrgency(deadline),
    style = styles[urgency];
  const formatted =
    urgency === "none"
      ? ""
      : new Date(deadline!).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  return (
    <Tooltip title={formatted || style.label}>
      <Chip
        data-testid="assignment-deadline"
        data-urgency={urgency}
        size="small"
        variant="outlined"
        icon={<AccessTime />}
        color={style.color}
        label={`${style.label}${formatted ? ` · ${formatted}` : ""}`}
        sx={{
          maxWidth: "100%",
          height: "auto",
          minHeight: 24,
          "& .MuiChip-label": { whiteSpace: "normal", py: 0.5 },
        }}
      />
    </Tooltip>
  );
}
