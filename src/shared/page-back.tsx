"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import { usePathname, useSearchParams } from "next/navigation";
import { BackAction } from "./back-action";

/** Entry pages of the staff portal; every other page shows Back. */
const rootPages = ["/", "/home/", "/login/", "/login/link/", "/activate/"];

const query = (values: Record<string, string | null>) =>
  new URLSearchParams(
    Object.entries(values).filter(([, v]) => v) as [string, string][],
  ).toString();

/**
 * Where Back goes when the browser has no in-app history entry (deep link,
 * reload in a new tab). Returns `null` for entry pages, which have no Back.
 * Keep every page's parent here so pages never render their own back links.
 */
export function backFallback(
  pathname: string,
  params: URLSearchParams,
): string | null {
  if (rootPages.includes(pathname)) return null;
  const get = (key: string) => params.get(key) ?? "";
  const classId = get("classId"),
    sessionId = get("sessionId"),
    assessmentId = get("assessmentId"),
    entity = params.get("entity") ?? "students";
  const classPage = (tab?: string) =>
    classId ? `/class/?${query({ classId, tab: tab ?? null })}` : "/home/";
  const [section] = pathname.split("/").filter(Boolean);
  switch (section) {
    case "class":
      return "/home/";
    case "session":
      return classPage("progress");
    case "student":
    case "reports":
      return classPage("profile");
    case "assessment":
      return `/session/?${query({ classId, sessionId })}`;
    case "scores":
      return `/session/?${query({ classId, sessionId })}`;
    case "student-score":
    case "import":
      return `/scores/?${query({ classId, sessionId, assessmentId })}`;
    case "assignment": {
      const id = params.get("assignmentId");
      return id && ["edit", "grade"].includes(params.get("mode") ?? "")
        ? `/assignment/?${query({ assignmentId: id, classId })}`
        : classId
          ? `/class/thread/?${query({ classId })}`
          : "/home/";
    }
    case "assignment-report": {
      const id = params.get("assignmentId");
      return id
        ? `/assignment/?${query({ assignmentId: id, classId })}`
        : classPage();
    }
    case "post":
      return classId ? `/class/thread/?${query({ classId })}` : "/home/";
    case "manage":
      if (
        ["/manage/profile/", "/manage/excel/", "/manage/grid/"].some((p) =>
          pathname.startsWith(p),
        )
      )
        return `/manage/list/?${query({ entity })}`;
      return "/home/";
    case "rewards": {
      const classKey = params.get("classKey");
      if (pathname.startsWith("/rewards/catalogs/"))
        return params.get("id") ? "/rewards/catalogs/" : "/home/";
      return classKey
        ? `/class/?${query({ classId: classKey })}`
        : "/rewards/catalogs/";
    }
    default:
      return "/home/";
  }
}

/** The fallback for the current page, or `null` on entry pages. */
export function useBackFallback() {
  const pathname = usePathname(),
    params = useSearchParams();
  return backFallback(pathname, new URLSearchParams(params.toString()));
}

/**
 * The single Back control, rendered by the common page header on every
 * non-entry page. Renders `otherwise` on entry pages.
 */
export function PageBack({ otherwise = null }: { otherwise?: ReactNode }) {
  const fallback = useBackFallback();
  return fallback ? <BackAction fallback={fallback} /> : otherwise;
}

/**
 * Keeps Back reachable while reading a long page: once the header row
 * scrolls under `offset` (px from the top), a floating copy of Back fades in
 * at the same horizontal position; scrolling back to the top hides it and the
 * full header (title, subtitle, actions) is visible again. Layout never
 * changes, so scrolling cannot jump.
 */
export function useFloatingBack(offset: number) {
  const ref = useRef<HTMLDivElement>(null),
    [state, setState] = useState<{ shown: boolean; left: number }>({
      shown: false,
      left: 0,
    });
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const place = (shown: boolean) =>
      setState({ shown, left: element.getBoundingClientRect().left });
    const observer = new IntersectionObserver(
      ([entry]) =>
        place(!entry.isIntersecting && entry.boundingClientRect.top < offset),
      { rootMargin: `-${offset}px 0px 0px 0px` },
    );
    observer.observe(element);
    const resize = () =>
      setState((previous) => ({
        ...previous,
        left: element.getBoundingClientRect().left,
      }));
    window.addEventListener("resize", resize, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [offset]);
  return [ref, state] as const;
}

/** The floating Back shown by `useFloatingBack`. */
export function FloatingBack({
  shown,
  left,
  top,
}: {
  shown: boolean;
  left: number;
  top: number;
}) {
  const fallback = useBackFallback();
  if (!fallback) return null;
  return (
    <Box
      aria-hidden
      data-floating-back={shown || undefined}
      sx={(theme) => ({
        position: "fixed",
        top,
        left,
        zIndex: theme.zIndex.appBar - 1,
        borderRadius: "12px",
        boxShadow: shown ? theme.shadows[4] : "none",
        opacity: shown ? 1 : 0,
        visibility: shown ? "visible" : "hidden",
        pointerEvents: shown ? "auto" : "none",
        transform: shown ? "none" : "translateY(-6px) scale(0.92)",
        transition: theme.transitions.create(
          ["opacity", "transform", "box-shadow", "visibility"],
          {
            duration: theme.transitions.duration.short,
            easing: theme.transitions.easing.easeOut,
          },
        ),
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      })}
    >
      {/* A pointer shortcut only: keyboard and screen readers keep using the
          Back in the page header, so the copy never duplicates it. */}
      <BackAction fallback={fallback} focusable={false} />
    </Box>
  );
}
