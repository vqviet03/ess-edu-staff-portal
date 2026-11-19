"use client";
import { useId, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import ExpandMore from "@mui/icons-material/ExpandMore";
import AttachFile from "@mui/icons-material/AttachFile";
import { AssignmentMedia } from "./media";
import type { Media } from "./models";

/**
 * Keeps a question's images and files out of the way while reviewing answers. Collapsed by default;
 * the media (and any downloads it triggers) only mount once opened.
 */
export function AttachmentsDisclosure({
  media,
  label = "Hình / tệp đính kèm của đề",
}: {
  media: Media[];
  label?: string;
}) {
  const [open, setOpen] = useState(false),
    id = useId();
  if (!media.length) return null;
  return (
    <Box
      data-testid="question-attachments"
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: "10px",
        minWidth: 0,
      }}
    >
      <ButtonBase
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        sx={{
          width: "100%",
          justifyContent: "flex-start",
          gap: 1,
          px: 1.25,
          py: 0.75,
          borderRadius: "10px",
          color: "text.secondary",
        }}
      >
        <AttachFile fontSize="small" />
        <Typography variant="body2" sx={{ flex: 1, textAlign: "left" }}>
          {label} ({media.length})
        </Typography>
        <ExpandMore
          fontSize="small"
          sx={{
            transition: "transform .2s",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </ButtonBase>
      <Collapse in={open} id={id} unmountOnExit>
        <Box sx={{ px: 1.25, pb: 1.25 }}>
          <AssignmentMedia media={media} />
        </Box>
      </Collapse>
    </Box>
  );
}
