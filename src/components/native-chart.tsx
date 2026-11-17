"use client";
import { useEffect, useRef, useState } from "react";
import { init, use as registerCharts, type EChartsType } from "echarts/core";
import { LineChart, BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  AriaComponent,
  MarkLineComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ZoomIn from "@mui/icons-material/ZoomIn";
import ZoomOut from "@mui/icons-material/ZoomOut";
import LastPage from "@mui/icons-material/LastPage";
import FitScreen from "@mui/icons-material/FitScreen";
import { useTheme } from "@mui/material/styles";
import { newestWindow } from "@/utils/chart-window";
registerCharts([
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  AriaComponent,
  MarkLineComponent,
  SVGRenderer,
]);
type Range = { start: number; end: number };
export function NativeChart({
  option,
  positions,
  label,
  height = 340,
  gap = 64,
}: {
  option: EChartsOption;
  positions: readonly number[];
  label: string;
  height?: number;
  gap?: number;
}) {
  const theme = useTheme();
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<EChartsType | null>(null);
  const range = useRef<Range>({ start: 0, end: 100 });
  const [visible, setVisible] = useState<Range>({ start: 0, end: 100 });
  const latest = useRef(true);
  const domainKey = positions.join(",");
  // Creation and disposal belong to the client effect, including StrictMode remounts.
  useEffect(() => {
    const el = host.current!;
    const chart = init(el, undefined, { renderer: "svg" });
    instance.current = chart;
    // SVG circle bounds can extend just outside the plot at min/max values.
    // Ask ECharts to show the exact native data item rather than a stale axis tip.
    const showNodeTip = (event: {
      componentType?: string;
      seriesIndex?: number;
      dataIndex?: number;
    }) => {
      if (
        event.componentType === "series" &&
        event.seriesIndex !== undefined &&
        event.dataIndex !== undefined
      ) {
        chart.dispatchAction({
          type: "showTip",
          seriesIndex: event.seriesIndex,
          dataIndex: event.dataIndex,
        });
      }
    };
    chart.on("mouseover", showNodeTip);
    chart.on("click", showNodeTip);
    chart.on("datazoom", () => {
      const zoom = chart.getOption().dataZoom as Range[];
      const next = { start: zoom[0].start, end: zoom[0].end };
      range.current = next;
      setVisible(next);
      latest.current = false;
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(el);
    return () => {
      observer.disconnect();
      chart.dispose();
      instance.current = null;
    };
  }, []);
  useEffect(() => {
    const chart = instance.current!;
    chart.setOption(
      {
        animation: false,
        useUTC: true,
        textStyle: {
          fontFamily: theme.typography.fontFamily,
          fontSize: 12,
          color: theme.palette.text.primary,
        },
        aria: { enabled: true, description: label },
        ...option,
        tooltip: {
          trigger: "axis",
          triggerOn: "mousemove|click",
          confine: true,
          transitionDuration: 0,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
          textStyle: {
            color: theme.palette.text.primary,
            fontFamily: theme.typography.fontFamily,
            fontSize: 12,
          },
          extraCssText: "border-radius:10px;max-width:100%;white-space:normal",
          className: "chart-tooltip",
          ...option.tooltip,
        },
        dataZoom: [
          {
            id: "inside",
            type: "inside",
            xAxisIndex: 0,
            filterMode: "none",
            zoomOnMouseWheel: "ctrl",
            moveOnMouseWheel: "shift",
            moveOnMouseMove: true,
            ...range.current,
          },
          {
            id: "slider",
            type: "slider",
            xAxisIndex: 0,
            filterMode: "none",
            bottom: 6,
            left: 54,
            right: 16,
            height: 22,
            showDetail: false,
            brushSelect: false,
            borderColor: theme.palette.divider,
            fillerColor: theme.palette.action.selected,
            backgroundColor: theme.palette.background.default,
            handleStyle: { color: theme.palette.primary.main },
            moveHandleStyle: { color: theme.palette.primary.main },
            ...range.current,
          },
        ],
      },
      { replaceMerge: ["series"] },
    );
  }, [option, label, theme]);
  useEffect(() => {
    const next = newestWindow(positions, host.current!.clientWidth, gap);
    range.current = next;
    latest.current = true;
    setVisible(next);
    instance.current!.dispatchAction({ type: "dataZoom", ...next });
    latest.current = true;
    const observer = new ResizeObserver(() => {
      if (!latest.current) return;
      const resized = newestWindow(positions, host.current!.clientWidth, gap);
      instance.current?.dispatchAction({ type: "dataZoom", ...resized });
      latest.current = true;
    });
    observer.observe(host.current!);
    return () => observer.disconnect();
    // A changed series visibility must preserve the user's native pan/zoom window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainKey, gap]);
  const move = (next: Range) => {
    instance.current?.dispatchAction({ type: "dataZoom", ...next });
  };
  const zoom = (factor: number) => {
    const current = range.current;
    const span = Math.min(
      100,
      Math.max(1, (current.end - current.start) * factor),
    );
    move({
      start: Math.max(0, current.end - span),
      end: Math.max(span, current.end),
    });
  };
  const series = Array.isArray(option.series)
    ? option.series
    : option.series
      ? [option.series]
      : [];
  return (
    <Box data-testid="native-chart" sx={{ width: "100%", minWidth: 0 }}>
      <Stack
        direction="row"
        sx={{ mb: 0.5, alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          title="Kéo để xem; chụm hai ngón hoặc Ctrl + lăn chuột để thu/phóng. Shift + lăn chuột để di chuyển."
        >
          Kéo / thu phóng
        </Typography>
        <Stack direction="row" sx={{ flexShrink: 0 }}>
          <Tooltip disableInteractive title="Thu nhỏ chiều ngang">
            <IconButton
              size="small"
              aria-label="Thu nhỏ chiều ngang"
              onClick={() => zoom(1.5)}
            >
              <ZoomOut fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip disableInteractive title="Phóng to chiều ngang">
            <IconButton
              size="small"
              aria-label="Phóng to chiều ngang"
              onClick={() => zoom(1 / 1.5)}
            >
              <ZoomIn fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip disableInteractive title="Xem toàn bộ dữ liệu">
            <IconButton
              size="small"
              aria-label="Xem toàn bộ dữ liệu"
              onClick={() => move({ start: 0, end: 100 })}
            >
              <FitScreen fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip disableInteractive title="Về dữ liệu mới nhất">
            <IconButton
              size="small"
              aria-label="Về dữ liệu mới nhất"
              onClick={() => {
                move(newestWindow(positions, host.current!.clientWidth, gap));
                latest.current = true;
              }}
            >
              <LastPage fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      <Box
        ref={host}
        role="application"
        aria-label={label}
        tabIndex={0}
        data-testid="chart-surface"
        data-visible-start={visible.start}
        data-visible-end={visible.end}
        data-series-count={series.length}
        data-point-count={positions.length}
        onKeyDown={(event) => {
          const current = range.current,
            span = current.end - current.start;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            const start = Math.min(
              100 - span,
              Math.max(
                0,
                current.start +
                  ((event.key === "ArrowLeft" ? -1 : 1) * span) / 4,
              ),
            );
            move({ start, end: start + span });
          } else if (event.key === "+" || event.key === "=") {
            event.preventDefault();
            zoom(1 / 1.5);
          } else if (event.key === "-") {
            event.preventDefault();
            zoom(1.5);
          } else if (event.key === "End") {
            event.preventDefault();
            move(newestWindow(positions, host.current!.clientWidth, gap));
          }
        }}
        sx={{
          height,
          width: "100%",
          minWidth: 0,
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            borderRadius: 1,
          },
        }}
      />
    </Box>
  );
}
