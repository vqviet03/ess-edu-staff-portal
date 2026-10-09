export const MIN_CHART_ZOOM = 0.5;
export const MAX_CHART_ZOOM = 4;
export const CHART_ZOOM_STEP = 0.25;

// Preserve time spacing: even a short cluster inside a long range needs room.
export function chartWidth(
  viewportWidth: number,
  pointCount: number,
  zoom: number,
  minPointGap = 64,
  xValues?: readonly number[],
): number {
  if (viewportWidth <= 0) return 0;
  let intervals = Math.max(0, pointCount - 1);
  if (xValues) {
    const positions = [...new Set(xValues.filter(Number.isFinite))].sort((a, b) => a - b);
    if (positions.length > 1) {
      let smallestGap = Infinity;
      for (let i = 1; i < positions.length; i++) {
        smallestGap = Math.min(smallestGap, positions[i] - positions[i - 1]);
      }
      intervals = (positions[positions.length - 1] - positions[0]) / smallestGap;
    } else intervals = 0;
  }
  const axisSpace = 88;
  const baseWidth = Math.max(viewportWidth, axisSpace + intervals * minPointGap);
  const scale = Math.min(MAX_CHART_ZOOM, Math.max(MIN_CHART_ZOOM, zoom));
  const scaledWidth = axisSpace + (baseWidth - axisSpace) * scale;
  return scaledWidth <= viewportWidth ? viewportWidth : Math.ceil(scaledWidth);
}
