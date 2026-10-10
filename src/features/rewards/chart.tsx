"use client";
import { useMemo, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import { NativeChart } from "@/components/native-chart";
import { chartAxes, chartTooltip, curvedLine } from "@/utils/chart-options";
import { useTheme } from "@mui/material/styles";
import type { EChartsOption } from "echarts";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  displayDate,
  rewardColors,
  rewardLabels,
  type RewardPoint,
} from "./models";
const series = ["earned", "penalty", "net", "balance"] as const;
export default function RewardChart({
  points,
  filters,
}: {
  points: RewardPoint[];
  filters?: ReactNode;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const theme = useTheme();
  const data = useMemo(
    () =>
      points
        .map((p) => ({ ...p, time: Date.parse(`${p.date}T00:00:00Z`) }))
        .sort((a, b) => a.time - b.time),
    [points],
  );
  const hasPoints = data.some((p) => p.earned !== null);
  const option = useMemo<EChartsOption>(
    () => ({
      ...chartAxes(theme),
      xAxis: {
        ...chartAxes(theme).xAxis,
        type: "time",
        min: data.length === 1 ? data[0].time - 86400000 : data[0]?.time,
        max:
          data.length === 1
            ? data[0].time + 86400000
            : data[data.length - 1]?.time,
        axisLabel: {
          color: theme.palette.text.secondary,
          formatter: (value: number) => String(new Date(value).getUTCDate()),
          hideOverlap: true,
        },
        name: "Ngày",
        nameLocation: "end",
        nameGap: 4,
        nameTextStyle: { color: theme.palette.text.secondary, fontSize: 12 },
      },
      yAxis: { ...chartAxes(theme).yAxis, minInterval: 1 },
      tooltip: {
        formatter: (params) => {
          const item = Array.isArray(params) ? params[0] : params;
          const p = data[item?.dataIndex];
          if (!p) return "";
          return chartTooltip(
            displayDate(p.date),
            series
              .filter((s) => !hidden.includes(s))
              .map((s) => ({
                label: rewardLabels[s],
                color: rewardColors[s],
                value: String(p[s] ?? "—"),
              })),
            `Trong ngày: +${p.dailyEarned} thưởng · −${p.dailyPenalty} vi phạm · ${p.dailySpent} sử dụng`,
          );
        },
      },
      series: series
        .filter((s) => !hidden.includes(s))
        .map((s) => ({
          ...curvedLine,
          id: s,
          name: rewardLabels[s],
          data: data.map((p) => [p.time, p[s]]),
          connectNulls: true,
          itemStyle: { color: rewardColors[s] },
          lineStyle: { width: 2.5, type: s === "net" ? "dashed" : "solid" },
        })),
    }),
    [data, hidden, theme],
  );
  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontSize: 18 }}>
        Hành trình tích luỹ
      </Typography>
      {filters && (
        <Box component="details">
          <Typography
            component="summary"
            variant="caption"
            sx={{ cursor: "pointer", color: "text.secondary", minHeight: 32 }}
          >
            Khoảng ngày hiển thị
          </Typography>
          <Box sx={{ pt: 1 }}>{filters}</Box>
        </Box>
      )}
      <Typography variant="caption" color="text.secondary">
        Điểm
      </Typography>
      {hasPoints ? (
        <Box
          sx={{
            width: "100%",
            minWidth: 0,
            bgcolor: "background.default",
            borderRadius: "12px",
            p: 1,
          }}
          aria-label="Biểu đồ điểm cộng dồn theo ngày"
        >
          <NativeChart
            option={option}
            positions={data.map((p) => p.time)}
            height={300}
            gap={48}
            label="Điểm cộng dồn theo ngày"
          />
        </Box>
      ) : (
        <Typography color="text.secondary">
          Chưa có mốc điểm đã ghi nhận. Ngày vắng/chưa xác nhận không tạo điểm 0
          trên biểu đồ.
        </Typography>
      )}
      <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
        {series.map((s) => (
          <ButtonBase
            key={s}
            aria-label={rewardLabels[s]}
            aria-pressed={!hidden.includes(s)}
            onClick={() =>
              setHidden((v) =>
                v.includes(s) ? v.filter((k) => k !== s) : [...v, s],
              )
            }
            sx={{
              minHeight: 44,
              borderRadius: "4px",
              gap: 1,
              textAlign: "left",
              color: "text.secondary",
              opacity: hidden.includes(s) ? 0.4 : 1,
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
              },
            }}
          >
            <Box
              aria-hidden
              sx={{
                width: 20,
                borderTop: `3px ${s === "net" ? "dashed" : "solid"} ${rewardColors[s]}`,
              }}
            />
            <Typography variant="caption">
              {rewardLabels[s]} —{" "}
              {s === "earned"
                ? "tổng điểm thưởng"
                : s === "penalty"
                  ? "tổng điểm bị trừ"
                  : s === "net"
                    ? "đã nhận − vi phạm"
                    : "đã nhận − vi phạm − đã dùng"}
            </Typography>
          </ButtonBase>
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Trục ngang là ngày thực tế; chạm/di chuột để xem ngày, tháng, năm. Ngày
        vắng không có mốc; đường nối các mốc hợp lệ qua khoảng vắng. Bấm chú
        thích để ẩn/hiện đường.
      </Typography>
    </Stack>
  );
}
