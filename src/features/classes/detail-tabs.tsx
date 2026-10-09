"use client";
import { useId, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

export type ClassTab = "thread" | "progress" | "profile" | "attendance";
export function initialClassTab(value: string | null): ClassTab {
  return value === "progress" || value === "profile" || value === "attendance"
    ? value
    : "thread";
}
export function ClassDetailTabs({
  value,
  onChange,
  thread,
  progress,
  profile,
  attendance,
}: {
  value: ClassTab;
  onChange: (value: ClassTab) => void;
  thread: ReactNode;
  progress: ReactNode;
  profile: ReactNode;
  attendance?: ReactNode;
}) {
  const prefix = useId(),
    [visited, setVisited] = useState<ClassTab[]>([value]);
  const panels = [
    { key: "thread", label: "Thread", content: thread },
    { key: "progress", label: "Tiến độ lớp", content: progress },
    { key: "profile", label: "Hồ sơ & quan hệ", content: profile },
    { key: "attendance", label: "Điểm danh", content: attendance },
  ] as const;
  return (
    <>
      <Tabs
        value={value}
        aria-label="Nội dung lớp"
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
        onChange={(_, next: ClassTab) => {
          setVisited((old) => (old.includes(next) ? old : [...old, next]));
          onChange(next);
        }}
      >
        {panels.map((p) => (
          <Tab
            key={p.key}
            value={p.key}
            label={p.label}
            id={`${prefix}-${p.key}-tab`}
            aria-controls={`${prefix}-${p.key}-panel`}
          />
        ))}
      </Tabs>
      {panels.map((p) => (
        <Box
          key={p.key}
          role="tabpanel"
          id={`${prefix}-${p.key}-panel`}
          aria-labelledby={`${prefix}-${p.key}-tab`}
          hidden={value !== p.key}
        >
          {visited.includes(p.key) && p.content}
        </Box>
      ))}
    </>
  );
}
