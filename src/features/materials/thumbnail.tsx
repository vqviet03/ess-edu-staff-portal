"use client";
import Box from "@mui/material/Box";
import { useContentQuery } from "@/api/library-api";
export function MaterialThumbnail({ id }: { id: string }) {
  const query = useContentQuery({ id, purpose: "thumbnail" });
  return query.currentData ? (
    <Box
      component="img"
      src={query.currentData}
      alt=""
      loading="lazy"
      sx={{ maxWidth: "100%", maxHeight: 108, objectFit: "contain" }}
    />
  ) : (
    <span aria-label="Đang tải ảnh thu nhỏ">▧</span>
  );
}
