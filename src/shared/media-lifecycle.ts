import { useEffect } from "react";
export function releaseMedia(node: HTMLMediaElement) {
  node.pause();
  node.removeAttribute("src");
  node
    .querySelectorAll("source")
    .forEach((source) => source.removeAttribute("src"));
  node.load();
}
export function useMediaCleanup(ref: { readonly current: HTMLElement | null }) {
  useEffect(() => {
    const root = ref.current;
    return () => {
      root
        ?.querySelectorAll<HTMLMediaElement>("audio,video")
        .forEach(releaseMedia);
    };
  }, [ref]);
}
