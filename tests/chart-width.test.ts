import assert from "node:assert/strict";
import test from "node:test";
import { chartWidth } from "../src/utils/chart-width";

test("dense charts scroll only when their available width is too small", () => {
  assert.equal(chartWidth(320, 3, 1), 320);
  assert.equal(chartWidth(320.5, 3, 1), 320.5);
  assert.equal(chartWidth(320, 6, 1), 408);
  assert.equal(chartWidth(1000, 6, 1), 1000);
  assert.equal(chartWidth(220, 6, 1, 96), 568);
  assert.equal(chartWidth(320, 0, 1), 320);
  assert.equal(chartWidth(0, 6, 1), 0);
});
test("horizontal zoom changes plot width, clamps its limits and never shrinks the viewport", () => {
  assert.equal(chartWidth(320, 6, 1.5), 568);
  assert.equal(chartWidth(320, 6, 0.5), 320);
  assert.equal(chartWidth(320, 6, 0), chartWidth(320, 6, 0.5));
  assert.equal(chartWidth(320, 6, 100), chartWidth(320, 6, 4));
});
test("time axes keep close dates readable without replacing elapsed time by category spacing", () => {
  const dates = [101, 0, 100];
  assert.equal(chartWidth(320, 3, 1, 48, dates), 4936);
  assert.deepEqual(dates, [101, 0, 100]);
  assert.equal(chartWidth(320, 4, 1, 48, [0, 10, 10, 20]), 320);
  assert.equal(chartWidth(320, 3, 1, 48, [NaN, Infinity, 1]), 320);
});
