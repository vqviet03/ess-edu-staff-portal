"use client";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { schemaImpact, schemaInput } from "@/utils/scores";
import { useUnsaved } from "@/shared/unsaved";
import { errorMessage } from "@/api/base-query";
import {
  skillCodes,
  skillNames,
  type AssessmentInput,
  type StudentResult,
} from "@/types";
const maxima = [4, 3, 3, 11, 5, 4, 5];
export const defaultSchema: AssessmentInput = {
  name: "",
  type: "PROGRESS_TRACKING",
  skills: skillCodes.map((skillCode, i) => ({
    skillCode,
    maxQuestions: maxima[i],
    allowDecimal: skillCode === "SPEAKING",
    order: i + 1,
  })),
};
export function SchemaEditor({
  initial,
  results = [],
  submit,
  busy,
  locked = false,
}: {
  initial: AssessmentInput;
  results?: StudentResult[];
  submit: (values: AssessmentInput, confirmed: boolean) => Promise<void>;
  busy: boolean;
  locked?: boolean;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    getValues,
  } = useForm<AssessmentInput>({
    resolver: zodResolver(schemaInput),
    defaultValues: initial,
  });
  const { fields, append, remove, move } = useFieldArray({
      control,
      name: "skills",
    }),
    values = useWatch({ control }) as AssessmentInput,
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false);
  useUnsaved(isDirty);
  return (
    <Stack
      component="form"
      onSubmit={handleSubmit(async (v) => {
        setError("");
        setSuccess(false);
        const ordered = {
            ...v,
            skills: v.skills.map((s, i) => ({ ...s, order: i + 1 })),
          },
          changed =
            JSON.stringify(ordered.skills) !== JSON.stringify(initial.skills),
          hasPoints = results.some((r) =>
            r.skillResults.some((s) => s.score !== null),
          ),
          impact = schemaImpact(ordered.skills, results);
        if (impact.some((s) => s.includes("không hợp lệ"))) {
          setError(
            "Cần sửa điểm trước khi lưu cấu hình:\n" + impact.join("\n"),
          );
          return;
        }
        if (
          changed &&
          hasPoints &&
          !window.confirm(
            "Thay đổi schema khi đã có điểm. " +
              (impact.length
                ? impact.join("\n")
                : "Điểm hiện tại được giữ; phần mới sẽ để trống.") +
              "\nXác nhận lưu cấu hình?",
          )
        )
          return;
        try {
          await submit(ordered, changed && hasPoints);
          reset(ordered);
          setSuccess(true);
        } catch (e) {
          setError(errorMessage(e));
        }
      })}
      sx={{
        gap: 2.5,
      }}
    >
      {error && (
        <Alert severity="error" sx={{ whiteSpace: "pre-wrap" }}>
          {error}
          <Button onClick={() => location.reload()}>Tải lại dữ liệu</Button>
        </Alert>
      )}
      {success && (
        <Alert severity="success">Đã lưu cấu hình bài đánh giá.</Alert>
      )}
      {locked && (
        <Alert severity="info">
          Bài đã hoàn thành. Chuyển về nháp để sửa cấu hình hoặc điểm.
        </Alert>
      )}
      <TextField
        label="Tên bài đánh giá"
        {...register("name")}
        disabled={locked || busy}
        error={!!errors.name}
        helperText={errors.name?.message}
      />
      <Controller
        name="type"
        control={control}
        render={({ field }) => (
          <TextField
            select
            label="Loại bài đánh giá"
            {...field}
            disabled={locked || busy}
          >
            <MenuItem value="PROGRESS_TRACKING">Theo dõi tiến bộ</MenuItem>
            <MenuItem value="FINAL_TEST">Kiểm tra cuối kỳ</MenuItem>
          </TextField>
        )}
      />
      <Typography variant="body2" color="text.secondary">
        Chọn một hoặc nhiều kỹ năng. Cả hai loại bài đều dùng cùng quy tắc tính
        điểm.
      </Typography>
      <Stack
        direction="row"
        useFlexGap
        sx={{
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        {skillCodes.map((code, i) => (
          <FormControlLabel
            key={code}
            label={skillNames[code]}
            control={
              <Checkbox
                disabled={locked || busy}
                checked={fields.some((s) => s.skillCode === code)}
                onChange={(_, checked) => {
                  if (checked)
                    append({
                      skillCode: code,
                      maxQuestions: maxima[i],
                      allowDecimal: code === "SPEAKING",
                      order:
                        Math.max(
                          0,
                          ...getValues("skills").map((s) => s.order),
                        ) + 1,
                    });
                  else
                    remove(
                      getValues("skills").findIndex(
                        (s) => s.skillCode === code,
                      ),
                    );
                }}
              />
            }
          />
        ))}
      </Stack>
      {errors.skills?.message && (
        <Alert severity="error">{errors.skills.message}</Alert>
      )}
      {fields.map((field, i) => (
        <Box
          key={field.id}
          sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2 }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            sx={{
              alignItems: { sm: "center" },
              gap: 2,
            }}
          >
            <Typography
              sx={{
                ...{ minWidth: 140 },
                fontWeight: 600,
              }}
            >
              {skillNames[field.skillCode]}
            </Typography>
            <TextField
              type="number"
              label={`Số câu tối đa · ${skillNames[field.skillCode]}`}
              {...register(`skills.${i}.maxQuestions`, { valueAsNumber: true })}
              disabled={locked || busy}
              error={!!errors.skills?.[i]?.maxQuestions}
              helperText={errors.skills?.[i]?.maxQuestions?.message}
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
              sx={{ maxWidth: { sm: 200 } }}
            />
            <Controller
              control={control}
              name={`skills.${i}.allowDecimal`}
              render={({ field: f }) => (
                <FormControlLabel
                  label="Cho phép thập phân"
                  control={
                    <Checkbox
                      checked={f.value}
                      onChange={(_, v) => f.onChange(v)}
                      disabled={locked || busy}
                    />
                  }
                />
              )}
            />
            <Stack direction="row">
              <Button
                disabled={!i || locked || busy}
                onClick={() => move(i, i - 1)}
                aria-label={"Đưa " + skillNames[field.skillCode] + " lên"}
              >
                ↑
              </Button>
              <Button
                disabled={i === fields.length - 1 || locked || busy}
                onClick={() => move(i, i + 1)}
                aria-label={"Đưa " + skillNames[field.skillCode] + " xuống"}
              >
                ↓
              </Button>
            </Stack>
          </Stack>
        </Box>
      ))}
      <Alert severity="info">
        Tổng tối đa:{" "}
        {values.skills.reduce(
          (n, s) => n + (Number.isFinite(s.maxQuestions) ? s.maxQuestions : 0),
          0,
        )}{" "}
        · Tỷ lệ tổng = tổng điểm đạt / tổng điểm tối đa × 100.
      </Alert>
      <Button
        variant="contained"
        type="submit"
        loading={busy}
        disabled={locked}
        sx={{ alignSelf: "flex-start" }}
      >
        Lưu schema
      </Button>
    </Stack>
  );
}
