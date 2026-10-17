"use client";
import { useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { type StudySchedule, displayDate, vietnamToday } from "./models";

export function MobileSchedule({ data }: { data: StudySchedule }) {
  const months = [
    ...new Set(data.occurrences.map((day) => day.date.slice(0, 7))),
  ];
  const [month, setMonth] = useState(() =>
    months.includes(vietnamToday().slice(0, 7))
      ? vietnamToday().slice(0, 7)
      : (months[0] ?? vietnamToday().slice(0, 7)),
  );
  const [all, setAll] = useState(false);
  const dates = data.occurrences.filter((day) => day.date.startsWith(month));
  const [year, number] = month.split("-").map(Number);
  const firstDay =
    (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const time = (day: StudySchedule["occurrences"][number]) =>
    day.startTime && day.endTime
      ? `${day.startTime}–${day.endTime}`
      : "Giờ thông báo sau";
  if (!data.occurrences.length)
    return <Typography>Chưa có ngày học cụ thể.</Typography>;
  return (
    <Stack spacing={1.5}>
      <Button
        onClick={() => setAll((v) => !v)}
        sx={{ alignSelf: "flex-start" }}
      >
        {all ? "Xem lịch tháng" : "Toàn bộ lịch học"}
      </Button>
      {all ? (
        months.map((key) => {
          const days = data.occurrences.filter((day) =>
            day.date.startsWith(key),
          );
          const sameTime = new Set(days.map(time)).size === 1;
          return (
            <Paper
              key={key}
              sx={{ p: 2, borderRadius: "14px", bgcolor: "action.hover" }}
            >
              <Typography sx={{ fontSize: 15, fontWeight: 500, mb: 1 }}>
                Tháng {Number(key.slice(5))} / {key.slice(0, 4)}
              </Typography>
              {sameTime ? (
                <>
                  <Typography
                    sx={{
                      fontSize: 14,
                      lineHeight: 1.8,
                      color: "primary.main",
                    }}
                  >
                    {days.map((day) => day.date.slice(8)).join(" · ")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {time(days[0])}
                  </Typography>
                </>
              ) : (
                <Stack spacing={0.75}>
                  {days.map((day) => (
                    <Stack
                      key={day.date}
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: "baseline" }}
                    >
                      <Typography
                        sx={{
                          color: "primary.main",
                          fontSize: 13,
                          minWidth: 40,
                        }}
                      >
                        {day.date.slice(8)} / {Number(key.slice(5))}
                      </Typography>
                      <Typography sx={{ fontSize: 13 }}>{time(day)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>
          );
        })
      ) : (
        <>
          <TextField
            select
            label="Tháng học"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            sx={{ alignSelf: "flex-start", minWidth: 160 }}
          >
            {months.map((key) => (
              <MenuItem key={key} value={key}>
                Tháng {Number(key.slice(5))} / {key.slice(0, 4)}
              </MenuItem>
            ))}
          </TextField>
          <Paper sx={{ p: 1.5, borderRadius: "16px", bgcolor: "action.hover" }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7,minmax(0,1fr))",
                gap: 0.5,
              }}
            >
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
                <Typography
                  key={day}
                  sx={{
                    textAlign: "center",
                    fontSize: 11,
                    color: "text.secondary",
                    lineHeight: "28px",
                  }}
                >
                  {day}
                </Typography>
              ))}
              {Array.from({ length: firstDay }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {Array.from({ length: count }, (_, i) => {
                const date = `${month}-${String(i + 1).padStart(2, "0")}`,
                  scheduled = dates.some((day) => day.date === date);
                return (
                  <ButtonBase
                    key={date}
                    disabled={!scheduled}
                    aria-label={`Buổi học ${displayDate(date)}`}
                    onClick={() =>
                      document
                        .getElementById(`schedule-${date}`)
                        ?.scrollIntoView({ block: "nearest" })
                    }
                    sx={{
                      minWidth: 0,
                      minHeight: 44,
                      borderRadius: "8px",
                      bgcolor: scheduled ? "action.selected" : "transparent",
                      color: scheduled ? "primary.main" : "text.secondary",
                      fontSize: 13,
                      fontWeight: scheduled ? 600 : 400,
                    }}
                  >
                    {i + 1}
                  </ButtonBase>
                );
              })}
            </Box>
          </Paper>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
            {dates.length} buổi trong tháng
          </Typography>
          {dates.map((day) => (
            <Paper
              id={`schedule-${day.date}`}
              key={day.date}
              sx={{ p: 1.5, borderRadius: "12px", bgcolor: "action.hover" }}
            >
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "baseline", flexWrap: "wrap", rowGap: 0.5 }}
              >
                <Typography
                  sx={{ color: "primary.main", fontSize: 13, fontWeight: 600 }}
                >
                  {day.date.slice(8)} / {Number(day.date.slice(5, 7))}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {new Intl.DateTimeFormat("vi-VN", {
                    weekday: "long",
                    timeZone: "UTC",
                  }).format(new Date(day.date + "T00:00:00Z"))}
                </Typography>
                <Typography sx={{ fontSize: 13 }}>{time(day)}</Typography>
              </Stack>
            </Paper>
          ))}
        </>
      )}
    </Stack>
  );
}
