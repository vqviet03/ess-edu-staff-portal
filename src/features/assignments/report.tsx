"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import { useAssignmentReportQuery } from "@/api/assignment-api";
import { Feedback } from "@/shared/ui";
import { numberLabel, statusLabels } from "./models";
const Chart = dynamic(
  () => import("@/components/native-chart").then((m) => m.NativeChart),
  { ssr: false, loading: () => <Feedback loading /> },
);
export function AssignmentReportView({
  classId,
  studentId,
  enabled = true,
}: {
  classId: string;
  studentId?: string;
  enabled?: boolean;
}) {
  const [unit, setUnit] = useState(""),
    [cursor, setCursor] = useState<string>(),
    query = useAssignmentReportQuery(
      { classId, studentId, unit: unit ? Number(unit) : undefined, cursor },
      { skip: !enabled || !classId },
    ),
    r = query.data;
  return (
    <Stack spacing={2.5}>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", gap: 2 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Báo cáo bài tập
        </Typography>
        <TextField
          size="small"
          type="number"
          label="Lọc Unit"
          placeholder="Toàn bộ"
          value={unit}
          onChange={(e) => {
            setUnit(e.target.value);
            setCursor(undefined);
          }}
          sx={{ width: 150 }}
        />
      </Stack>
      <Feedback
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {r && (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" },
              gap: 1.5,
            }}
          >
            {[
              [
                "Hoàn thành",
                r.summary.completionPercentage,
                `${r.summary.submitted}/${r.summary.assigned} bài đã nộp`,
              ],
              [
                "Thiếu bài",
                r.summary.missingPercentage,
                `${r.summary.missing}/${r.summary.assigned} bài quá hạn chưa nộp`,
              ],
              [
                "Điểm bài đã chấm",
                r.summary.gradedPercentage,
                "Tổng điểm đạt / tổng điểm tối đa",
              ],
              [
                "Điểm gồm bài chưa nộp",
                r.summary.includingUnsubmittedPercentage,
                "Bài chưa nộp = 0; chờ chấm chưa tính",
              ],
            ].map(([label, value, note]) => (
              <Paper
                variant="outlined"
                key={String(label)}
                sx={{ p: 2, borderRadius: "16px" }}
              >
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {typeof value === "number" ? `${numberLabel(value)}%` : "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {note}
                </Typography>
              </Paper>
            ))}
          </Box>
          <Alert severity="info">
            {r.summary.late} bài nộp muộn · {r.summary.awaitingGrading} bài chờ
            chấm / công bố. Miễn bài, bản nháp và bài thu hồi được loại khỏi
            tổng bài được giao. Báo cáo này độc lập với báo cáo 7 kỹ năng.
          </Alert>
          {r.items.length > 0 ? (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px" }}>
              <Typography sx={{ fontWeight: 700 }}>
                Điểm bài tập theo tiến trình
              </Typography>
              <Chart
                label="Điểm bài tập (%)"
                positions={r.items.map((_, i) => i)}
                option={{
                  tooltip: { trigger: "axis" },
                  grid: { left: 44, right: 20, top: 24, bottom: 48 },
                  xAxis: {
                    type: "category",
                    data: r.items.map((x) => x.title),
                  },
                  yAxis: {
                    type: "value",
                    min: 0,
                    max: 100,
                    axisLabel: { formatter: "{value}%" },
                  },
                  series: [
                    {
                      type: "line",
                      name: "Điểm bài tập",
                      smooth: 0.3,
                      smoothMonotone: "x",
                      connectNulls: false,
                      symbol: "circle",
                      symbolSize: 8,
                      itemStyle: { color: "#7ab99b" },
                      lineStyle: { color: "#7ab99b", width: 3 },
                      data: r.items.map((x) => ({
                        value: x.percentage,
                        itemStyle: { color: x.missing ? "#dc929a" : "#7ab99b" },
                      })),
                    },
                  ],
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Điểm 0 của bài chưa nộp khác với bài đang chờ chấm; bài chờ chấm
                để trống trên biểu đồ. Kéo hoặc zoom theo chiều ngang để xem
                tiến trình.
              </Typography>
            </Paper>
          ) : (
            <Alert severity="info">
              Chưa có bài tập đã giao trong phạm vi này.
            </Alert>
          )}
          {r.items.map((x) => (
            <Paper
              key={x.assignmentId}
              variant="outlined"
              sx={{ p: 2, borderRadius: "16px" }}
            >
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: "space-between",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    component={Link}
                    href={`/assignment/?assignmentId=${x.assignmentId}&classId=${classId}${studentId && x.submissionId ? `&submissionId=${x.submissionId}&mode=grade` : ""}`}
                    sx={{
                      fontWeight: 700,
                      color: "primary.main",
                      textDecoration: "none",
                    }}
                  >
                    {x.title} ·{" "}
                    {x.unitNumber ? `Unit ${x.unitNumber}` : "Toàn bộ lớp"}
                  </Typography>
                  <Chip
                    size="small"
                    label={statusLabels[x.status] ?? x.status}
                    color={
                      x.missing
                        ? "error"
                        : x.status === "PUBLISHED"
                          ? "success"
                          : "default"
                    }
                  />
                </Stack>
                <Typography variant="body2">
                  {x.totalScore == null
                    ? "Chờ chấm / công bố"
                    : `${numberLabel(x.totalScore)}/${x.totalMax} (${numberLabel(x.percentage)}%)`}
                  {x.isLate ? " · Nộp muộn" : ""}
                </Typography>
                {x.deadline && (
                  <Typography variant="caption" color="text.secondary">
                    Hạn nộp: {new Date(x.deadline).toLocaleString("vi-VN")}
                  </Typography>
                )}
                {x.comment && (
                  <Typography sx={{ whiteSpace: "pre-wrap" }}>
                    {x.comment}
                  </Typography>
                )}
                {x.advice && (
                  <Typography
                    color="text.secondary"
                    sx={{ whiteSpace: "pre-wrap" }}
                  >
                    {x.advice}
                  </Typography>
                )}
              </Stack>
            </Paper>
          ))}
          <Stack direction="row">
            {cursor && (
              <Button onClick={() => setCursor(undefined)}>Về đầu</Button>
            )}
            {r.nextCursor && (
              <Button onClick={() => setCursor(r.nextCursor!)}>Xem tiếp</Button>
            )}
          </Stack>
        </>
      )}
    </Stack>
  );
}
