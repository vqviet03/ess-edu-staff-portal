"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";

const MIN_WIDTH = 72,
  GAP = 8,
  ARROW = 36,
  SPRING = "transform 460ms cubic-bezier(0.34, 1.56, 0.64, 1)";

/**
 * Unit picker shown as buttons. As many whole buttons as fit are visible
 * (their width stretches so the row is exactly filled); the arrows page by
 * that many. Dragging follows the pointer freely, then snaps to the nearest
 * whole-button position, so no button is ever cut off. Keeps tab semantics
 * (tablist / tab / aria-selected) for keyboard and screen readers.
 */
export function UnitPager({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}) {
  const outer = useRef<HTMLDivElement>(null),
    track = useRef<HTMLDivElement>(null),
    drag = useRef<{
      x: number;
      y: number;
      id: number;
      time: number;
      dx: number;
      moved: boolean;
    } | null>(null),
    suppressClick = useRef(false);
  const [outerWidth, setOuterWidth] = useState(0),
    [start, setStart] = useState(0);
  useLayoutEffect(() => {
    const element = outer.current;
    if (!element) return;
    const measure = () => setOuterWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const count = items.length,
    fitsAll = count * MIN_WIDTH + (count - 1) * GAP <= outerWidth,
    viewport = fitsAll ? outerWidth : outerWidth - 2 * (ARROW + 4),
    perView = Math.max(
      1,
      Math.min(count, Math.floor((viewport + GAP) / (MIN_WIDTH + GAP))),
    ),
    itemWidth =
      viewport > 0 ? (viewport - GAP * (perView - 1)) / perView : MIN_WIDTH,
    step = itemWidth + GAP,
    maxStart = Math.max(0, count - perView),
    first = Math.min(start, maxStart);
  const place = (offset: number, animate: boolean) => {
    const element = track.current;
    if (!element) return;
    element.style.transition = animate ? SPRING : "none";
    element.style.transform = `translate3d(${offset}px,0,0)`;
  };
  // Settle on the current whole-button position whenever layout changes.
  useLayoutEffect(() => {
    if (!drag.current) place(-first * step, true);
  }, [first, step]);
  // Keep the selected Unit in view.
  useEffect(() => {
    const index = items.findIndex((u) => u.id === value);
    if (index < 0) return;
    setStart((s) =>
      index < s ? index : index >= s + perView ? index - perView + 1 : s,
    );
  }, [value, perView, items]);
  const go = (next: number) => setStart(Math.max(0, Math.min(maxStart, next)));
  const arrowSx = {
    width: ARROW,
    height: ARROW,
    flexShrink: 0,
    borderRadius: "10px",
    bgcolor: "action.hover",
  };
  return (
    <Stack
      ref={outer}
      direction="row"
      sx={{ alignItems: "center", gap: "4px", minWidth: 0 }}
    >
      {!fitsAll && (
        <IconButton
          aria-label="Xem các Unit trước"
          disabled={first <= 0}
          onClick={() => go(first - perView)}
          sx={arrowSx}
        >
          <ChevronLeft />
        </IconButton>
      )}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          touchAction: "pan-y",
          py: 0.5,
          cursor: maxStart > 0 ? "grab" : undefined,
        }}
        onPointerDown={(e) => {
          if (maxStart === 0 || e.button !== 0) return;
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            id: e.pointerId,
            time: e.timeStamp,
            dx: 0,
            moved: false,
          };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          const dx = e.clientX - d.x;
          if (!d.moved) {
            if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - d.y))
              return;
            d.moved = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          d.dx = dx;
          // Free drag, with resistance beyond the first/last button.
          let offset = -first * step + dx;
          const min = -maxStart * step;
          if (offset > 0) offset *= 0.35;
          else if (offset < min) offset = min + (offset - min) * 0.35;
          place(offset, false);
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d || d.id !== e.pointerId || !d.moved) return;
          suppressClick.current = true;
          // Project the flick a little, then snap to a whole button.
          const velocity = d.dx / Math.max(1, e.timeStamp - d.time);
          const projected = -first * step + d.dx + velocity * 160;
          let next = Math.round(-projected / step);
          if (next === first && Math.abs(d.dx) > step * 0.25)
            next = first - Math.sign(d.dx);
          next = Math.max(0, Math.min(maxStart, next));
          if (next === first) place(-first * step, true);
          else setStart(next);
        }}
        onPointerCancel={() => {
          drag.current = null;
          place(-first * step, true);
        }}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            suppressClick.current = false;
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <Stack
          ref={track}
          role="tablist"
          aria-label={ariaLabel}
          direction="row"
          sx={{
            gap: `${GAP}px`,
            width: "max-content",
            willChange: "transform",
            "@media (prefers-reduced-motion: reduce)": {
              transition: "none !important",
            },
          }}
        >
          {items.map((u, index) => {
            const selected = u.id === value;
            return (
              <Button
                key={u.id}
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                variant={selected ? "contained" : "outlined"}
                onClick={() => onChange(u.id)}
                onFocus={() => {
                  if (index < first || index >= first + perView)
                    go(index < first ? index : index - perView + 1);
                }}
                onKeyDown={(e) => {
                  const delta =
                    e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                  if (!delta) return;
                  e.preventDefault();
                  const next = items[index + delta];
                  if (!next) return;
                  onChange(next.id);
                  const buttons =
                    e.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
                      '[role="tab"]',
                    );
                  buttons?.[index + delta]?.focus();
                }}
                sx={{
                  width: itemWidth,
                  minWidth: 0,
                  flexShrink: 0,
                  height: 36,
                  borderRadius: "10px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                  px: 1,
                  ...(selected
                    ? {}
                    : { bgcolor: "background.paper", borderColor: "divider" }),
                }}
              >
                {u.name}
              </Button>
            );
          })}
        </Stack>
      </Box>
      {!fitsAll && (
        <IconButton
          aria-label="Xem các Unit tiếp theo"
          disabled={first >= maxStart}
          onClick={() => go(first + perView)}
          sx={arrowSx}
        >
          <ChevronRight />
        </IconButton>
      )}
    </Stack>
  );
}
