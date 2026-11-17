"use client";
import { compactRadii } from "@/theme/compact";
import { useState } from "react";
import Link from "next/link";
import Stack from "@mui/material/Stack";
import ButtonBase from "@mui/material/ButtonBase";
import Box from "@mui/material/Box";
import { ProfileAvatar } from "@/features/profile/avatar";
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
          <ButtonBase
            component={Link}
            href={`/student/?classId=${encodeURIComponent(classId)}&studentId=${encodeURIComponent(student.studentId)}&tab=assignments`}
            key={student.studentId}
            sx={{
              display: "flex",
              gap: 1.25,
              justifyContent: "flex-start",
              textAlign: "left",
              p: { xs: 1.25, md: 2 },
              minHeight: 44,
              borderRadius: compactRadii.item,
              border: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <ProfileAvatar
              fallbackInitials
              name={student.studentName}
              size={36}
            />
            <Box sx={{ minWidth: 0 }}>
              <Stack spacing={0.5}>
                <Typography sx={{ fontWeight: 700 }}>
                  {student.studentName}
                </Typography>
                <Typography variant="body2">
                  Đã nộp {s.submitted}/{s.assigned} bài · Thiếu {s.missing} ·
                  Nộp muộn {s.late} · Chờ chấm/công bố {s.awaitingGrading}
                </Typography>
                <Typography variant="body2">
                  Điểm đã chấm: {numberLabel(s.gradedPercentage)}% · Điểm gồm
                  bài chưa nộp: {numberLabel(s.includingUnsubmittedPercentage)}%
                </Typography>
              </Stack>
            </Box>
          </ButtonBase>
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
