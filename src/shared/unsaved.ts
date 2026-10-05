"use client";
import { useLayoutEffect, useId } from "react";
const dirtyForms = new Set<string>();
let previous: { url: string; state: unknown } | null = null;
export const confirmLeave = () =>
  !dirtyForms.size ||
  window.confirm("Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi?");
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
      if (
        link?.href &&
        link.target !== "_blank" &&
        !link.hasAttribute("download") &&
        new URL(link.href).origin === location.origin &&
        !confirmLeave()
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    const pop = (e: PopStateEvent) => {
      if (!confirmLeave()) {
        e.stopImmediatePropagation();
        if (previous) history.pushState(previous.state, "", previous.url);
      }
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
