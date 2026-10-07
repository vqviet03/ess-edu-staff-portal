import { applicationName } from "@/features/settings/branding";
import type ExcelJS from "exceljs";
import {
  type Assessment,
  type Context,
  type Student,
  type StudentResult,
  type ImportPreview,
  type ImportError,
  type SkillCode,
} from "@/types";
import { emptyResult, validateResult } from "@/utils/scores";
export const TEMPLATE_VERSION = 1;
export const headersFor = (a: Assessment) => [
  "student_id",
  "student_name",
  "attended",
  ...a.skills.flatMap((s) => [
    `${s.skillCode.toLowerCase()}_score`,
    `${s.skillCode.toLowerCase()}_comment`,
    `${s.skillCode.toLowerCase()}_advice`,
  ]),
  "overall_comment",
  "overall_advice",
  "total_score",
  "total_max",
  "total_percentage",
  "result_version",
];
const columnLetter = (n: number): string =>
  n <= 26
    ? String.fromCharCode(64 + n)
    : columnLetter(Math.floor((n - 1) / 26)) +
      String.fromCharCode(65 + ((n - 1) % 26));
export async function createTemplate(
  context: Context,
  assessment: Assessment,
  students: Student[],
  results: StudentResult[],
): Promise<Blob> {
  const { default: Excel } = await import("exceljs");
  const book = new Excel.Workbook();
  book.creator = applicationName();
  const sheet = book.addWorksheet("Scores", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 1 }],
  });
  const headers = headersFor(assessment);
  sheet.addRow(headers);
  sheet.columns = headers.map((h) => ({
    key: h,
    width: h.endsWith("_comment") || h.endsWith("_advice") ? 36 : 18,
    hidden: h === "result_version",
  }));
  for (const student of students) {
    const result =
      results.find((r) => r.studentId === student.id) ??
      emptyResult(student.id, assessment.skills);
    const row = sheet.addRow([
      student.publicId ?? student.studentCode ?? student.id,
      student.name,
      result.attendance,
      ...assessment.skills.flatMap((s) => {
        const r = result.skillResults.find((r) => r.skillCode === s.skillCode);
        return [r?.score ?? null, r?.comment ?? "", r?.advice ?? ""];
      }),
      result.overallComment,
      result.overallAdvice,
      null,
      null,
      null,
      result.version,
    ]);
    const scoreRefs = assessment.skills
      .map((_, i) => `${columnLetter(4 + i * 3)}${row.number}`)
      .join(",");
    const totalCol = headers.indexOf("total_score") + 1,
      maxCol = headers.indexOf("total_max") + 1;
    row.getCell(totalCol).value = {
      formula: `IF(COUNT(${scoreRefs})=0,"",SUM(${scoreRefs}))`,
    };
    row.getCell(maxCol).value = assessment.skills.reduce(
      (n, s) => n + s.maxQuestions,
      0,
    );
    row.getCell(headers.indexOf("total_percentage") + 1).value = {
      formula: `IF(${columnLetter(totalCol)}${row.number}="","",${columnLetter(totalCol)}${row.number}/${columnLetter(maxCol)}${row.number}*100)`,
    };
    for (const [i, s] of assessment.skills.entries()) {
      const cell = row.getCell(4 + i * 3);
      cell.dataValidation = {
        type: s.allowDecimal ? "decimal" : "whole",
        operator: "between",
        allowBlank: true,
        formulae: [0, s.maxQuestions],
        showErrorMessage: true,
        errorTitle: "Điểm không hợp lệ",
        error: `Nhập từ 0 đến ${s.maxQuestions}`,
      };
      cell.protection = { locked: false };
    }
    row.getCell(3).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"PRESENT,ABSENT,UNSET"'],
    };
    headers.forEach((h, i) => {
      const cell = row.getCell(i + 1);
      cell.alignment = { vertical: "top", wrapText: true };
      if (
        ![
          "student_id",
          "student_name",
          "result_version",
          "total_score",
          "total_max",
          "total_percentage",
        ].includes(h)
      )
        cell.protection = { locked: false };
    });
  }
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF377A55" },
  };
  sheet.getRow(1).height = 30;
  await sheet.protect("learnleaf-template", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatRows: true,
  });
  const schema = book.addWorksheet("Schema");
  schema.addRow([
    "template_version",
    "class_id",
    "session_id",
    "assessment_id",
    "schema_version",
  ]);
  schema.addRow([
    TEMPLATE_VERSION,
    context.classId,
    context.sessionId,
    assessment.id,
    assessment.schemaVersion,
  ]);
  schema.addRow([]);
  schema.addRow(["skill_code", "max_questions", "allow_decimal", "order"]);
  assessment.skills.forEach((s) =>
    schema.addRow([s.skillCode, s.maxQuestions, s.allowDecimal, s.order]),
  );
  schema.columns.forEach((c) => (c.width = 25));
  const instructions = book.addWorksheet("Instructions");
  [
    `${applicationName()} · Mẫu nhập điểm. Không sửa sheet Schema hoặc ID học sinh.`,
    "attended: PRESENT = Có mặt; ABSENT = Vắng; UNSET = Chưa xác định. Vắng không nhập điểm 0.",
    "Điểm từ 0 đến max_questions. Chỉ nhập thập phân khi allow_decimal=true. Ví dụ Speaking 2.1/4.",
    "Ô trống giữ dữ liệu cũ mặc định; số 0 cập nhật. Muốn xóa, chọn chế độ thay thế và xác nhận trong ứng dụng.",
    "Nhận xét tiếng Việt và xuống dòng được giữ nguyên. Cột tổng có công thức, ứng dụng sẽ tính lại khi import.",
    "result_version dùng chống ghi đè. Nếu người khác đã sửa điểm, tải lại mẫu mới.",
    "Không nhập công thức vào cột điểm hoặc nhận xét. Tối đa 5 MB, 1000 dòng.",
  ].forEach((t) => instructions.addRow([t]));
  instructions.getColumn(1).width = 100;
  instructions.eachRow((r) => {
    r.height = 40;
    r.alignment = { wrapText: true };
  });
  const buffer = await book.xlsx.writeBuffer();
  return new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
