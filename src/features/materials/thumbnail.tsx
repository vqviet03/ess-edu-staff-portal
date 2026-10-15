"use client";
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import { useContentQuery } from "@/api/library-api";
export function MaterialThumbnail({
  id,
  fit = "contain",
  fill = false,
  natural = false,
}: {
  id: string;
  fit?: "contain" | "cover";
  fill?: boolean;
  natural?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState<number>(),
    [near, setNear] = useState(false);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    const resize = new ResizeObserver(([entry]) => {
      const pixels = entry.contentRect.width * (window.devicePixelRatio || 1);
      if (pixels > 0) setWidth(pixels > 640 ? 1280 : pixels > 256 ? 640 : 256);
    });
    resize.observe(node);
    return () => resize.disconnect();
    observer.disconnect();
  }, []);
  const query = useContentQuery(
    { id, purpose: "thumbnail", width },
    { skip: !width || !near },
  );
  return (
    <Box
      ref={container}
      sx={{
        width: fill || natural ? "100%" : 108,
        height: fill && !natural ? "100%" : "auto",
        minHeight: natural ? 108 : undefined,
        minWidth: 0,
      }}
    >
      {query.currentData ? (
        <Box
          component="img"
          src={query.currentData}
          alt=""
          loading="lazy"
          decoding="async"
          sx={{
            display: "block",
            width: fill || natural ? "100%" : "auto",
            height: fill && !natural ? "100%" : "auto",
            maxWidth: "100%",
            maxHeight: natural ? "none" : fill ? "100%" : 108,
            objectFit: fit,
          }}
        />
      ) : (
        <span aria-label="Đang tải ảnh thu nhỏ">▧</span>
      )}
    </Box>
  );
}
