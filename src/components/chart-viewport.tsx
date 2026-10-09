"use client";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ZoomIn from "@mui/icons-material/ZoomIn";
import ZoomOut from "@mui/icons-material/ZoomOut";
import RestartAlt from "@mui/icons-material/RestartAlt";
import { chartWidth, CHART_ZOOM_STEP, MAX_CHART_ZOOM, MIN_CHART_ZOOM } from "@/utils/chart-width";

export function ChartViewport({
  children, pointCount, label, height, minPointGap, xValues,
}: {
  children: ReactNode;
  pointCount: number;
  label: string;
  height: number | { xs: number; md: number };
  minPointGap?: number;
  xValues?: readonly number[];
}) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);
  const anchor = useRef<number | null>(null);
  const width = chartWidth(viewportWidth, pointCount, zoom, minPointGap, xValues);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setViewportWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (element && anchor.current !== null) {
      element.scrollLeft = anchor.current * width - element.clientWidth / 2;
      anchor.current = null;
    }
  }, [width, zoom]);

  function changeZoom(next: number) {
    const element = viewport.current;
    if (element && width > 0) {
      anchor.current = (element.scrollLeft + element.clientWidth / 2) / width;
    }
    setZoom(Math.min(MAX_CHART_ZOOM, Math.max(MIN_CHART_ZOOM, next)));
  }

  return (
    <Box data-testid="chart-viewport" data-zoom={zoom} sx={{ minWidth: 0, width: "100%" }}>
      <Stack direction="row" role="group" aria-label={`Zoom ngang · ${label}`}
        sx={{ alignItems: "center", justifyContent: "flex-end", gap: 0.25, mb: 0.5 }}>
        <Tooltip disableInteractive title="Thu nhỏ chiều ngang">
          <span><IconButton size="small" aria-label="Thu nhỏ chiều ngang" disabled={zoom <= MIN_CHART_ZOOM}
            onClick={() => changeZoom(zoom - CHART_ZOOM_STEP)}><ZoomOut fontSize="small" /></IconButton></span>
        </Tooltip>
        <Typography component="output" aria-label="Mức zoom ngang" variant="caption"
          sx={{ minWidth: 40, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{Math.round(zoom * 100)}%</Typography>
        <Tooltip disableInteractive title="Phóng to chiều ngang">
          <span><IconButton size="small" aria-label="Phóng to chiều ngang" disabled={zoom >= MAX_CHART_ZOOM}
            onClick={() => changeZoom(zoom + CHART_ZOOM_STEP)}><ZoomIn fontSize="small" /></IconButton></span>
        </Tooltip>
        <Tooltip disableInteractive title="Đặt lại zoom biểu đồ">
          <span><IconButton size="small" aria-label="Đặt lại zoom biểu đồ" disabled={zoom === 1}
            onClick={() => changeZoom(1)}><RestartAlt fontSize="small" /></IconButton></span>
        </Tooltip>
      </Stack>
      <Box ref={viewport} role="region" tabIndex={0} aria-label={`${label} · Cuộn ngang`}
        data-testid="chart-scroll-region"
        sx={{ width: "100%", overflowX: "auto", overflowY: "hidden", overscrollBehaviorX: "contain",
          "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 } }}>
        <Box data-testid="chart-surface" sx={{ width: width || "100%", height }}>
          {children}
        </Box>
      </Box>
      {width > viewportWidth && viewportWidth > 0 && (
        <Typography variant="caption" color="text.secondary">Vuốt hoặc cuộn ngang để xem các mốc còn lại.</Typography>
      )}
    </Box>
  );
}
