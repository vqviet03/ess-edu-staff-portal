"use client";
import { useLayoutEffect, useId } from "react";
import { askConfirm } from "./dialogs";
const dirtyForms = new Set<string>();
let previous: { url: string; state: unknown } | null = null;
let leavingByHistory = false;
let confirmedClick: HTMLAnchorElement | null = null;
export const hasUnsaved = () => dirtyForms.size > 0;
/** Resolves immediately when nothing is dirty; otherwise asks once in an in-app dialog. */
export const confirmLeave = (): Promise<boolean> =>
  !dirtyForms.size
    ? Promise.resolve(true)
    : askConfirm({
        title: "Bỏ thay đổi chưa lưu?",
        message: "Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi?",
        confirmText: "Rời trang",
        cancelText: "Ở lại",
        danger: true,
      });
export function useUnsaved(dirty: boolean) {
  const id = useId();
  useLayoutEffect(() => {
    if (!dirty) return;
    if (!dirtyForms.size)
      previous = { url: location.href, state: history.state };
    dirtyForms.add(id);
    return () => {
      dirtyForms.delete(id);
      if (!dirtyForms.size) previous = null;
    };
  }, [dirty, id]);
}
export function UnsavedRuntime() {
  useLayoutEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (!dirtyForms.size) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const click = (e: MouseEvent) => {
      const link = (e.target as Element)?.closest("a");
      if (link && link === confirmedClick) {
        confirmedClick = null;
        return;
      }
      if (
        !dirtyForms.size ||
        !link?.href ||
        link.hasAttribute("data-navigation-back") ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        new URL(link.href).origin !== location.origin ||
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      // Hold the navigation, ask in-app, then replay the same click so client routing still applies.
      e.preventDefault();
      e.stopImmediatePropagation();
      void confirmLeave().then((ok) => {
        if (!ok || !link.isConnected) return;
        confirmedClick = link;
        link.click();
      });
    };
    const pop = (e: PopStateEvent) => {
      if (leavingByHistory) {
        leavingByHistory = false;
        return;
      }
      if (!dirtyForms.size) return;
      e.stopImmediatePropagation();
      const restore = previous;
      if (restore) history.pushState(restore.state, "", restore.url);
      void confirmLeave().then((ok) => {
        if (!ok) return;
        if (!restore) return location.reload();
        leavingByHistory = true;
        history.back();
      });
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", pop, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", pop, true);
    };
  }, []);
  return null;
}
