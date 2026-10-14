"use client";
import { useState } from "react";
import Link from "next/link";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { useClassAssignmentReportQuery } from "@/api/assignment-api";
import { Feedback } from "@/shared/ui";
import { numberLabel } from "./models";
export function ClassAssignmentReport({ classId }: { classId: string }) {
  const [unit, setUnit] = useState(""),
    [cursor, setCursor] = useState<string>();
  const query = useClassAssignmentReportQuery({
    classId,
    unit: unit ? Number(unit) : undefined,
    cursor,
  });
  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Báo cáo bài tập — toàn lớp
      </Typography>
      <TextField
        size="small"
        type="number"
        label="Unit (để trống xem tất cả)"
        value={unit}
        onChange={(e) => {
          setUnit(e.target.value);
          setCursor(undefined);
        }}
        sx={{ maxWidth: 280 }}
      />
      <Feedback
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
        empty={
          query.currentData && !query.currentData.items.length
            ? "Lớp chưa có học sinh."
            : undefined
        }
      />
      {query.currentData?.items.map((student) => {
        const s = student.report.summary;
        return (
          <Paper
            key={student.studentId}
            variant="outlined"
            sx={{ p: 2, borderRadius: "16px" }}
          >
            <Stack spacing={1}>
              <Typography sx={{ fontWeight: 700 }}>
                {student.studentName}
              </Typography>
              <Typography variant="body2">
                Đã nộp {s.submitted}/{s.assigned} bài · Thiếu {s.missing} · Nộp
                muộn {s.late} · Chờ chấm/công bố {s.awaitingGrading}
              </Typography>
              <Typography variant="body2">
                Điểm đã chấm: {numberLabel(s.gradedPercentage)}% · Điểm gồm bài
                chưa nộp: {numberLabel(s.includingUnsubmittedPercentage)}%
              </Typography>
              <Button
                component={Link}
                href={`/student/?classId=${encodeURIComponent(classId)}&studentId=${encodeURIComponent(student.studentId)}&tab=assignments`}
                sx={{ alignSelf: "flex-start" }}
              >
                Xem chi tiết
              </Button>
            </Stack>
          </Paper>
        );
      })}
      {query.currentData?.nextCursor && (
        <Button onClick={() => setCursor(query.currentData!.nextCursor!)}>
          Xem tiếp
        </Button>
      )}
      {cursor && (
        <Button onClick={() => setCursor(undefined)}>Về trang đầu</Button>
      )}
    </Stack>
  );
}
