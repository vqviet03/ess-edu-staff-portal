"use client";
import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";

export function SvgLogo({
  svg,
  label,
  size,
  background,
}: {
  svg: string;
  label: string;
  size: number;
  background?: string;
}) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [svg]);
  return (
    <Box
      component="img"
      ref={image}
      width={size}
      height={size}
      alt={label}
      sx={{ bgcolor: background, objectFit: "contain" }}
    />
  );
}