function scalar(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v && typeof v === "object" && "richText" in v)
    return v.richText.map((t) => t.text).join("");
  return v;
}
export async function parseWorkbook(
  file: Blob,
  context: Context,
  a: Assessment,
  students: Student[],
  results: StudentResult[],
  mode: ImportPreview["mode"] = "MERGE_NON_EMPTY",
): Promise<Omit<ImportPreview, "previewId" | "expiresAt">> {
  const errors: ImportError[] = [];
  const changes: ImportPreview["changes"] = [];
  if (file.size > 5 * 1024 * 1024) throw new Error("File vượt quá 5 MB.");
  const { default: Excel } = await import("exceljs");
  const book = new Excel.Workbook();
  await book.xlsx.load(await file.arrayBuffer());
  const schema = book.getWorksheet("Schema"),
    sheet = book.getWorksheet("Scores");
  if (!schema || !sheet) throw new Error("Thiếu sheet Scores hoặc Schema.");
  const metadata = [
    TEMPLATE_VERSION,
    context.classId,
    context.sessionId,
    a.id,
    a.schemaVersion,
  ];
  if (metadata.some((v, i) => scalar(schema.getRow(2).getCell(i + 1)) !== v))
    throw new Error(
      "File sai lớp/bài đánh giá hoặc schema đã cũ. Hãy tải lại mẫu.",
    );
  const configured = a.skills.map((s) => [
    s.skillCode,
    s.maxQuestions,
    s.allowDecimal,
    s.order,
  ]);
  if (
    schema.rowCount !== 4 + configured.length ||
    configured.some((row, i) =>
      row.some((v, j) => scalar(schema.getRow(i + 5).getCell(j + 1)) !== v),
    )
  )
    throw new Error("Cấu hình kỹ năng trong file đã bị thay đổi.");
  if (sheet.rowCount > 1001) throw new Error("Tối đa 1000 học sinh mỗi file.");
  const headers = headersFor(a);
  if (headers.some((h, i) => scalar(sheet.getRow(1).getCell(i + 1)) !== h))
    throw new Error("Cột trong Scores không khớp mẫu.");
  const seen = new Set<string>();
  for (let n = 2; n <= sheet.rowCount; n++) {
    const row = sheet.getRow(n);
    if (!row.hasValues) continue;
    const value = (name: string) =>
      scalar(row.getCell(headers.indexOf(name) + 1));
    const suppliedId = value("student_id");
    const id = typeof suppliedId === "string" ? students.find(s => [s.id, s.publicId, s.studentCode].includes(suppliedId))?.id ?? suppliedId : suppliedId;
    const add = (column: string, message: string) =>
      errors.push({ row: n, column, message });
    if (typeof id !== "string" || !students.some((s) => [s.id, s.publicId, s.studentCode].includes(id))) {
      add("student_id", "ID không thuộc lớp hoặc không hợp lệ");
      continue;
    }
    if (seen.has(id)) {
      add("student_id", "ID học sinh bị trùng");
      continue;
    }
    seen.add(id);
    const before =
      results.find((r) => r.studentId === id) ?? emptyResult(id, a.skills);
    const after = structuredClone(before);
    const version = value("result_version");
    if (version !== before.version)
      add("result_version", "Điểm đã được cập nhật. Tải lại file mẫu mới.");
    const attendance = value("attended");
    if (attendance !== null && attendance !== "") {
      if (!["PRESENT", "ABSENT", "UNSET"].includes(String(attendance)))
        add("attended", "Chỉ nhận PRESENT, ABSENT hoặc UNSET");
      else after.attendance = attendance as StudentResult["attendance"];
    } else if (mode === "REPLACE_ALL") after.attendance = "UNSET";
    for (const s of a.skills) {
      let result = after.skillResults.find((r) => r.skillCode === s.skillCode);
      if (!result) {
        result = {
          skillCode: s.skillCode,
          score: null,
          comment: "",
          advice: "",
        };
        after.skillResults.push(result);
      }
      const prefix = s.skillCode.toLowerCase();
      const raw = value(prefix + "_score");
      if (raw == null || raw === "") {
        if (mode === "REPLACE_ALL") result.score = null;
      } else if (typeof raw !== "number" || !Number.isFinite(raw))
        add(prefix + "_score", "Điểm phải là số, không phải chữ/công thức");
      else result.score = raw;
      for (const key of ["comment", "advice"] as const) {
        const text = value(prefix + "_" + key);
        if (text == null || text === "") {
          if (mode === "REPLACE_ALL") result[key] = "";
        } else if (typeof text !== "string")
          add(prefix + "_" + key, "Nội dung phải là văn bản");
        else result[key] = text;
      }
    }
    for (const [col, key] of [
      ["overall_comment", "overallComment"],
      ["overall_advice", "overallAdvice"],
    ] as const) {
      const raw = value(col);
      if (raw == null || raw === "") {
        if (mode === "REPLACE_ALL") after[key] = "";
      } else if (typeof raw !== "string") add(col, "Nội dung phải là văn bản");
      else after[key] = raw;
    }
    for (const [key, message] of Object.entries(
      validateResult(after, a.skills),
    ))
      add(
        key === "attendance"
          ? "attended"
          : key === "overall"
            ? "overall_comment"
            : `${(key as SkillCode).toLowerCase()}_score`,
        message,
      );
    if (JSON.stringify(before) !== JSON.stringify(after))
      changes.push({ studentId: id, before, after });
  }
  if (!seen.size && !errors.length)
    throw new Error("File không có dòng học sinh.");
  return { changes, errors, mode };
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function errorWorkbook(errors: ImportError[]): Promise<Blob> {
  const { default: Excel } = await import("exceljs");
  const b = new Excel.Workbook(),
    s = b.addWorksheet("Errors");
  s.addRow(["Dòng", "Cột", "Lỗi"]);
  errors.forEach((e) => s.addRow([e.row, e.column, e.message]));
  s.columns = [{ width: 10 }, { width: 25 }, { width: 70 }];
  const bytes = await b.xlsx.writeBuffer();
  return new Blob([new Uint8Array(bytes)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
