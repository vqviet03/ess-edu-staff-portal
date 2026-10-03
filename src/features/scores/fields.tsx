"use client";
import { useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
import { percent } from "@/utils/scores";
export function ScoreInput({
  value,
  max,
  decimal,
  label,
  onChange,
  error,
  disabled,
}: {
  value: number | null;
  max: number;
  decimal: boolean;
  label: string;
  onChange: (v: number | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  const [raw, setRaw] = useState(value == null ? "" : String(value));
  useEffect(() => {
    if (value === null) setRaw("");
    else if (Number.isFinite(value)) setRaw(String(value));
  }, [value]);
  return (
    <TextField
      label={label}
      value={raw}
      disabled={disabled}
      error={!!error}
      helperText={
        error ??
        `/ ${max} (${Number.isFinite(value) && value !== null ? percent((value / max) * 100) : "—"})`
      }
      onChange={(e) => {
        const text = e.target.value;
        setRaw(text);
        const normalized = text.replace(",", ".");
        onChange(
          text.trim() === ""
            ? null
            : /^\d+(\.\d*)?$/.test(normalized)
              ? Number(normalized)
              : NaN,
        );
      }}
      slotProps={{
        htmlInput: {
          inputMode: decimal ? "decimal" : "numeric",
          autoComplete: "off",
        },
      }}
    />
  );
}
