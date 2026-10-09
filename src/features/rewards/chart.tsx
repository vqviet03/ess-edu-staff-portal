"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
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
export default function RewardChart({ points }: { points: RewardPoint[] }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const data = points.map((p) => ({
    ...p,
    time: Date.parse(`${p.date}T00:00:00Z`),
  }));
  const hasPoints = data.some((p) => p.earned !== null);
  return (
    <Stack spacing={2}>
      <Typography variant="h6">Hành trình tích luỹ</Typography>
      {hasPoints ? (
        <Box
          sx={{ height: { xs: 260, md: 320 }, width: "100%", minWidth: 0 }}
          aria-label="Biểu đồ điểm cộng dồn theo ngày"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ left: 0, right: 18, top: 10, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
              />
              <YAxis width={44} allowDecimals={false} />
              <Tooltip
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as
                    | (RewardPoint & { time: number })
                    | undefined;
                  return active && p ? (
                    <Box
                      sx={{
                        bgcolor: "background.paper",
                        border: 1,
                        borderColor: "divider",
                        p: 1.5,
                        borderRadius: 2,
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
      <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
        {series.map((s) => (
          <Chip
            key={s}
            label={rewardLabels[s]}
            component="button"
            clickable
            aria-pressed={!hidden.includes(s)}
            variant={hidden.includes(s) ? "outlined" : "filled"}
            onClick={() =>
              setHidden((v) =>
                v.includes(s) ? v.filter((k) => k !== s) : [...v, s],
              )
            }
            sx={{
              borderColor: rewardColors[s],
              color: hidden.includes(s) ? "text.secondary" : rewardColors[s],
            }}
          />
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
