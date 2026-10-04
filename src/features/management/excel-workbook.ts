import type { CellValue } from "exceljs";
import type { ProfileGroup, PreviewError } from "./models";
export const columns = {
  students: [
    "student_id",
    "full_name",
    "nickname",
    "date_of_birth",
    "parent_contact",
    "status",
    "notes",
    "create_account",
  ],
  teachers: [
    "teacher_id",
    "full_name",
    "email",
    "phone",
    "roles",
    "status",
    "notes",
    "create_account",
  ],
} as const;
export const columnFields: Record<string, string> = {
  student_id: "id",
  teacher_id: "id",
  full_name: "fullName",
  nickname: "nickname",
  date_of_birth: "dateOfBirth",
  parent_contact: "parentContact",
  status: "status",
  notes: "notes",
  create_account: "createAccount",
  email: "email",
  phone: "phone",
  roles: "roles",
};
export async function profileWorkbook(
  group: ProfileGroup,
  records: Record<string, unknown>[] = [],
  scope = "Template trống",
): Promise<Blob> {
  const { Workbook } = (await import("exceljs")).default,
    book = new Workbook();
  book.creator = "ESS";
  const sheet = book.addWorksheet("Data"),
    schema = book.addWorksheet("Schema"),
    instructions = book.addWorksheet("Instructions");
  sheet.columns = columns[group].map((key) => ({
    header: key,
    key,
    width: key === "notes" ? 40 : 24,
  }));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF317B58" },
  };
  for (const record of records)
    sheet.addRow(
      Object.fromEntries(
        columns[group].map((c) => {
          const v = record[columnFields[c]];
          return [
            c,
            c === "create_account"
              ? false
              : Array.isArray(v)
                ? v.join("|")
                : (v ?? ""),
          ];
        }),
      ),
    );
  if (!records.length) sheet.addRow(Array(columns[group].length).fill(null));
  for (let i = 2; i <= Math.max(102, records.length + 1); i++)
    for (const [j, column] of columns[group].entries()) {
      const cell = sheet.getCell(i, j + 1);
      cell.alignment = { vertical: "top", wrapText: true };
      cell.numFmt = "@";
      if (column === "status")
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"ACTIVE,PAUSED,INACTIVE"'],
          showErrorMessage: true,
          errorTitle: "Trạng thái",
          error: "Chọn ACTIVE / PAUSED / INACTIVE",
        };
      if (column === "create_account")
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"TRUE,FALSE"'],
          showErrorMessage: true,
          error: "TRUE / FALSE",
        };
      if (column === "roles")
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"TEACHER,MANAGER,TEACHER|MANAGER"'],
          showErrorMessage: true,
          error: "TEACHER / MANAGER / TEACHER|MANAGER",
        };
    }
  schema.addRows([
    ["template_version", "1"],
    ["entity", group],
    ["scope", scope],
    ["generated_at", new Date().toISOString()],
  ]);
  schema.columns = [{ width: 24 }, { width: 90 }];
  instructions.addRows([
    ["ESS · Import hồ sơ"],
    [
      "student_id / teacher_id và full_name bắt buộc khi tạo. ID ổn định, không đổi khi cập nhật.",
    ],
    [
      "Ngày sinh YYYY-MM-DD; liên hệ là chuỗi để giữ số 0 đầu. Nhận xét tiếng Việt / xuống dòng được giữ.",
    ],
    [
      "Vai trò Staff: TEACHER, MANAGER hoặc TEACHER|MANAGER. Học sinh không có vai trò Staff.",
    ],
    [
      "create_account TRUE/FALSE; tài khoản mới PENDING, không có mật khẩu demo. Cấp link kích hoạt riêng.",
    ],
    [
      "UPDATE: ô trống giữ dữ liệu cũ; muốn xóa chọn trường xóa rõ ở giao diện rồi xác nhận.",
    ],
    [
      "Status ACTIVE/PAUSED/INACTIVE. Đổi trạng thái hoặc vai trò phải xem preview ảnh hưởng.",
    ],
    [
      "Không tự ghi danh / phân công lớp. Không xuất mật khẩu, token hoặc mã kích hoạt.",
    ],
    [
      "Ví dụ học sinh (chỉ hướng dẫn, không import): HV009999 | Nguyễn An | Bon | 2016-05-12 | 0900000000 | ACTIVE | Ghi chú | FALSE",
    ],
    [
      "Ví dụ Staff: GV009999 | Nguyễn Mai | mai@example.com | 0900000000 | TEACHER|MANAGER | ACTIVE | Ghi chú | FALSE",
    ],
  ]);
  instructions.getColumn(1).width = 120;
  instructions.eachRow((r) => (r.alignment = { wrapText: true }));
  const buffer = await book.xlsx.writeBuffer();
  return new Blob([Uint8Array.from(new Uint8Array(buffer))], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
function primitive(value: CellValue): unknown {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  )
    return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  throw new Error(
    "Không nhận công thức, hyperlink hoặc giá trị rich text trong hồ sơ.",
  );
}
export async function readProfiles(
  file: Blob,
  group: ProfileGroup,
): Promise<{ rows: Record<string, unknown>[]; errors: PreviewError[] }> {
  if (file.size > 5 * 1024 * 1024) throw new Error("File tối đa 5 MB.");
  const { Workbook } = (await import("exceljs")).default,
    book = new Workbook();
  await book.xlsx.load(await file.arrayBuffer());
  const sheet = book.getWorksheet("Data"),
    schema = book.getWorksheet("Schema");
  if (!sheet || !schema) throw new Error("Thiếu Data / Schema.");
  const metadata = new Map<string, unknown>();
  schema.eachRow((r) =>
    metadata.set(String(r.getCell(1).value), r.getCell(2).value),
  );
  if (
    String(metadata.get("template_version")) !== "1" ||
    metadata.get("entity") !== group
  )
    throw new Error("Sai nhóm hoặc version template.");
  const header: unknown[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (c) => header.push(c.value));
  if (JSON.stringify(header) !== JSON.stringify(columns[group]))
    throw new Error("Sai/thừa/thiếu cột hoặc thứ tự cột.");
  if (sheet.rowCount > 5001) throw new Error("Tối đa 5000 dòng.");
  const rows: Record<string, unknown>[] = [],
    errors: PreviewError[] = [],
    seen = new Set<string>();
  for (let i = 2; i <= sheet.rowCount; i++) {
    const record: Record<string, unknown> = {};
    let nonEmpty = false;
    for (const [j, column] of columns[group].entries())
      try {
        let value = primitive(sheet.getCell(i, j + 1).value);
        if (value !== "" && value !== null) nonEmpty = true;
        if (column === "create_account" && value !== "") {
          if (
            ![true, false, "TRUE", "FALSE", "true", "false", 1, 0].includes(
              value as boolean,
            )
          )
            throw new Error("TRUE / FALSE");
          value = [true, "TRUE", "true", 1].includes(value as boolean);
        }
        if (column === "roles" && value !== "") {
          if (typeof value !== "string")
            throw new Error("Vai trò phải là chuỗi.");
          value = value.split("|").map((r) => r.trim());
        }
        if (
          column !== "create_account" &&
          column !== "roles" &&
          typeof value !== "string"
        )
          throw new Error("Ô phải là chuỗi, định dạng Text.");
        record[columnFields[column]] = value;
      } catch (e) {
        errors.push({
          row: i,
          column,
          message: e instanceof Error ? e.message : "Giá trị không hợp lệ",
        });
      }
    if (!nonEmpty) continue;
    const recordId = String(record.id ?? "");
    if (seen.has(recordId))
      errors.push({
        row: i,
        column: columns[group][0],
        message: "ID trùng trong file.",
      });
    seen.add(recordId);
    // Preserve physical Excel row number including blank gaps for preview error mapping.
    record._excelRow = i;
    rows.push(record);
  }
  return { rows, errors };
}
export async function errorsWorkbook(errors: PreviewError[]) {
  const { Workbook } = (await import("exceljs")).default,
    book = new Workbook(),
    sheet = book.addWorksheet("Errors");
  sheet.columns = [
    { header: "Dòng", key: "row", width: 12 },
    { header: "Cột", key: "column", width: 25 },
    { header: "Lỗi", key: "message", width: 100 },
  ];
  sheet.addRows(errors);
  return new Blob(
    [Uint8Array.from(new Uint8Array(await book.xlsx.writeBuffer()))],
    {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  );
}
export async function statsWorkbook(
  stats: import("./models").DashboardStats,
  filter: import("./models").StatsFilter,
) {
  const { Workbook } = (await import("exceljs")).default,
    book = new Workbook(),
    sheet = book.addWorksheet("Statistics");
  sheet.addRows([
    ["ESS · Phạm vi", JSON.stringify(filter)],
    ["Hiện tại lúc", stats.asOf],
    ["Học sinh hoạt động", stats.activeStudents],
    ["Giảng viên hoạt động", stats.activeTeachers],
    ["Unit hoàn thành hiện tại", stats.completedUnits, stats.totalUnits],
    ["Phiên hoàn thành theo ngày học", stats.interval.completedSessions],
    [
      "Unit lần đầu hoàn thành trong khoảng",
      stats.interval.newlyCompletedUnits,
      stats.interval.denominator,
    ],
    ["ID", "Lớp", "Trạng thái", "Hoàn thành", "Tổng Unit"],
    ...stats.classes.map((c) => [
      c.id,
      c.name,
      c.status,
      c.completedUnits,
      c.totalUnits,
    ]),
  ]);
  sheet.getColumn(1).width = 50;
  sheet.getColumn(2).width = 70;
  return new Blob(
    [Uint8Array.from(new Uint8Array(await book.xlsx.writeBuffer()))],
    {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  );
}
