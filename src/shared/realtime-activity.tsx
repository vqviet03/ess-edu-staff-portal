"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useAppSelector } from "@/store";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TouchAppOutlined from "@mui/icons-material/TouchAppOutlined";
export const REALTIME_ACTIVITY = "portal:realtime-activity";
export const IDLE_MS = 10 * 60 * 1000;
let sleeping = false;
export function realtimeAwake() {
  return !sleeping;
}
export function RealtimeActivity({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = Date.now(),
      suppressUntil = 0;
    const setSleeping = (value: boolean) => {
      if (sleeping === value) return;
      sleeping = value;
      setIdle(value);
      window.dispatchEvent(new Event(REALTIME_ACTIVITY));
    };
    const check = () => {
      clearTimeout(timer);
      if (!enabled || document.hidden) return;
      const remaining = IDLE_MS - (Date.now() - last);
      if (remaining <= 0) setSleeping(true);
      else timer = setTimeout(check, remaining);
    };
    const activity = (event: Event) => {
      if (!enabled || document.hidden) return;
      const wasSleeping = sleeping;
      // Consume the entire waking gesture, including its eventual click/key-up.
      if (wasSleeping) suppressUntil = Date.now() + 800;
      if (
        wasSleeping ||
        (Date.now() < suppressUntil &&
          ["click", "pointerup", "keyup"].includes(event.type))
      ) {
        if (event.cancelable) event.preventDefault();
        event.stopImmediatePropagation();
        if (event.type === "click" || event.type === "keyup") suppressUntil = 0;
      }
      last = Date.now();
      if (wasSleeping) {
        setSleeping(false);
        check();
      }
      // Frequent pointer events only update a number. The existing timer reschedules itself.
    };
    const visibility = () => {
      clearTimeout(timer);
      setSleeping(false);
      last = Date.now();
      check();
    };
    const events = [
      "pointerdown",
      "pointermove",
      "pointerup",
      "keydown",
      "keyup",
      "click",
      "wheel",
      "touchstart",
      "scroll",
    ];
    for (const name of events)
      document.addEventListener(name, activity, {
        capture: true,
        passive: false,
      });
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pageshow", visibility);
    setSleeping(false);
    check();
    return () => {
      clearTimeout(timer);
      for (const name of events)
        document.removeEventListener(name, activity, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pageshow", visibility);
      setSleeping(false);
    };
  }, [enabled]);
  return (
    <>
      <div inert={idle} style={{ display: "contents" }}>
        {children}
      </div>
      {idle && (
        <Box
          role="button"
          tabIndex={0}
          aria-label="Chạm hoặc thao tác để tiếp tục"
          data-testid="realtime-idle"
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "grid",
            placeContent: "center",
            textAlign: "center",
            gap: 2,
            backdropFilter: "blur(10px)",
            bgcolor: "rgba(30,55,40,.3)",
            color: "text.primary",
            touchAction: "none",
          }}
        >
          <TouchAppOutlined sx={{ mx: "auto", fontSize: 40 }} />
          <Typography
            sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper" }}
          >
            Chạm hoặc thao tác để tiếp tục
          </Typography>
        </Box>
      )}
    </>
  );
}

export function RealtimeBoundary({ children }: { children: ReactNode }) {
  const enabled = useAppSelector((s) => s.auth.status === "authenticated");
  return <RealtimeActivity enabled={enabled}>{children}</RealtimeActivity>;
}
