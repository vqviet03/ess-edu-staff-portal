"use client";
import type { ReactNode } from "react";
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
