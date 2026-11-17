"use client";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Description from "@mui/icons-material/Description";
import { MaterialThumbnail } from "./thumbnail";
import { fileKind, bytes } from "./utils";
import type { MaterialFile } from "./models";
export function CommentAttachment({
  file,
  preview,
}: {
  file: MaterialFile;
  preview: (file: MaterialFile) => void;
}) {
  return (
    <Tooltip title={file.displayName}>
      <ButtonBase
        aria-label={`Xem ${file.displayName}`}
        onClick={() => preview(file)}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          width: 192,
          maxWidth: "100%",
          border: "1px solid var(--post-border)",
          borderRadius: 2,
          overflow: "hidden",
          textAlign: "left",
        }}
      >
        <Box
          data-testid="comment-thumbnail-frame"
          sx={{
            width: "100%",
            height: 120,
            overflow: "hidden",
            bgcolor: "var(--post-tint)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {file.thumbnailUrl ? (
            <MaterialThumbnail id={file.id} fit="cover" fill />
          ) : (
            <Description sx={{ fontSize: 32, color: "var(--post-green)" }} />
          )}
        </Box>
        <Box sx={{ p: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {file.displayName}
          </Typography>
          <Typography sx={{ fontSize: 11, color: "var(--post-muted)" }}>
            {fileKind(file.mimeType)} · {bytes(file.sizeBytes)}
          </Typography>
        </Box>
      </ButtonBase>
    </Tooltip>
  );
}
