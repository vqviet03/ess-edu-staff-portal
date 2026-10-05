import { z } from "zod";
import {
  skillCodes,
  type Assessment,
  type SkillSchema,
  type StudentResult,
} from "@/types";
z.config(z.locales.vi());
export const schemaInput = z
  .object({
    name: z.string().trim().min(1, "Nhập tên bài đánh giá").max(120),
    type: z.enum(["PROGRESS_TRACKING", "FINAL_TEST"]),
    skills: z
      .array(
        z.object({
          skillCode: z.enum(skillCodes),
          maxQuestions: z
            .number()
            .int("Số câu phải là số nguyên")
            .positive("Số câu phải lớn hơn 0")
            .max(10000),
          allowDecimal: z.boolean(),
          order: z.number().int().positive(),
        }),
      )
      .min(1, "Chọn ít nhất một kỹ năng"),
  })
  .superRefine((v, c) => {
    if (new Set(v.skills.map((s) => s.skillCode)).size !== v.skills.length)
      c.addIssue({
        code: "custom",
        path: ["skills"],
        message: "Kỹ năng bị trùng",
      });
    if (new Set(v.skills.map((s) => s.order)).size !== v.skills.length)
      c.addIssue({
        code: "custom",
        path: ["skills"],
        message: "Thứ tự kỹ năng bị trùng",
      });
  });
export const loginInput = z.object({
  teacherId: z.string().trim().min(1, "Nhập ID giảng viên"),
  password: z.string().min(1, "Nhập mật khẩu"),
});
export const studentInput = z.object({
  name: z.string().trim().min(1, "Nhập họ tên").max(120),
  nickname: z.string().max(80),
  dateOfBirth: z
    .string()
    .refine(
      (v) =>
        !v ||
        (z.iso.date().safeParse(v).success &&
          v <= new Date().toISOString().slice(0, 10)),
      "Ngày sinh không hợp lệ",
    ),
  status: z.enum(["ACTIVE", "PAUSED", "INACTIVE"]),
});
export const sessionInput = z.object({
  name: z.string().trim().min(1, "Nhập tên phiên").max(120),
  unitNumber: z.number().int().positive().nullable(),
  date: z.iso.date({ error: "Chọn ngày học hợp lệ" }),
  note: z.string().max(2000),
  status: z.enum(["DRAFT", "COMPLETED"]),
});
export function emptyResult(
  studentId: string,
  skills: SkillSchema[],
): StudentResult {
  return {
    studentId,
    attendance: "UNSET",
    skillResults: skills.map((s) => ({
      skillCode: s.skillCode,
      score: null,
      comment: "",
      advice: "",
    })),
    overallComment: "",
    overallAdvice: "",
    version: 0,
  };
}
export function calculate(result: StudentResult, schema: SkillSchema[]) {
  const entered = schema.filter(
    (s) =>
      result.skillResults.find((r) => r.skillCode === s.skillCode)?.score !=
      null,
  ).length;
  const score = schema.reduce(
    (sum, s) =>
      sum +
      (result.skillResults.find((r) => r.skillCode === s.skillCode)?.score ??
        0),
    0,
  );
  const max = schema.reduce((sum, s) => sum + s.maxQuestions, 0);
  return {
    score: entered ? score : null,
    max,
    percentage: entered && max ? (score / max) * 100 : null,
    entered,
    count: schema.length,
    complete: entered === schema.length && result.attendance === "PRESENT",
  };
}
export function percent(value: number | null) {
  return value == null
    ? "—"
    : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}
export function validateResult(
  result: StudentResult,
  schema: SkillSchema[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!["PRESENT", "ABSENT", "UNSET"].includes(result.attendance))
    errors.attendance = "Trạng thái tham gia không hợp lệ";
  if (
    new Set(result.skillResults.map((s) => s.skillCode)).size !==
    result.skillResults.length
  )
    errors.skills = "Kỹ năng bị trùng";
  if (
    schema.some(
      (s) => !result.skillResults.some((r) => r.skillCode === s.skillCode),
    )
  )
    errors.skills = "Thiếu phần kỹ năng trong kết quả";
  for (const r of result.skillResults) {
    const s = schema.find((s) => s.skillCode === r.skillCode);
    if (!s) {
      errors[r.skillCode] = "Kỹ năng không có trong schema";
      continue;
    }
    if (
      r.score !== null &&
      (!Number.isFinite(r.score) || r.score < 0 || r.score > s.maxQuestions)
    )
      errors[r.skillCode] = `Điểm phải từ 0 đến ${s.maxQuestions}`;
    else if (r.score !== null && !s.allowDecimal && !Number.isInteger(r.score))
      errors[r.skillCode] = "Chỉ cho phép điểm nguyên";
    if (r.comment.length > 4000 || r.advice.length > 4000)
      errors[r.skillCode] = "Nhận xét/lời khuyên tối đa 4000 ký tự";
  }
  if (
    result.attendance === "ABSENT" &&
    result.skillResults.some((r) => r.score !== null)
  )
    errors.attendance = "Học sinh vắng phải để điểm trống";
  if (
    result.attendance === "UNSET" &&
    result.skillResults.some((r) => r.score !== null)
  )
    errors.attendance = "Chọn Có mặt trước khi nhập điểm";
  if (result.overallComment.length > 4000 || result.overallAdvice.length > 4000)
    errors.overall = "Nội dung tối đa 4000 ký tự";
  return errors;
}
export function resultInput(assessment: Assessment) {
  return z
    .object({
      studentId: z.string(),
      attendance: z.enum(["PRESENT", "ABSENT", "UNSET"]),
      skillResults: z.array(
        z.object({
          skillCode: z.enum(skillCodes),
          score: z.number().nullable(),
          comment: z.string(),
          advice: z.string(),
        }),
      ),
      overallComment: z.string(),
      overallAdvice: z.string(),
      version: z.number().int().nonnegative(),
    })
    .superRefine((r, c) =>
      Object.entries(validateResult(r, assessment.skills)).forEach(
        ([key, message]) =>
          c.addIssue({
            code: "custom",
            path:
              key === "attendance"
                ? ["attendance"]
                : key === "overall"
                  ? ["overallComment"]
                  : [
                      "skillResults",
                      Math.max(
                        0,
                        r.skillResults.findIndex((s) => s.skillCode === key),
                      ),
                      "score",
                    ],
            message,
          }),
      ),
    );
}
export function completedUnitNumbers(
  sessions: { unitNumber: number | null; status: string }[],
) {
  return [
    ...new Set(
      sessions
        .filter((s) => s.status === "COMPLETED" && s.unitNumber !== null)
        .map((s) => s.unitNumber!),
    ),
  ].sort((a, b) => a - b);
}
export function schemaImpact(next: SkillSchema[], results: StudentResult[]) {
  return results.flatMap((r) =>
    r.skillResults
      .filter((s) => s.score !== null)
      .flatMap((s) => {
        const n = next.find((n) => n.skillCode === s.skillCode);
        return !n
          ? [`${r.studentId}: ${s.skillCode} sẽ bị xóa`]
          : s.score! > n.maxQuestions ||
              (!n.allowDecimal && !Number.isInteger(s.score))
            ? [`${r.studentId}: ${s.skillCode} không hợp lệ với cấu hình mới`]
            : [];
      }),
  );
}
