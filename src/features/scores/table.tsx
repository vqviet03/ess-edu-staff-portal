"use client";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useSaveBatchMutation } from "@/api/api";
import { errorMessage } from "@/api/base-query";
import {
  calculate,
  emptyResult,
  percent,
  validateResult,
} from "@/utils/scores";
import {
  skillNames,
  type Assessment,
  type Student,
  type StudentResult,
} from "@/types";
import { useUnsaved } from "@/shared/unsaved";
import { ScoreInput } from "./fields";
const sticky = (left: number) => ({
  position: "sticky" as const,
  left,
  zIndex: 2,
  bgcolor: "background.paper",
});
export default function ScoreTable({
  assessment,
  editable = false,
  students,
  results,
}: {
  assessment: Assessment;
  editable?:boolean;
  students: Student[];
  results: StudentResult[];
}) {
  const [drafts, setDrafts] = useState<Record<string, StudentResult>>({}),
    [rowErrors, setRowErrors] = useState<Record<string, string>>({}),
    [message, setMessage] = useState(""),
    [save, state] = useSaveBatchMutation();
  useUnsaved(Object.keys(drafts).length > 0);
  const locked = !editable || assessment.status === "COMPLETED" || state.isLoading;
  const read = (id: string) =>
    drafts[id] ??
    results.find((r) => r.studentId === id) ??
    emptyResult(id, assessment.skills);
  const change = (id: string, apply: (r: StudentResult) => void) => {
    if(locked || students.find(s=>s.id===id)?.status!=="ACTIVE")return;
    setDrafts((old) => {
      const r = structuredClone(
        old[id] ??
          results.find((r) => r.studentId === id) ??
          emptyResult(id, assessment.skills),
      );
      apply(r);
      return { ...old, [id]: r };
    });
    setMessage("");
    setRowErrors((old) => ({ ...old, [id]: "" }));
  };
  const invalid = Object.values(drafts).some(
    (r) => Object.keys(validateResult(r, assessment.skills)).length,
  );
  const setAttendance = (id: string, value: StudentResult["attendance"]) => {
    if (
      value !== "PRESENT" &&
      read(id).skillResults.some((s) => s.score !== null) &&
      !window.confirm(
        "Chuyển sang vắng/chưa xác định sẽ xóa điểm đã nhập. Tiếp tục?",
      )
    )
      return;
    change(id, (r) => {
      r.attendance = value;
      if (value !== "PRESENT") r.skillResults.forEach((s) => (s.score = null));
    });
  };
  return (
    <Stack
      sx={{
        gap: 2,
      }}
    >
      <Stack
        direction="row"
        useFlexGap
        sx={{
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
        }}
      >
        <Button
          variant="contained"
          loading={state.isLoading}
          disabled={locked || invalid || !Object.keys(drafts).length}
          onClick={async () => {
            setMessage("");
            try {
              const response = await save({
                assessmentId: assessment.id,
                rows: Object.values(drafts),
              }).unwrap();
              setDrafts((old) => {
                const next = { ...old };
                response.saved.forEach((r) => delete next[r.studentId]);
                return next;
              });
              setRowErrors(response.rowErrors);
              setMessage(
                `Đã lưu ${response.saved.length} học sinh${Object.keys(response.rowErrors).length ? " · Có dòng chưa lưu, xem lỗi bên dưới." : "."}`,
              );
            } catch (e) {
              const failure = e as {
                data?: { error?: { rowErrors?: Record<string, string> } };
              };
              if (failure.data?.error?.rowErrors)
                setRowErrors(failure.data.error.rowErrors);
              setMessage(errorMessage(e));
            }
          }}
        >
          Lưu {Object.keys(drafts).length} dòng đã sửa
        </Button>
        <Typography variant="body2" color="text.secondary">
          Tab / Shift+Tab để di chuyển · Cuộn ngang để xem mọi kỹ năng.
        </Typography>
      </Stack>
      {message && (
        <Alert
          severity={
            Object.keys(rowErrors).some((k) => rowErrors[k]) || state.error
              ? "warning"
              : "success"
          }
        >
          {message}
        </Alert>
      )}
      {invalid && (
        <Alert severity="error">Sửa các ô có lỗi trước khi lưu.</Alert>
      )}
      {assessment.status === "COMPLETED" && (
        <Alert severity="info">Bài đã hoàn thành, điểm được khóa.</Alert>
      )}
      <TableContainer
        sx={{
          maxHeight: "70vh",
          border: 1,
          borderColor: "divider",
          borderRadius: 3,
        }}
      >
        <Table
          stickyHeader
          aria-label="Bảng nhập điểm"
          sx={{
            minWidth: 570 + assessment.skills.length * 600,
            tableLayout: "fixed",
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                rowSpan={2}
                sx={{ ...sticky(0), zIndex: 5, width: 230 }}
              >
                Học sinh / ID
              </TableCell>
              <TableCell
                rowSpan={2}
                sx={{ ...sticky(230), zIndex: 5, width: 110 }}
              >
                Tham gia
              </TableCell>
              {assessment.skills.map((s) => (
                <TableCell
                  key={s.skillCode}
                  colSpan={3}
                  sx={{ width: 600, height: 44 }}
                >
                  {skillNames[s.skillCode]}
                </TableCell>
              ))}
              <TableCell colSpan={3} sx={{ width: 600 }}>
                Tổng
              </TableCell>
            </TableRow>
            <TableRow>
              {assessment.skills.flatMap((s) =>
                ["Điểm", "Nhận xét", "Lời khuyên"].map((h, i) => (
                  <TableCell
                    key={s.skillCode + h}
                    sx={{ top: 44, width: i ? 220 : 160 }}
                  >
                    {h}
                  </TableCell>
                )),
              )}
              {["Tổng điểm", "Nhận xét tổng", "Lời khuyên tổng"].map((h) => (
                <TableCell key={h} sx={{ top: 44 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student) => {
              const r = read(student.id),
                errors = validateResult(r, assessment.skills),
                total = calculate(r, assessment.skills),
                rowLocked = locked || student.status!=="ACTIVE";
              return (
                <TableRow
                  key={student.id}
                  sx={{
                    bgcolor: drafts[student.id] ? "action.hover" : "inherit",
                  }}
                >
                  <TableCell sx={sticky(0)}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                      }}
                    >
                      {student.name}
                      {student.nickname ? ` (${student.nickname})` : ""}
                    </Typography>
                    <Typography variant="caption">{student.id}</Typography>
                    {rowErrors[student.id] && (
                      <>
                        <Alert severity="error">{rowErrors[student.id]}</Alert>
                        <Button
                          disabled={rowLocked}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Bỏ thay đổi dòng này và dùng dữ liệu mới nhất?",
                              )
                            ) {
                              setDrafts((old) => {
                                const next = { ...old };
                                delete next[student.id];
                                return next;
                              });
                              setRowErrors((old) => ({
                                ...old,
                                [student.id]: "",
                              }));
                            }
                          }}
                        >
                          Tải lại dòng
                        </Button>
                      </>
                    )}
                  </TableCell>
                  <TableCell sx={sticky(230)}>
                    <Checkbox
                      checked={r.attendance === "PRESENT"}
                      indeterminate={r.attendance === "UNSET"}
                      disabled={rowLocked}
                      slotProps={{
                        input: { "aria-label": "Có mặt " + student.id },
                      }}
                      onChange={(_, value) =>
                        setAttendance(student.id, value ? "PRESENT" : "ABSENT")
                      }
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                      }}
                    >
                      {r.attendance === "PRESENT"
                        ? "Có mặt"
                        : r.attendance === "ABSENT"
                          ? "Vắng"
                          : "Chưa xác định"}
                    </Typography>
                    <Button
                      disabled={rowLocked}
                      onClick={() => setAttendance(student.id, "UNSET")}
                      aria-label={"Bỏ xác định " + student.id}
                    >
                      Đặt lại
                    </Button>
                    {errors.attendance && (
                      <Typography color="error" variant="caption">
                        {errors.attendance}
                      </Typography>
                    )}
                  </TableCell>
                  {assessment.skills.flatMap((s) => {
                    const result = r.skillResults.find(
                      (k) => k.skillCode === s.skillCode,
                    )!;
                    return [
                      <TableCell key={s.skillCode + "score"}>
                        <ScoreInput
                          label={`Điểm ${skillNames[s.skillCode]} ${student.id}`}
                          value={result?.score ?? null}
                          max={s.maxQuestions}
                          decimal={s.allowDecimal}
                          error={errors[s.skillCode]}
                          disabled={rowLocked || r.attendance !== "PRESENT"}
                          onChange={(v) =>
                            change(student.id, (d) => {
                              d.skillResults.find(
                                (k) => k.skillCode === s.skillCode,
                              )!.score = v;
                            })
                          }
                        />
                      </TableCell>,
                      ...(["comment", "advice"] as const).map((key) => (
                        <TableCell key={s.skillCode + key}>
                          <TextField
                            multiline
                            minRows={2}
                            label={`${key === "comment" ? "Nhận xét" : "Lời khuyên"} ${skillNames[s.skillCode]} ${student.id}`}
                            value={result?.[key] ?? ""}
                            disabled={rowLocked}
                            onChange={(e) =>
                              change(student.id, (d) => {
                                d.skillResults.find(
                                  (k) => k.skillCode === s.skillCode,
                                )![key] = e.target.value;
                              })
                            }
                            slotProps={{ htmlInput: { maxLength: 4000 } }}
                          />
                        </TableCell>
                      )),
                    ];
                  })}
                  <TableCell>
                    <Typography
                      sx={{
                        fontWeight: 600,
                      }}
                    >
                      {total.score === null
                        ? "—"
                        : Number.isFinite(total.score)
                          ? total.score
                          : "—"}{" "}
                      / {total.max}
                    </Typography>
                    <Typography color="primary">
                      {Number.isFinite(total.percentage)
                        ? percent(total.percentage)
                        : "—"}
                    </Typography>
                    <Typography variant="caption">
                      {total.complete ? "Đầy đủ" : "Tạm tính"} · {total.entered}
                      /{total.count} phần
                    </Typography>
                  </TableCell>
                  {(["overallComment", "overallAdvice"] as const).map(
                    (key, i) => (
                      <TableCell key={key}>
                        <TextField
                          label={`${i ? "Lời khuyên tổng" : "Nhận xét tổng"} ${student.id}`}
                          multiline
                          minRows={2}
                          disabled={rowLocked}
                          value={r[key]}
                          onChange={(e) =>
                            change(student.id, (d) => {
                              d[key] = e.target.value;
                            })
                          }
                          slotProps={{ htmlInput: { maxLength: 4000 } }}
                        />
                      </TableCell>
                    ),
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box>
        <Typography variant="body2" color="text.secondary">
          Ô trống là chưa có điểm; 0 là điểm hợp lệ. Tổng tạm tính dùng toàn bộ
          điểm tối đa của schema.
        </Typography>
      </Box>
    </Stack>
  );
}
