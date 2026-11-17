"use client";
import { useEffect, useState } from "react";
export function usePostTarget(postId: string) {
  const [value, setValue] = useState<{ postId: string; comment?: string }>();
  useEffect(() => {
    const read = () => {
      let comment =
        new URLSearchParams(location.search).get("commentId") || undefined;
      try {
        if (location.hash.startsWith("#comment-"))
          comment = decodeURIComponent(location.hash.slice(9));
      } catch {
        comment = undefined;
      }
      setValue({ postId, comment });
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [postId]);
  return value?.postId === postId ? value : undefined;
}
