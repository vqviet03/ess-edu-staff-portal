"use client";
import Box from "@mui/material/Box";
import { useContentQuery } from "@/api/library-api";
export function MaterialThumbnail({
  id,
  fit = "contain",
  fill = false,
}: {
  id: string;
  fit?: "contain" | "cover";
  fill?: boolean;
}) {
  const query = useContentQuery({ id, purpose: "thumbnail" });
  return query.currentData ? (
    <Box
      component="img"
      src={query.currentData}
      alt=""
      loading="lazy"
      sx={{
        display: "block",
        width: fill ? "100%" : "auto",
        height: fill ? "100%" : "auto",
        maxWidth: "100%",
        maxHeight: fill ? "100%" : 108,
        objectFit: fit,
      }}
    />
  ) : (
    <span aria-label="Đang tải ảnh thu nhỏ">▧</span>
  );
}
