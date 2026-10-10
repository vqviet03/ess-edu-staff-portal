"use client";
import { useMemo, useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import type { EChartsOption } from "echarts";
import { NativeChart } from "@/components/native-chart";
import {
  chartAxes,
  chartTooltip,
  curvedLine,
  signedPercentage,
} from "@/utils/chart-options";
import { changes, percentage, skills } from "./utils";
import type { ProgressEntry } from "./models";
export default function Charts({
  entries,
  deltas,
}: {
  entries: ProgressEntry[];
  deltas: boolean;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const theme = useTheme();
  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.unitOrder - b.unitOrder),
    [entries],
  );
  const choices = deltas
    ? [...skills, { code: "total", label: "Tổng điểm", color: "" }]
    : skills;
  const controls = (
    <Stack
      direction="row"
      useFlexGap
      sx={{ gap: 0.5, flexWrap: "wrap", mb: 1.5 }}
      aria-label={
        deltas ? "Hiện hoặc ẩn biểu đồ thay đổi" : "Hiện hoặc ẩn kỹ năng"
      }
    >
      {choices.map((skill) => (
        <Button
          key={skill.code}
          size="small"
          variant={hidden.includes(skill.code) ? "outlined" : "contained"}
          aria-pressed={!hidden.includes(skill.code)}
          aria-label={`${hidden.includes(skill.code) ? "Hiện" : "Ẩn"} ${skill.label}${deltas ? " · thay đổi" : ""}`}
          onClick={() =>
            setHidden((current) =>
              current.includes(skill.code)
                ? current.filter((item) => item !== skill.code)
                : [...current, skill.code],
            )
          }
        >
          {skill.label}
        </Button>
      ))}
      <Button onClick={() => setHidden([])}>
        Hiện tất cả{deltas ? " biểu đồ thay đổi" : " kỹ năng"}
      </Button>
      <Button onClick={() => setHidden(choices.map((skill) => skill.code))}>
        Ẩn tất cả{deltas ? " biểu đồ thay đổi" : " kỹ năng"}
      </Button>
    </Stack>
  );
  const option = useMemo<EChartsOption>(
    () => ({
      ...chartAxes(theme),
      xAxis: {
        ...chartAxes(theme).xAxis,
        data: sorted.map((entry) => entry.unitName),
        boundaryGap: false,
      },
      yAxis: {
        ...chartAxes(theme).yAxis,
        min: 0,
        max: 100,
        interval: 20,
        axisLabel: {
          color: theme.palette.text.secondary,
          formatter: "{value}%",
        },
      },
      tooltip: {
        formatter: (params) => {
          const item = Array.isArray(params) ? params[0] : params;
          const entry = sorted[item?.dataIndex];
          if (!entry) return "";
          return chartTooltip(
            entry.unitName,
            skills
              .filter((skill) => !hidden.includes(skill.code))
              .map((skill) => ({
                label: skill.label,
                color: skill.color,
                value: percentage(entry.skills[skill.code]),
              })),
          );
        },
      },
      series: skills
        .filter((skill) => !hidden.includes(skill.code))
        .map((skill) => ({
          ...curvedLine,
          id: skill.code,
          name: skill.label,
          itemStyle: { color: skill.color },
          data: sorted.map((entry) => entry.skills[skill.code]),
          connectNulls: false,
        })),
    }),
    [sorted, hidden, theme],
  );
  if (!deltas)
    return (
      <>
        {controls}
        {hidden.length === skills.length && (
          <Alert severity="info">
            Tất cả đường đang ẩn. Chọn kỹ năng để hiển thị lại.
          </Alert>
        )}
        <Box data-testid="skills-chart" sx={{ width: "100%", minWidth: 0 }}>
          <NativeChart
            option={option}
            positions={sorted.map((_, i) => i)}
            height={330}
            label="Tiến độ kỹ năng theo Unit"
          />
          <Stack
            direction="row"
            useFlexGap
            sx={{ justifyContent: "center", gap: 1.5, flexWrap: "wrap", mt: 1 }}
          >
            {skills
              .filter((skill) => !hidden.includes(skill.code))
              .map((skill) => (
                <Typography
                  key={skill.code}
                  variant="caption"
                  color="text.secondary"
                >
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: skill.color,
                      mr: 0.5,
                    }}
                  />
                  {skill.label}
                </Typography>
              ))}
          </Stack>
        </Box>
      </>
    );
  return (
    <>
      {controls}
      {hidden.length === choices.length && (
        <Alert severity="info">
          Tất cả biểu đồ thay đổi đang ẩn. Chọn kỹ năng để hiển thị lại.
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            lg: "repeat(4,minmax(0,1fr))",
          },
          gap: 1.5,
        }}
      >
        {[...skills, { code: "total" as const, label: "Tổng điểm", color: "" }]
          .filter((skill) => !hidden.includes(skill.code))
          .map((skill) => (
            <DeltaChart
              key={skill.code}
              values={changes(sorted, skill.code)}
              label={skill.label}
            />
          ))}
      </Box>
    </>
  );
}
function DeltaChart({
  values,
  label,
}: {
  values: { label: string; value: number | null }[];
  label: string;
}) {
  const theme = useTheme();
  const limit = Math.max(
    80,
    ...values.map((v) => Math.ceil(Math.abs(v.value ?? 0) / 20) * 20),
  );
  const option = useMemo<EChartsOption>(
    () => ({
      ...chartAxes(theme),
      xAxis: {
        ...chartAxes(theme).xAxis,
        data: values.map((value) => value.label),
        axisLabel: {
          color: theme.palette.text.secondary,
          fontSize: 11,
          hideOverlap: true,
        },
      },
      yAxis: {
        ...chartAxes(theme).yAxis,
        min: -limit,
        max: limit,
        interval: limit / 2,
        axisLabel: {
          color: theme.palette.text.secondary,
          formatter: "{value}%",
        },
      },
      tooltip: {
        formatter: (params) => {
          const item = Array.isArray(params) ? params[0] : params;
          const v = values[item?.dataIndex];
          return v
            ? chartTooltip(v.label, [
                {
                  label: "Thay đổi",
                  value:
                    v.value == null
                      ? "Chưa có dữ liệu"
                      : `${v.value > 0 ? "+" : ""}${v.value.toFixed(1)} điểm phần trăm (tỷ lệ Unit sau − Unit trước)`,
                  color: (v.value ?? 0) < 0 ? "#f16b95" : "#45c49a",
                },
              ])
            : "";
        },
      },
      series: [
        {
          type: "bar",
          id: "change",
          barMaxWidth: 38,
          data: values.map((v) => ({
            value: v.value,
            itemStyle: {
              color: (v.value ?? 0) < 0 ? "#f16b95" : "#45c49a",
              borderRadius: 2,
            },
          })),
          label: {
            show: true,
            position: "outside",
            color: theme.palette.text.primary,
            fontSize: 12,
            formatter: (params) =>
              signedPercentage(values[params.dataIndex].value),
          },
          markLine: {
            silent: true,
            symbol: "none",
            label: { show: false },
            lineStyle: { color: theme.palette.text.secondary, type: "solid" },
            data: [{ yAxis: 0 }],
          },
        },
      ],
    }),
    [values, theme, limit],
  );
  return (
    <Box
      data-testid="change-chart"
      sx={{
        bgcolor: "background.default",
        borderRadius: 2,
        p: 1.5,
        minWidth: 0,
      }}
    >
      <Typography sx={{ fontWeight: 700, mb: 1 }}>{label}</Typography>
      {!values.length ? (
        <Typography color="text.secondary">
          Cần ít nhất 2 Unit để so sánh.
        </Typography>
      ) : (
        <NativeChart
          option={option}
          positions={values.map((_, i) => i)}
          height={235}
          gap={96}
          label={`Thay đổi ${label}`}
        />
      )}
    </Box>
  );
}
