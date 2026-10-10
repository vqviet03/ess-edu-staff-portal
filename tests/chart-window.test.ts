import { test } from "node:test";
import assert from "node:assert/strict";
import { newestWindow, escapeChartText } from "../src/utils/chart-window";
import {
  curvedLine,
  signedPercentage,
  chartTooltip,
} from "../src/utils/chart-options";
import { init, use as registerCharts } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, DataZoomComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
registerCharts([LineChart, GridComponent, DataZoomComponent, SVGRenderer]);
test("dense categories open at the newest data; sparse and single points show all", () => {
  assert.deepEqual(newestWindow([], 390), { start: 0, end: 100 });
  assert.deepEqual(newestWindow([1], 390), { start: 0, end: 100 });
  assert.deepEqual(newestWindow([0, 1, 2], 390), { start: 0, end: 100 });
  const dense = newestWindow(
    Array.from({ length: 30 }, (_, i) => i),
    390,
  );
  assert.ok(dense.start > 80);
  assert.equal(dense.end, 100);
  assert.ok(
    newestWindow(
      Array.from({ length: 30 }, (_, i) => i),
      1440,
    ).start < dense.start,
  );
});
test("time window uses real timestamps, ignores duplicate/invalid dates and tolerates zero width", () => {
  assert.deepEqual(newestWindow([0, 0, NaN, Infinity], 0), {
    start: 0,
    end: 100,
  });
  assert.deepEqual(newestWindow([300, 0, 100, 200, 1000], 204), {
    start: 30,
    end: 100,
  });
  assert.deepEqual(newestWindow([0, 1, 2], 0), { start: 50, end: 100 });
});
test("labels retain null versus zero and escape API-provided text in HTML tooltips", () => {
  assert.equal(signedPercentage(null), "—");
  assert.equal(signedPercentage(0), "0.0%");
  assert.equal(signedPercentage(20), "+20.0%");
  assert.equal(signedPercentage(-58.6), "-58.6%");
  assert.equal(
    escapeChartText('<img src="x" onerror=alert(1)>'),
    "&lt;img src=&quot;x&quot; onerror=alert(1)&gt;",
  );
  assert.ok(
    !chartTooltip("<script>", [
      { label: "<img>", value: "<iframe>", color: "#fff" },
    ]).includes("<img>"),
  );
});
test("native monotone curves pass through original extrema without overshoot", () => {
  const chart = init(null, undefined, {
    renderer: "svg",
    ssr: true,
    width: 480,
    height: 240,
  });
  try {
    chart.setOption({
      animation: false,
      grid: { left: 40, right: 20, top: 10, bottom: 40 },
      xAxis: {
        type: "category",
        data: ["1", "2", "3", "4", "5"],
        boundaryGap: false,
      },
      yAxis: { min: 0, max: 100 },
      series: [
        {
          ...curvedLine,
          data: [0, 100, 25, 100, 0],
          showSymbol: false,
          lineStyle: { color: "#123456" },
        },
      ],
    });
    const svg = chart.renderToSVGString();
    const path = svg.match(/<path d="([^"]+)"[^>]*stroke="#123456"/);
    assert.ok(path, "line is rendered as SVG");
    const tokens = path[1].match(/[MLC]|-?\d+(?:\.\d+)?/g)!;
    assert.equal(tokens.shift(), "M");
    let x = Number(tokens.shift()),
      y = Number(tokens.shift());
    let segments = 0;
    while (tokens.length) {
      assert.equal(tokens.shift(), "C");
      const values = tokens.splice(0, 6).map(Number);
      const [cx1, cy1, cx2, cy2, nx, ny] = values;
      assert.ok(cx1 >= x && cx1 <= nx && cx2 >= x && cx2 <= nx);
      assert.ok(cy1 >= Math.min(y, ny) - 0.01 && cy1 <= Math.max(y, ny) + 0.01);
      assert.ok(cy2 >= Math.min(y, ny) - 0.01 && cy2 <= Math.max(y, ny) + 0.01);
      x = nx;
      y = ny;
      segments++;
    }
    assert.equal(segments, 4);
  } finally {
    chart.dispose();
  }
});
test("native dataZoom preserves original values, including null and zero, and keeps Y fixed", () => {
  const chart = init(null, undefined, {
    renderer: "svg",
    ssr: true,
    width: 390,
    height: 240,
  });
  try {
    const data = [0, null, 100, 25, 80, 90];
    chart.setOption({
      animation: false,
      xAxis: { type: "category", data: [1, 2, 3, 4, 5, 6] },
      yAxis: { min: 0, max: 100 },
      dataZoom: [{ type: "inside", xAxisIndex: 0, filterMode: "none" }],
      series: [{ ...curvedLine, data, connectNulls: false }],
    });
    chart.dispatchAction({ type: "dataZoom", start: 60, end: 100 });
    const option = chart.getOption();
    assert.deepEqual(
      (option.series as { data: (number | null)[] }[])[0].data,
      data,
    );
    assert.equal((option.yAxis as { min: number; max: number }[])[0].min, 0);
    assert.equal((option.yAxis as { min: number; max: number }[])[0].max, 100);
    assert.equal((option.dataZoom as { end: number }[])[0].end, 100);
  } finally {
    chart.dispose();
  }
});
