"use client";
import { SvgLogo } from "./svg-logo";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Alert from "@mui/material/Alert";
import MenuBook from "@mui/icons-material/MenuBook";
import { useState } from "react";
import type { PortalBranding } from "@/features/pwa/models";
export function PortalBrandingEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PortalBranding;
  onChange: (value: PortalBranding) => void;
}) {
  const [error, setError] = useState("");
  const [opaqueBackground, setOpaqueBackground] = useState(
    value.background === "transparent" ? "#e6f2e9" : value.background,
  );
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1">{label}</Typography>
      <TextField
        label={`Tên hiển thị · ${label}`}
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        slotProps={{ htmlInput: { maxLength: 80 } }}
        helperText="Để trống để dùng tên trung tâm"
      />
      <Stack direction="row" spacing={1}>
        <TextField
          label={`Màu icon · ${label}`}
          type="color"
          value={value.foreground}
          onChange={(e) => onChange({ ...value, foreground: e.target.value })}
        />
        <TextField
          label={`Màu nền · ${label}`}
          type="color"
          value={
            value.background === "transparent" ? "#e6f2e9" : value.background
          }
          disabled={value.background === "transparent"}
          onChange={(e) => {
            setOpaqueBackground(e.target.value);
            onChange({ ...value, background: e.target.value });
          }}
        />
      </Stack>
      <FormControlLabel
        label={`Nền trong suốt · ${label}`}
        control={
          <Checkbox
            checked={value.background === "transparent"}
            onChange={(_, checked) =>
              onChange({
                ...value,
                background: checked ? "transparent" : opaqueBackground,
              })
            }
          />
        }
      />
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        {value.iconSvg ? (
          <SvgLogo
            svg={value.iconSvg}
            label={label}
            size={48}
            background={value.background}
          />
        ) : (
          <MenuBook
            sx={{
              fontSize: 48,
              color: value.foreground,
              bgcolor: value.background,
              borderRadius: 1,
            }}
          />
        )}
        <Button component="label">
          Chọn SVG
          <input
            hidden
            type="file"
            accept="image/svg+xml,.svg"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > 10 * 1024 * 1024) {
                setError("SVG tối đa 10 MB.");
                return;
              }
              setError("");
              onChange({ ...value, iconSvg: await f.text() });
            }}
          />
        </Button>
        <Button onClick={() => onChange({ ...value, iconSvg: null })}>
          Icon mặc định
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
