"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import { useAssignmentReportQuery } from "@/api/assignment-api";
import { Feedback } from "@/shared/ui";
import { numberLabel, statusLabels } from "./models";
import { AssignmentSurface } from "./surface";
const Chart = dynamic(
  () => import("@/components/native-chart").then((m) => m.NativeChart),
  { ssr: false, loading: () => <Feedback loading /> },
);
export function AssignmentReportView({
  classId,
  studentId,
  className,
  classes,
  onClassChange,
  enabled = true,
}: {
  classId: string;
  studentId?: string;
  className?: string;
  classes?: { id: string; name: string }[];
  onClassChange?: (id: string) => void;
  enabled?: boolean;
}) {
  const [unit, setUnit] = useState(""),
    [cursor, setCursor] = useState<string>();
  const query = useAssignmentReportQuery(
      { classId, studentId, unit: unit ? Number(unit) : undefined, cursor },
      { skip: !enabled || !classId },
    ),
    r = query.currentData;
  // Keep the current page's scope choices when filtering; no extra request to build this menu.
  const [units, setUnits] = useState<number[]>([]);
  const discovered =
    r?.items.flatMap((x) => (x.unitNumber ? [x.unitNumber] : [])) ?? [];
  const choices = [
    ...new Set([...units, ...discovered, ...(unit ? [Number(unit)] : [])]),
  ].sort((a, b) => a - b);
  return (
    <AssignmentSurface>
      <Stack spacing={1.5}>
        <Typography variant="h4" component="h2">
          {studentId ? "Báo cáo bài tập" : "Báo cáo bài tập của em"}
        </Typography>
        <TextField
          select
          size="small"
          label="Lớp / Phạm vi"
          value={`${classId}|${unit}`}
          onChange={(e) => {
            const [nextClass, nextUnit] = e.target.value.split("|");
            if (nextClass !== classId) onClassChange?.(nextClass);
            setUnits(choices);
            setUnit(nextUnit ?? "");
            setCursor(undefined);
          }}
        >
          {(classes ?? [{ id: classId, name: className ?? "Lớp học" }]).map(
            (c) => (
              <MenuItem key={c.id} value={`${c.id}|`}>
                {c.name} · Toàn bộ quá trình
              </MenuItem>
            ),
          )}
          {choices.map((n) => (
            <MenuItem key={n} value={`${classId}|${n}`}>
              {className ? `${className} · ` : ""}Unit {n}
            </MenuItem>
          ))}
        </TextField>
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
                  "Đã nộp",
                  `${r.summary.submitted}/${r.summary.assigned}`,
                  `${numberLabel(r.summary.completionPercentage)}% bài được giao`,
                ],
                [
                  "Bỏ lỡ (miss)",
                  `${r.summary.missing}/${r.summary.assigned}`,
                  `${numberLabel(r.summary.missingPercentage)}% bài được giao`,
                ],
                [
                  "TB bài đã chấm",
                  r.summary.gradedPercentage == null
                    ? "—"
                    : `${numberLabel(r.summary.gradedPercentage)}%`,
                  "Tổng điểm đạt / tổng điểm tối đa; không gồm chờ chấm / chưa nộp",
                ],
                [
                  "TB tính chưa nộp = 0",
                  r.summary.includingUnsubmittedPercentage == null
                    ? "—"
                    : `${numberLabel(r.summary.includingUnsubmittedPercentage)}%`,
                  "Chỉ báo hoàn thành bài tập; chờ chấm chưa tính",
                ],
              ].map(([label, value, note]) => (
                <Paper key={label} sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography sx={{ fontSize: 28, fontWeight: 700 }}>
                      {value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {note}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Box>
            {r.items.length > 0 ? (
              <Paper sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Typography variant="h6">
                    Kết quả bài tập · Tỷ lệ %
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Đường cong mềm · Mỗi mốc là một bài được giao
                  </Typography>
                  <Chart
                    label="Kết quả bài tập (%)"
                    height={280}
                    positions={r.items.map((_, i) => i)}
                    option={{
                      tooltip: { trigger: "axis" },
                      grid: { left: 40, right: 22, top: 30, bottom: 52 },
                      xAxis: {
                        type: "category",
                        data: r.items.map((x) => x.title),
                        axisLabel: {
                          formatter: (_: string, i: number) => `BT${i + 1}`,
                        },
                        axisLine: { show: false },
                        axisTick: { show: false },
                      },
                      yAxis: {
                        type: "value",
                        min: 0,
                        max: 100,
                        interval: 25,
                        axisLabel: { formatter: "{value}%" },
                        splitLine: { lineStyle: { color: "#dce7df" } },
                      },
                      series: [
                        {
                          type: "line",
                          name: "Điểm bài tập",
                          smooth: 0.3,
                          smoothMonotone: "x",
                          connectNulls: false,
                          symbol: "circle",
                          symbolSize: 9,
                          lineStyle: { color: "#6cb48c", width: 3 },
                          label: {
                            show: true,
                            formatter: "{c}%",
                            color: "#2b7c59",
                            fontSize: 12,
                          },
                          data: r.items.map((x) => ({
                            value: x.percentage,
                            name: x.title,
                            itemStyle: {
                              color: [
                                "OVERDUE",
                                "NOT_DUE",
                                "NOT_SUBMITTED",
                              ].includes(x.status)
                                ? "#c74950"
                                : "#2b7c59",
                            },
                            label: {
                              color: [
                                "OVERDUE",
                                "NOT_DUE",
                                "NOT_SUBMITTED",
                              ].includes(x.status)
                                ? "#c74950"
                                : "#2b7c59",
                            },
                          })),
                        },
                      ],
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    0% màu đỏ = chưa nộp, không phải điểm đã được chấm. Bài chờ
                    chấm chưa có điểm cuối nên không nối mốc 0.
                  </Typography>
                </Stack>
              </Paper>
            ) : (
              <Alert severity="info">
                Chưa có bài tập đã giao trong phạm vi này.
              </Alert>
            )}
            {r.items
              .filter((x) => x.missing)
              .map((x) => (
                <Alert key={x.assignmentId} severity="error" icon={false}>
                  <Typography
                    component={Link}
                    href={`/assignment/?assignmentId=${x.assignmentId}&classId=${classId}`}
                    sx={{
                      fontWeight: 700,
                      color: "inherit",
                      textDecoration: "none",
                    }}
                  >
                    Chưa nộp · {x.title}
                    {x.unitNumber ? ` · Unit ${x.unitNumber}` : ""}
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    Đã quá hạn{" "}
                    {x.deadline
                      ? new Date(x.deadline).toLocaleString("vi-VN")
                      : ""}
                    . Bài đang hiển thị mốc 0 trên biểu đồ. Nhấn để mở bài tập.
                  </Typography>
                </Alert>
              ))}
            {r.items.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Chi tiết bài tập
                </Typography>
                {r.items.map((x) => (
                  <Box
                    key={x.assignmentId}
                    sx={{
                      py: 1.5,
                      px: 1,
                      borderBottom: "1px solid var(--a-border)",
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "minmax(160px,1fr) auto auto minmax(140px,1.5fr)",
                      },
                      gap: 1,
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      component={Link}
                      href={`/assignment/?assignmentId=${x.assignmentId}&classId=${classId}${studentId && x.submissionId ? `&submissionId=${x.submissionId}&mode=grade` : ""}`}
                      sx={{
                        fontWeight: 700,
                        color: "text.primary",
                        textDecoration: "none",
                      }}
                    >
                      {x.title}
                    </Typography>
                    <Chip
                      size="small"
                      sx={{
                        justifySelf: "start",
                        bgcolor: "var(--a-purple-bg)",
                        color: "var(--a-purple)",
                      }}
                      label={
                        x.unitNumber ? `Unit ${x.unitNumber}` : "Toàn bộ lớp"
                      }
                    />
                    <Chip
                      size="small"
                      sx={{
                        justifySelf: "start",
                        bgcolor: x.missing ? "error.main" : "var(--a-tint)",
                        color: x.missing
                          ? "error.contrastText"
                          : "var(--a-green)",
                      }}
                      label={statusLabels[x.status] ?? x.status}
                    />
                    <Typography variant="body1">
                      {x.missing
                        ? "0% mặc định"
                        : x.totalScore == null
                          ? "Chờ chấm / công bố"
                          : `${numberLabel(x.totalScore)}/${x.totalMax} · ${numberLabel(x.percentage)}%`}
                      {x.isLate ? " · Nộp muộn" : ""}
                    </Typography>
                    {(x.comment || x.advice) && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ gridColumn: "1/-1", whiteSpace: "pre-wrap" }}
                      >
                        {[x.comment, x.advice].filter(Boolean).join("\n")}
                      </Typography>
                    )}
                  </Box>
                ))}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1.5 }}
                >
                  Nhấn bài tập để xem bài nộp, điểm từng câu, nhận xét, lời
                  khuyên và link bài post.
                </Typography>
              </Paper>
            )}
            <Alert severity="info" icon={false}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                Theo dõi thêm
              </Typography>
              Nộp trễ: {r.summary.late} · Chờ chấm / công bố:{" "}
              {r.summary.awaitingGrading}. Miễn bài, bản nháp và bài thu hồi
              được loại khỏi tổng bài được giao. Báo cáo này độc lập với báo cáo
              7 kỹ năng.
            </Alert>
            {(cursor || r.nextCursor) && (
              <Stack direction="row" spacing={1}>
                {cursor && (
                  <Button onClick={() => setCursor(undefined)}>Về đầu</Button>
                )}
                {r.nextCursor && (
                  <Button onClick={() => setCursor(r.nextCursor!)}>
                    Xem tiếp
                  </Button>
                )}
              </Stack>
            )}
          </>
        )}
      </Stack>
    </AssignmentSurface>
  );
}
