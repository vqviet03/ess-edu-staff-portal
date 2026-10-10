import type { EChartsOption, LineSeriesOption } from "echarts";
import type { Theme } from "@mui/material/styles";
import { escapeChartText } from "./chart-window";
export const signedPercentage = (value: number | null) =>
  value == null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
export function chartAxes(theme: Theme, bottom = 60) {
  const color = theme.palette.text.secondary;
  return {
    grid: { left: 54, right: 16, top: 20, bottom },
    xAxis: {
      type: "category",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color, fontSize: 12, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color, fontSize: 12 },
      splitLine: {
        lineStyle: { color: theme.palette.divider, type: "dashed" },
      },
    },
  } satisfies EChartsOption;
}
// Native ECharts monotone-X keeps both controls at the adjoining points' Y values:
// every cubic stays between its endpoint values (including 0/100 extrema).
export const curvedLine = {
  type: "line",
  smooth: 0.3,
  smoothMonotone: "x",
  symbol: "circle",
  symbolSize: 6,
  showSymbol: true,
  showAllSymbol: true,
  animation: false,
  lineStyle: { width: 2 },
  emphasis: { scale: 1.6 },
} satisfies LineSeriesOption;
export function chartTooltip(
  title: string,
  rows: readonly { label: string; value: string; color: string }[],
  footer?: string,
) {
  return `<strong>${escapeChartText(title)}</strong>${rows.map((row) => `<div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${row.color};margin-right:6px"></span>${escapeChartText(row.label)}: ${escapeChartText(row.value)}</div>`).join("")}${footer ? `<small>${escapeChartText(footer)}</small>` : ""}`;
}
