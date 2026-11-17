"use client";
import { forwardRef, useRef } from "react";
import Box, { type BoxProps } from "@mui/material/Box";

const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const reduced = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Horizontal swipe to dismiss with elastic feedback: the card follows the
 * finger with growing resistance and fades; releasing past the threshold
 * flings it away, otherwise it springs back. Styles are written straight to
 * the element during the drag (no React re-render), so it stays smooth.
 */
export const SwipeDismiss = forwardRef<
  HTMLDivElement,
  BoxProps & { onDismiss: () => void }
>(function SwipeDismiss({ children, onDismiss, sx = [], ...props }, ref) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null),
    node = useRef<HTMLDivElement | null>(null);
  const setStyle = (transform: string, opacity: number, transition: string) => {
    const el = node.current;
    if (!el) return;
    el.style.transition = transition;
    el.style.transform = transform;
    el.style.opacity = String(opacity);
  };
  const release = () =>
    setStyle(
      "none",
      1,
      reduced() ? "none" : `transform 520ms ${SPRING}, opacity 240ms ease`,
    );
  return (
    <Box
      {...props}
      ref={(el: HTMLDivElement | null) => {
        node.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      sx={[
        { touchAction: "pan-y", willChange: "transform" },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      }}
      onPointerMove={(e) => {
        const at = start.current;
        if (!at || at.id !== e.pointerId) return;
        const dx = e.clientX - at.x;
        if (Math.abs(dx) < 4 || Math.abs(dx) < Math.abs(e.clientY - at.y))
          return;
        // Rubber band: movement slows down the further it goes.
        const pull = Math.sign(dx) * Math.pow(Math.abs(dx), 0.85);
        const stretch = 1 + Math.min(Math.abs(dx) / 1200, 0.04);
        setStyle(
          `translateX(${pull}px) scale(${stretch}, ${2 - stretch})`,
          Math.max(0.35, 1 - Math.abs(dx) / 260),
          "none",
        );
      }}
      onPointerCancel={() => {
        start.current = null;
        release();
      }}
      onPointerUp={(e) => {
        const at = start.current;
        start.current = null;
        if (!at || at.id !== e.pointerId) return release();
        const dx = e.clientX - at.x;
        if (
          Math.abs(dx) > 70 &&
          Math.abs(dx) > Math.abs(e.clientY - at.y) * 1.5
        ) {
          if (reduced()) return onDismiss();
          setStyle(
            `translateX(${Math.sign(dx) * 120}%)`,
            0,
            "transform 220ms cubic-bezier(0.3, 0, 0.8, 0.15), opacity 200ms ease",
          );
          window.setTimeout(onDismiss, 200);
        } else release();
      }}
    >
      {children}
    </Box>
  );
});
