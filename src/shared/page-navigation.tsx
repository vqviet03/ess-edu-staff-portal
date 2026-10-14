"use client";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { safeReturnTo } from "./auth-navigation";
import { confirmLeave } from "./unsaved";

const entryKey = "portalPreviousPage";
/** Preserve Next.js history state, adding only the preceding safe application URL.
 * Replaces (filters, auth redirects, renamed IDs) do not invent an extra history entry.
 * Browser back/forward already restore the original metadata without any interception.
 */
export function NavigationRuntime() {
  useEffect(() => {
    const push = history.pushState.bind(history),
      replace = history.replaceState.bind(history);
    const safe = (url: string) =>
      safeReturnTo(url, process.env.NEXT_PUBLIC_BASE_PATH || "");
    const target = (url?: string | URL | null) => {
      const next = new URL(url?.toString() ?? location.href, location.href);
      return next.origin === location.origin
        ? safe(next.pathname + next.search + next.hash)
        : null;
    };
    const pushWithOrigin: History["pushState"] = (data, unused, url) => {
      const current = safe(location.pathname + location.search + location.hash);
      push({ ...data, [entryKey]: target(url) ? current : null }, unused, url);
    };
    const replaceWithOrigin: History["replaceState"] = (data, unused, url) => {
      replace(
        {
          ...data,
          [entryKey]: target(url) ? (history.state?.[entryKey] ?? null) : null,
        },
        unused,
        url,
      );
    };
    history.pushState = pushWithOrigin;
    history.replaceState = replaceWithOrigin;
    return () => {
      if (history.pushState === pushWithOrigin) history.pushState = push;
      if (history.replaceState === replaceWithOrigin)
        history.replaceState = replace;
    };
  }, []);
  return null;
}
export function usePageBack(fallback: string) {
  const router = useRouter();
  return () => {
    const previous = safeReturnTo(history.state?.[entryKey]);
    // UnsavedRuntime validates native popstate once, just like the browser Back button.
    if (previous) router.back();
    else if (confirmLeave()) router.replace(fallback);
  };
}
/** Small view state belongs in the URL, not in a second copy of local state. */
export function usePageTab<const T extends string>(
  values: readonly T[],
  fallback: T,
) {
  const params = useSearchParams(),
    pathname = usePathname(),
    router = useRouter();
  const candidate = params.get("tab");
  const tab = values.includes(candidate as T) ? (candidate as T) : fallback;
  const setTab = (next: T) => {
    if (next === tab || !confirmLeave()) return;
    const search = new URLSearchParams(params.toString());
    search.set("tab", next);
    router.push(`${pathname}?${search}`, { scroll: false });
  };
  return [tab, setTab] as const;
}

export function useSectionTab<const T extends string>(
  section: string,
  values: readonly T[],
  fallback: T,
) {
  const [queryTab] = usePageTab(values, fallback);
  const params = useSearchParams(),
    pathname = usePathname(),
    router = useRouter();
  const segment = pathname.startsWith(`/${section}/`)
    ? pathname
        .slice(section.length + 2)
        .split("/")
        .filter(Boolean)
        .at(-1)
    : undefined;
  const tab = values.includes(segment as T) ? (segment as T) : queryTab;
  const setTab = (next: T) => {
    if (next === tab || !confirmLeave()) return;
    const search = new URLSearchParams(params.toString());
    search.delete("tab");
    const path =
      section === "home" || pathname.startsWith(`/${section}/`)
        ? `/${section}/${next}/`
        : pathname;
    if (
      path === pathname &&
      !(section === "home" || pathname.startsWith(`/${section}/`))
    )
      search.set("tab", next);
    router.push(`${path}?${search}`, { scroll: false });
  };
  return [tab, setTab] as const;
}
