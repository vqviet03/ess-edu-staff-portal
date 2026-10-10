"use client";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import Tooltip from "@mui/material/Tooltip";
import PushPin from "@mui/icons-material/PushPin";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import { useTheme } from "@mui/material/styles";
import { IconAction } from "@/shared/icon-action";
import {
  calendarCells,
  shiftMonth,
  statusLabels,
  dateLabel,
  type AttendanceDate,
  type AttendanceStats,
} from "./models";
export function AttendanceSurface({ children }: { children: ReactNode }) {
  const dark = useTheme().palette.mode === "dark";
  return (
    <Stack
      spacing={1.5}
      sx={{
        "--att-bg": dark ? "#182820" : "#f4f8f5",
        "--att-surface": dark ? "#20382a" : "#fff",
        "--att-text": dark ? "#e4f0e8" : "#203c30",
        "--att-muted": dark ? "#adc2b4" : "#60776b",
        "--att-green": dark ? "#a2d6b3" : "#317b58",
        "--att-green-bg": dark ? "#2c4835" : "#e8f4ec",
        "--att-red-bg": dark ? "#4d2931" : "#fcebed",
        "--att-red": dark ? "#ffb1be" : "#b94b61",
        "--att-orange-bg": dark ? "#4b3b22" : "#fff3d9",
        "--att-orange": dark ? "#ffcf83" : "#a96c18",
        "--att-blue-bg": dark ? "#263d55" : "#e9f1fc",
        "--att-blue": dark ? "#a8cdff" : "#396eb0",
        color: "var(--att-text)",
        "& .MuiPaper-root:not(.MuiAlert-root)": {
          boxShadow: "none",
          border: 0,
          borderRadius: "16px",
          bgcolor: "var(--att-surface)",
        },
        "& .MuiTypography-root": { lineHeight: 1.45 },
        "& .MuiButton-root": { borderRadius: "12px", textTransform: "none" },
        "& .MuiButton-containedPrimary": {
          bgcolor: dark ? "#376b4d" : "#c7e8d2",
          color: "var(--att-text)",
          "&:hover": { bgcolor: dark ? "#437d5b" : "#b6dec3" },
        },
      }}
    >
      {children}
    </Stack>
  );
}
export function AttendanceMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail: string;
}) {
  return (
    <Paper sx={{ p: 2, flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 12, color: "var(--att-muted)" }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 30, fontWeight: 700, my: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: 12, color: "var(--att-muted)" }}>
        {detail}
      </Typography>
    </Paper>
  );
}
export function AttendanceBadge({ status }: { status: string }) {
  const color =
    status === "HOLIDAY" ? "orange" : status === "ABSENT" ? "red" : ["UNSET","PLANNED","CANCELLED"].includes(status) ? "blue" : "green";
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        fontSize: 12,
        px: 1.5,
        py: 0.75,
        borderRadius: "8px",
        bgcolor: `var(--att-${color}-bg)`,
        color: `var(--att-${color})`,
      }}
    >
      {statusLabels[status] ?? status}
    </Box>
  );
}
export function WarningBadge({ stats }: { stats: AttendanceStats }) {
  const color =
    stats.warning === "DANGER"
      ? "red"
      : stats.warning === "WARNING"
        ? "orange"
        : "green";
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        fontSize: 12,
        px: 1.5,
        py: 0.75,
        borderRadius: "8px",
        bgcolor: `var(--att-${color}-bg)`,
        color: `var(--att-${color})`,
      }}
    >
      {stats.warning === "NO_PLAN"
        ? "Chưa có kế hoạch"
        : stats.warning === "DANGER"
          ? "Vượt ngưỡng"
          : stats.warning === "WARNING"
            ? "Cảnh báo"
            : "Chấp nhận"}
    </Box>
  );
}
export function AttendanceCalendar({
  month,
  onMonth,
  selected,
  onSelect,
  items,
  today,
}: {
  month: string;
  onMonth: (m: string) => void;
  selected: string;
  onSelect: (d: string) => void;
  items: AttendanceDate[];
  today: string;
}) {
  const cells = calendarCells(month),
    byDate = new Map(items.map((d) => [d.date, d]));
  return (
    <Paper sx={{ p: 2, minWidth: 0 }}>
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <IconAction
          label="Tháng trước"
          icon={<ChevronLeft />}
          onClick={() => onMonth(shiftMonth(month, -1))}
        />
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
          Tháng {Number(month.slice(5))}, {month.slice(0, 4)}
        </Typography>
        <IconAction
          label="Tháng sau"
          icon={<ChevronRight />}
          onClick={() => onMonth(shiftMonth(month, 1))}
        />
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7,minmax(0,1fr))",
          gap: 0.5,
          mt: 1.5,
        }}
      >
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
          <Typography
            key={d}
            sx={{
              textAlign: "center",
              fontSize: 12,
              color: "var(--att-muted)",
              mb: 1,
            }}
          >
            {d}
          </Typography>
        ))}
        {cells.map((date) => {
          const item = byDate.get(date),
            color =
              item?.isHoliday || item?.status==="HOLIDAY"
                ? "orange"
                : item?.status === "ABSENT"
                ? "red"
                : item?.status === "UNSET" && date <= today
                  ? "blue"
                  : "green";
          return (
            <Tooltip
              key={date}
              enterTouchDelay={0}
              leaveTouchDelay={5000}
              title={`${dateLabel(date)} · ${item ? (statusLabels[item.status] ?? "Theo lịch") : "Không trong lịch"}${item?.reason ? ` · ${item.reason}` : ""}`}
            >
              <ButtonBase
                aria-label={dateLabel(date)}
                aria-pressed={date === selected}
                onClick={() => onSelect(date)}
                sx={{
                  borderRadius: "12px",
                  height: 58,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                  bgcolor: item ? `var(--att-${color}-bg)` : "var(--att-bg)",
                  color: date.startsWith(month)
                    ? "var(--att-text)"
                    : "var(--att-muted)",
                  outline:
                    date === selected
                      ? "2px solid var(--att-green)"
                      : undefined,
                  opacity: date.startsWith(month) ? 1 : 0.6,
                }}
              >
                <Typography sx={{ fontSize: 14 }}>
                  {Number(date.slice(-2))}
                </Typography>
                <Typography sx={{ fontSize: 10, color: "var(--att-muted)" }}>
                  {item?.isPinned
                    ? <PushPin aria-label="Lịch dự kiến đã ghim" sx={{fontSize:13,color:"var(--att-blue)"}}/>
                    : item?.isHoliday ? "Nghỉ" : date === today
                    ? "Nay"
                    : item?.replaced
                      ? "Bù"
                      : item?.reasonKind
                        ? "+"
                        : item?.status === "SAVED" ||
                            item?.status === "PRESENT" ||
                            item?.status === "ABSENT"
                          ? "•"
                          : item?.scheduled
                            ? "Lịch"
                            : ""}
                </Typography>
              </ButtonBase>
            </Tooltip>
          );
        })}
      </Box>
      <Typography sx={{ fontSize: 12, color: "var(--att-muted)", mt: 1.5 }}>
        Xanh: có mặt / theo lịch · Đỏ: vắng · Vàng: nghỉ học · Ghim: lịch dự kiến
      </Typography>
      <Typography sx={{ fontSize: 12, color: "var(--att-muted)", mt: 1 }}>
        Ngày tương lai chỉ xem, không điểm danh.
      </Typography>
    </Paper>
  );
}
