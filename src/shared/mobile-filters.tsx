"use client";
import { useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import FilterList from "@mui/icons-material/FilterList";
import Close from "@mui/icons-material/Close";

/** Mobile filters are staged locally; only Apply changes the query arguments. */
export function MobileFilters<T>({
  value,
  empty,
  onApply,
  title = "Bộ lọc",
  children,
}: {
  value: T;
  empty: T;
  onApply: (value: T) => void;
  title?: string;
  children: (value: T, setValue: (value: T) => void) => ReactNode;
}) {
  const mobile = useMediaQuery(useTheme().breakpoints.down("md"));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  if (!mobile) return children(value, onApply);
  return (
    <>
      <Tooltip title={title}>
        <IconButton
          aria-label={title}
          onClick={() => {
            setDraft(value);
            setOpen(true);
          }}
          sx={{ width: 44, height: 44 }}
        >
          <FilterList fontSize="small" />
        </IconButton>
      </Tooltip>
      {open && (
        <Dialog open fullScreen onClose={() => setOpen(false)}>
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
            }}
          >
            <Typography component="span" sx={{ fontSize: 24, fontWeight: 600 }}>
              {title}
            </Typography>
            <IconButton aria-label="Đóng bộ lọc" onClick={() => setOpen(false)}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ px: 2, pb: 3 }}>
            <Box
              sx={{
                pt: 1,
                "& .MuiTextField-root": { width: "100%", minWidth: 0 },
                "& .MuiInputBase-root": { minHeight: 40 },
                "& .MuiStack-root": { flexWrap: "wrap" },
              }}
            >
              {children(draft, setDraft)}
            </Box>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => {
                  onApply(draft);
                  setOpen(false);
                }}
              >
                Áp dụng bộ lọc
              </Button>
              <Button
                sx={{ alignSelf: "flex-start" }}
                onClick={() => setDraft(empty)}
              >
                Đặt lại
              </Button>
            </Stack>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
