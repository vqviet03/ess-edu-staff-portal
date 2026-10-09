"use client";
import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
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
  const data = points.map((p) => ({
    ...p,
    time: Date.parse(`${p.date}T00:00:00Z`),
  }));
  const hasPoints = data.some((p) => p.earned !== null);
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
            height: { xs: 260, md: 320 },
            width: "100%",
            minWidth: 0,
            bgcolor: "background.default",
            borderRadius: "12px",
            p: 1,
          }}
          aria-label="Biểu đồ điểm cộng dồn theo ngày"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ left: 0, right: 18, top: 10, bottom: 8 }}
            >
              <CartesianGrid stroke="var(--reward-grid)" vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={
                  data.length === 1
                    ? [data[0].time - 86400000, data[0].time + 86400000]
                    : ["dataMin", "dataMax"]
                }
                scale="time"
                tickFormatter={(v) => String(new Date(Number(v)).getUTCDate())}
                minTickGap={20}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--reward-muted)" }}
                label={{
                  value: "Ngày",
                  position: "insideBottomRight",
                  offset: -4,
                  fontSize: 12,
                  fill: "var(--reward-muted)",
                }}
              />
              <YAxis
                width={40}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--reward-muted)" }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as
                    (RewardPoint & { time: number }) | undefined;
                  return active && p ? (
                    <Box
                      sx={{
                        bgcolor: "background.paper",
                        border: 1,
                        borderColor: "divider",
                        p: 1.5,
                        borderRadius: "12px",
                      }}
                    >
                      <Typography sx={{ fontWeight: 700 }}>
                        {displayDate(p.date)}
                      </Typography>
                      {series.map((s) => (
                        <Typography key={s} sx={{ color: rewardColors[s] }}>
                          {rewardLabels[s]}: {p[s] ?? "—"}
                        </Typography>
                      ))}
                      <Typography variant="caption">
                        Trong ngày: +{p.dailyEarned} thưởng · −{p.dailyPenalty}{" "}
                        vi phạm · {p.dailySpent} sử dụng
                      </Typography>
                    </Box>
                  ) : null;
                }}
              />
              {series
                .filter((s) => !hidden.includes(s))
                .map((s) => (
                  <Line
                    key={s}
                    name={rewardLabels[s]}
                    type="monotone"
                    dataKey={s}
                    stroke={rewardColors[s]}
                    strokeWidth={2.5}
                    strokeDasharray={s === "net" ? "4 3" : undefined}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
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
