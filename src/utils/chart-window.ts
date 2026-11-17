// Only the visible X range changes; the chart canvas and Y axis never scroll.
export function newestWindow(
  positions: readonly number[],
  width: number,
  gap = 64,
) {
  const xs = [...new Set(positions.filter(Number.isFinite))].sort(
    (a, b) => a - b,
  );
  const capacity = Math.max(2, Math.floor(Math.max(0, width - 76) / gap));
  if (xs.length <= capacity) return { start: 0, end: 100 };
  const first = xs[0],
    last = xs[xs.length - 1];
  return {
    start: ((xs[xs.length - capacity] - first) / (last - first)) * 100,
    end: 100,
  };
}
export const escapeChartText = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch]!,
  );
