"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

// Live WebM recordings may omit Duration. One native seek discovers the end;
// no decoding, second download, polling or perpetual timer is needed.
export function useAudioTimeline(
  ref: RefObject<HTMLAudioElement | null>,
  source: string | undefined,
) {
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const wantsPlay = useRef(false);
  const discovered = useRef(false);
  const play = useCallback(async () => {
    wantsPlay.current = true;
    try {
      await ref.current?.play();
    } catch (error) {
      // Seeking to discover a live container can interrupt the initial play.
      if (
        !(
          discovered.current &&
          error instanceof DOMException &&
          error.name === "AbortError"
        )
      )
        throw error;
    }
  }, [ref]);
  const pause = useCallback(() => {
    wantsPlay.current = false;
    ref.current?.pause();
  }, [ref]);
  useEffect(() => {
    const node = ref.current;
    if (!node || !source) return;
    let stage: "idle" | "discovering" | "restoring" = "idle";
    let restore = 0;
    discovered.current = false;
    const finite = (n: number) => Number.isFinite(n) && n > 0 && n < 1e10;
    const readDuration = () => {
      if (finite(node.duration)) setDuration(node.duration);
      else if (node.seekable.length) {
        const end = node.seekable.end(node.seekable.length - 1);
        if (finite(end)) setDuration(end);
      }
    };
    const metadata = () => {
      readDuration();
      if (node.duration !== Infinity || discovered.current) return;
      discovered.current = true;
      restore = node.currentTime;
      wantsPlay.current ||= !node.paused;
      stage = "discovering";
      try {
        node.currentTime = 1e10;
      } catch {
        stage = "idle";
      }
    };
    const seeked = () => {
      if (stage === "restoring") {
        stage = "idle";
        if (wantsPlay.current) void play().catch(() => {});
        return;
      }
      if (stage !== "discovering") return;
      readDuration();
      if (!finite(node.duration) && finite(node.currentTime))
        setDuration(node.currentTime);
      stage = "restoring";
      node.currentTime = restore;
    };
    const update = () => {
      if (stage !== "idle") return;
      readDuration();
      setPosition(Number.isFinite(node.currentTime) ? node.currentTime : 0);
    };
    const ended = () => {
      if (stage === "idle" && finite(node.currentTime)) {
        setDuration(node.currentTime);
        wantsPlay.current = false;
      }
    };
    node.addEventListener("loadedmetadata", metadata);
    node.addEventListener("durationchange", readDuration);
    node.addEventListener("progress", readDuration);
    node.addEventListener("seeked", seeked);
    node.addEventListener("timeupdate", update);
    node.addEventListener("ended", ended);
    if (node.readyState >= 1) metadata();
    return () => {
      node.removeEventListener("loadedmetadata", metadata);
      node.removeEventListener("durationchange", readDuration);
      node.removeEventListener("progress", readDuration);
      node.removeEventListener("seeked", seeked);
      node.removeEventListener("timeupdate", update);
      node.removeEventListener("ended", ended);
    };
  }, [ref, source, play]);
  return { position, duration, play, pause };
}
