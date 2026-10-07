"use client";
import { publicId } from "@/shared/public-id";
import { ReadOnlyNotice } from "@/features/access/hooks";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useSaveResultMutation } from "@/api/api";
import { errorMessage } from "@/api/base-query";
import {
  skillNames,
  type Assessment,
  type Student,
  type StudentResult,
  type Context,
} from "@/types";
import { calculate, emptyResult, percent, resultInput } from "@/utils/scores";
import { route } from "@/utils/context";
import { useUnsaved } from "@/shared/unsaved";
import { Card, Feedback, NavButton, Title } from "@/shared/ui";
import { useScoreContext } from "./context";
import { ScoreInput } from "./fields";
function StudentForm({
  editable,
  student,
  students,
  result,
  assessment,
  context,
}: {
  editable:boolean;
  student: Student;
  students: Student[];
  result: StudentResult;
  assessment: Assessment;
  context: Context;
}) {
  const router = useRouter(),
    [save, state] = useSaveResultMutation(),
    [message, setMessage] = useState("");
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<StudentResult>({
    resolver: zodResolver(resultInput(assessment)),
    defaultValues: result,
  });
  const values = useWatch({ control }) as StudentResult,
    total = calculate(values, assessment.skills),
    locked = !editable || state.isLoading || assessment.status === "COMPLETED";
  useUnsaved(isDirty);
  const next = students[students.findIndex((s) => s.id === student.id) + 1];
  const submit = (advance: boolean) =>
    handleSubmit(async (r) => {
      try {
        const saved = await save({
          assessmentId: assessment.id,
          result: r,
        }).unwrap();
        reset(saved);
        setMessage("Đã lưu điểm thành công.");
        if (advance && next)
          router.push(
            route("/student-score/", { ...context, studentId: next.id }),
          );
      } catch {}
    });
  return (
    <Stack
      component="form"
      onSubmit={submit(false)}
      sx={{
        gap: 2.5,
      }}
    >
      <TextField
        select
        label="Học sinh"
        value={student.id}
        disabled={state.isLoading}
        onChange={(e) => {
          if (
            !isDirty ||
            window.confirm("Bỏ thay đổi chưa lưu để chọn học sinh khác?")
          )
            router.push(
              route("/student-score/", {
                ...context,
                studentId: e.target.value,
              }),
            );
        }}
      >
        {students.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.name} {s.nickname ? `(${s.nickname})` : ""} · {publicId(s.publicId, s.studentCode, s.id)}
          </MenuItem>
        ))}
      </TextField>
      {message && <Alert severity="success">{message}</Alert>}
      {state.error && (
        <Alert severity="error">
          {errorMessage(state.error)}
          {
            <Button
              onClick={() => {
                if (window.confirm("Bỏ thay đổi và tải lại điểm mới nhất?"))
                  location.reload();
              }}
            >
              Tải lại
            </Button>
          }
        </Alert>
      )}
      {assessment.status === "COMPLETED" && (
        <Alert severity="info">Bài đã hoàn thành, điểm được khóa.</Alert>
      )}
      <Controller
        control={control}
        name="attendance"
        render={({ field }) => (
          <TextField
            select
            label="Tham gia"
            value={field.value}
            disabled={locked}
            error={!!errors.attendance}
            helperText={errors.attendance?.message}
            onChange={(e) => {
              const attendance = e.target.value as StudentResult["attendance"];
              if (
                attendance !== "PRESENT" &&
                getValues("skillResults").some((s) => s.score !== null)
              ) {
                if (
                  !window.confirm(
                    "Chuyển sang vắng/chưa xác định sẽ xóa điểm. Tiếp tục?",
                  )
                )
                  return;
                getValues("skillResults").forEach((_, i) =>
                  setValue(`skillResults.${i}.score`, null, {
                    shouldDirty: true,
                    shouldValidate: true,
                  }),
                );
              }
              field.onChange(attendance);
            }}
          >
            <MenuItem value="PRESENT">Có mặt</MenuItem>
            <MenuItem value="ABSENT">Vắng</MenuItem>
            <MenuItem value="UNSET">Chưa xác định</MenuItem>
          </TextField>
        )}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))" },
          gap: 2,
        }}
      >
        {assessment.skills.map((s) => {
          const i = values.skillResults.findIndex(
            (r) => r.skillCode === s.skillCode,
          );
          return (
            <Card key={s.skillCode}>
              <Stack
                sx={{
                  gap: 2,
                }}
              >
                <Typography variant="h6">{skillNames[s.skillCode]}</Typography>
                <Controller
                  name={`skillResults.${i}.score`}
                  control={control}
                  render={({ field }) => (
                    <ScoreInput
                      label="Số câu / điểm đạt"
                      value={field.value}
                      onChange={field.onChange}
                      max={s.maxQuestions}
                      decimal={s.allowDecimal}
                      error={errors.skillResults?.[i]?.score?.message}
                      disabled={locked || values.attendance !== "PRESENT"}
                    />
                  )}
                />
                <TextField
                  label="Nhận xét"
                  multiline
                  minRows={2}
                  disabled={locked}
                  {...register(`skillResults.${i}.comment`)}
                  slotProps={{ htmlInput: { maxLength: 4000 } }}
                />
                <TextField
                  label="Lời khuyên cải thiện"
                  multiline
                  minRows={2}
                  disabled={locked}
                  {...register(`skillResults.${i}.advice`)}
                  slotProps={{ htmlInput: { maxLength: 4000 } }}
                />
              </Stack>
            </Card>
          );
        })}
      </Box>
      <Card>
        <Stack
          sx={{
            gap: 2,
          }}
        >
          <Typography variant="h5">
            {Number.isFinite(total.score) ? total.score : "—"} / {total.max} ·{" "}
            {Number.isFinite(total.percentage)
              ? percent(total.percentage)
              : "—"}
          </Typography>
          <Typography variant="body2">
            {total.complete ? "Đầy đủ" : "Tổng tạm tính"} · Đã nhập{" "}
            {total.entered}/{total.count} phần
          </Typography>
          <TextField
            label="Nhận xét tổng"
            multiline
            minRows={3}
            {...register("overallComment")}
            disabled={locked}
            error={!!errors.overallComment}
            helperText={errors.overallComment?.message}
            slotProps={{ htmlInput: { maxLength: 4000 } }}
          />
          <TextField
            label="Lời khuyên tổng"
            multiline
            minRows={3}
            {...register("overallAdvice")}
            disabled={locked}
            slotProps={{ htmlInput: { maxLength: 4000 } }}
          />
        </Stack>
      </Card>
      <Stack
        direction="row"
        useFlexGap
        sx={{
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Button
          type="submit"
          variant="contained"
          loading={state.isLoading}
          disabled={locked}
        >
          Lưu
        </Button>
        <Button
          variant="outlined"
          disabled={locked || !next}
          onClick={submit(true)}
        >
          Lưu & học sinh tiếp theo
        </Button>
      </Stack>
    </Stack>
  );
}
export function StudentScore() {
  const q = useScoreContext();
  if (q.loading || q.error || q.empty)
    return (
      <Feedback
        loading={q.loading}
        error={q.error}
        empty={q.empty}
        retry={q.retry}
      />
    );
  const a = q.assessment,
    s = q.studentId
      ? q.students.find((s) => s.id === q.studentId)
      : q.students[0];
  if (!a || !s)
    return <Feedback empty="Không có học sinh / bài đánh giá phù hợp." />;
  const r =
    q.results.find((r) => r.studentId === s.id) ?? emptyResult(s.id, a.skills);
  return (
    <>
      <Title
        title={q.canEdit?"Nhập điểm học sinh":"Báo cáo học sinh · Chỉ xem"}
        subtitle={a.name}
        actions={
          <NavButton href={route("/scores/", q.context)}>← Bảng điểm</NavButton>
        }
      />
      <ReadOnlyNotice editable={q.canEdit && s.status==="ACTIVE"}/>
      <StudentForm
        key={a.id + ":" + a.schemaVersion + ":" + s.id}
        editable={q.canEdit && s.status==="ACTIVE"}
        student={s}
        students={q.students}
        assessment={a}
        context={q.context}
        result={r}
      />
    </>
  );
}
