"use client";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import {
  attendanceLabels,
  displayDate,
  entryColor,
  kindLabels,
  rewardColors,
  rewardLabels,
  type RewardDetail,
  type RewardEntry,
  type RewardTotals,
} from "./models";
import { rewardBackgrounds, rewardSurface, rewardTint } from "./design";
const Chart = dynamic(() => import("./chart"), {
  ssr: false,
  loading: () => <LinearProgress />,
});
export function RewardMetrics({ totals }: { totals: RewardTotals }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2,minmax(0,1fr))",
          md: "repeat(5,minmax(0,1fr))",
        },
        gap: 1.5,
      }}
    >
      {(Object.keys(rewardLabels) as (keyof RewardTotals)[]).map((key) => (
        <Paper
          key={key}
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "12px",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? `${rewardColors[key]}20`
                : rewardBackgrounds[key],
            border: 0,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: rewardColors[key], fontWeight: 700, fontSize: 13 }}
          >
            {rewardLabels[key]}
          </Typography>
          <Typography
            sx={{ mt: 1, fontSize: 28, lineHeight: 1.45, fontWeight: 700 }}
          >
            {totals[key].toLocaleString("vi-VN")}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}
export function RewardEntries({
  entries,
  actions,
  compact = false,
}: {
  entries: RewardEntry[];
  actions?: (entry: RewardEntry) => ReactNode;
  compact?: boolean;
}) {
  return !entries.length ? (
    <Typography variant="body2" color="text.secondary">
      Chưa có hoạt động nào.
    </Typography>
  ) : (
    <Stack spacing={1}>
      {entries.map((e) => (
        <Box
          key={e.id}
          sx={{
            p: compact ? 0 : 1.5,
            borderRadius: "8px",
            bgcolor: compact
              ? "transparent"
              : (theme) =>
                  theme.palette.mode === "dark"
                    ? `${entryColor(e.kind)}20`
                    : rewardBackgrounds[
                        e.kind === "EARN"
                          ? "earned"
                          : e.kind === "PENALTY"
                            ? "penalty"
                            : "spent"
                      ],
            display: "flex",
            flexWrap: { xs: "wrap", sm: "nowrap" },
            alignItems: "flex-start",
            gap: 1.5,
          }}
        >
          <Stack sx={{ minWidth: compact ? 40 : 80 }}>
            {!compact && (
              <Typography variant="caption">{displayDate(e.date)}</Typography>
            )}
            <Typography variant="caption">
              {new Date(e.createdAt).toLocaleTimeString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
          </Stack>
          <Typography
            sx={{
              fontWeight: 700,
              color: entryColor(e.kind),
              minWidth: compact ? 25 : 40,
              fontSize: compact ? 13 : 14,
            }}
          >
            {e.kind === "EARN"
              ? e.amount > 0
                ? "+"
                : ""
              : e.amount > 0
                ? "−"
                : "+"}
            {e.kind === "EARN" ? e.amount : Math.abs(e.amount)}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {e.note}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {kindLabels[e.kind]} · {e.studentName}
              {e.nickname ? ` (${e.nickname})` : ""} · {e.authorName}
              {e.reversesId ? " · Điều chỉnh giao dịch" : ""}
            </Typography>
          </Box>
          {actions?.(e)}
        </Box>
      ))}
    </Stack>
  );
}
export function RewardOverview({
  data,
  actions,
  history,
  range,
  activityPaging,
  activities,
}: {
  data: RewardDetail;
  actions?: ReactNode;
  history: ReactNode;
  range?: ReactNode;
  activityPaging?: ReactNode;
  activities?: RewardEntry[];
}) {
  return (
    <Stack
      spacing={3}
      sx={(theme) => ({
        "--reward-grid": theme.palette.divider,
        "--reward-muted": theme.palette.text.secondary,
      })}
    >
      <RewardMetrics totals={data.totals} />
      {actions}
      <Paper sx={rewardSurface}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{ fontSize: 18 }}>
            Hôm nay · {displayDate(data.todayDate)}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            <Box component="span" sx={{ color: rewardColors.earned }}>
              +{data.today.earned} điểm thưởng
            </Box>{" "}
            ·{" "}
            <Box component="span" sx={{ color: rewardColors.penalty }}>
              −{data.today.penalty} vi phạm
            </Box>{" "}
            ·{" "}
            <Box component="span" sx={{ color: rewardColors.spent }}>
              {data.today.spent} đã dùng
            </Box>{" "}
            · {attendanceLabels[data.attendance]}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={data.attendance === "ABSENT" ? 0 : data.todayProgress}
            sx={{
              height: 8,
              borderRadius: "4px",
              bgcolor: "divider",
              "& .MuiLinearProgress-bar": {
                bgcolor: rewardColors.earned,
                borderRadius: "4px",
              },
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {data.attendance === "ABSENT"
              ? "Vắng: không xếp hạng bằng 0."
              : `${data.today.earned} điểm / mức thưởng cao nhất của bạn có tham gia trong lớp hôm nay · ${data.todayProgress.toFixed(1)}%`}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Hoạt động của lớp trong ngày
          </Typography>
          <RewardEntries entries={activities ?? data.activities} compact />
          {activityPaging}
          {data.activityCount > 20 && !activityPaging && (
            <Typography variant="caption">
              Đang hiển thị 20/{data.activityCount} hoạt động gần nhất.
            </Typography>
          )}
        </Stack>
      </Paper>
      <Paper sx={rewardSurface}>
        <Chart points={data.chart} filters={range} />
      </Paper>
      <Paper sx={{ ...rewardSurface, bgcolor: rewardTint }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>
          Hiểu hành trình của con
        </Typography>
        <Typography variant="body2">
          Xanh lá: tổng điểm thưởng, ghi nhận nỗ lực. Đỏ: tổng điểm bị trừ do vi
          phạm. Xanh biển: thưởng − vi phạm, thể hiện đóng góp ròng. Tím: thưởng
          − vi phạm − đã dùng, là số dư còn đổi thưởng. Vàng trong lịch sử: điểm
          đã sử dụng.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Số dư giảm khi đổi thưởng không có nghĩa là bớt tích cực. Dùng điểm để
          cùng nhìn lại sự hăng hái, tập trung và đóng góp qua các hoạt động
          được ghi nhận; điểm không thay thế đánh giá năng lực học tập hay mức
          độ hăng hái của từng bạn.
        </Typography>
        <Typography variant="caption">
          Có tham gia và đã chốt ngày nhưng không nhận thưởng: 0 điểm ngày, tổng
          cộng dồn giữ nguyên. Vắng/chưa xác nhận: không tạo mốc 0. Lịch sử được
          giữ nguyên; sửa sai bằng giao dịch đảo có ghi chú.
        </Typography>
      </Paper>
      {history}
    </Stack>
  );
}
