"use client";
import { useState } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Button,
  Tooltip,
  IconButton,
} from "@mui/material";
import Close from "@mui/icons-material/Close";
import { AssignmentMedia, type MediaDimensions } from "./media";
import type { Media } from "./models";
export function MediaEditor({
  media,
  onChange,
}: {
  media: Media[];
  onChange: (media: Media[]) => void;
}) {
  if (!media.length) return null;
  return (
    <Stack spacing={1}>
      {media.map((item, i) => (
        <MediaEditorItem
          key={item.materialId}
          item={item}
          onChange={(value) =>
            onChange(media.map((m, j) => (j === i ? value : m)))
          }
          onRemove={() => onChange(media.filter((_, j) => j !== i))}
        />
      ))}
    </Stack>
  );
}
function MediaEditorItem({
  item,
  onChange,
  onRemove,
}: {
  item: Media;
  onChange: (item: Media) => void;
  onRemove: () => void;
}) {
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null);
  const visual =
    item.file &&
    (item.file.mimeType.startsWith("image/") ||
      item.file.mimeType.startsWith("video/"));
  return (
    <Box>
      <AssignmentMedia media={[item]} onDimensions={setDimensions} />
      <Box component="details" sx={{ mt: 1 }}>
        <Typography
          component="summary"
          variant="body2"
          sx={{ cursor: "pointer", color: "var(--a-green)" }}
        >
          Chỉnh hiển thị / gỡ tài liệu
        </Typography>
        {visual && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {dimensions
              ? `Kích thước mặc định (gốc): ${dimensions.width} × ${dimensions.height} px. Tự co vừa khung hiển thị.`
              : "Kích thước mặc định: tự động theo tệp gốc. Tải ảnh / phát video để xem số pixel."}
          </Typography>
        )}
        <Stack
          className="assignment-labels"
          direction="row"
          useFlexGap
          sx={{ mt: 1.5, flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}
        >
          {visual && (
            <>
              <TextField
                size="small"
                type="number"
                label="Chiều rộng"
                value={item.displayWidth ?? ""}
                placeholder={dimensions ? String(dimensions.width) : "Tự động"}
                onChange={(e) =>
                  onChange({
                    ...item,
                    displayWidth: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">px</InputAdornment>
                    ),
                  },
                  htmlInput: { min: 1, max: 4096, step: 1 },
                }}
                sx={{
                  width: { xs: "calc((100% - 12px) / 2)", sm: 150 },
                  maxWidth: "100%",
                }}
              />
              <TextField
                size="small"
                type="number"
                label="Chiều cao"
                value={item.displayHeight ?? ""}
                placeholder={dimensions ? String(dimensions.height) : "Tự động"}
                onChange={(e) =>
                  onChange({
                    ...item,
                    displayHeight: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">px</InputAdornment>
                    ),
                  },
                  htmlInput: { min: 1, max: 4096, step: 1 },
                }}
                sx={{
                  width: { xs: "calc((100% - 12px) / 2)", sm: 150 },
                  maxWidth: "100%",
                }}
              />
              <FormControlLabel
                sx={{ m: 0, minHeight: 40 }}
                control={
                  <Checkbox
                    checked={item.keepAspectRatio}
                    onChange={(_, keepAspectRatio) =>
                      onChange({ ...item, keepAspectRatio })
                    }
                  />
                }
                label="Giữ tỷ lệ"
              />
              <Button
                size="small"
                onClick={() =>
                  onChange({
                    ...item,
                    displayWidth: null,
                    displayHeight: null,
                    keepAspectRatio: true,
                  })
                }
              >
                Kích thước gốc
              </Button>
            </>
          )}
          <Tooltip title="Bỏ media">
            <IconButton aria-label="Bỏ media" onClick={onRemove}>
              <Close fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );
}
