import test from "node:test";
import assert from "node:assert/strict";
import { Workbook } from "exceljs";
import {
  createTemplate,
  headersFor,
  parseWorkbook,
} from "../src/features/excel/workbook";
import { seed } from "../src/mock/fixtures";
const db = seed(),
  a = db.assessments[0],
  students = db.students["class-green"],
  results = db.results[a.id],
  context = {
    classId: "class-green",
    sessionId: a.sessionId,
    assessmentId: a.id,
  };
async function edit(change: (book: Workbook) => void) {
  const blob = await createTemplate(context, a, students, results),
    book = new Workbook();
  await book.xlsx.load(await blob.arrayBuffer());
  change(book);
  return new Blob([new Uint8Array(await book.xlsx.writeBuffer())]);
}
test("mẫu .xlsx thật, công thức chỉ đọc, ô trống giữ dữ liệu, 0 cập nhật, tiếng Việt/xuống dòng", async () => {
  const file = await edit((b) => {
    const s = b.getWorksheet("Scores")!;
    s.getCell("D2").value = 0;
    s.getCell("E2").value = null;
    s.getCell("F2").value = "Ôn tập\nTừ mới";
    s.getRow(2).getCell(headersFor(a).indexOf("total_score") + 1).value = 999;
  });
  const p = await parseWorkbook(file, context, a, students, results);
  assert.deepEqual(p.errors, []);
  assert.equal(p.changes.length, 1);
  const r = p.changes[0].after;
  assert.equal(r.skillResults[0].score, 0);
  assert.equal(r.skillResults[0].comment, results[0].skillResults[0].comment);
  assert.equal(r.skillResults[0].advice, "Ôn tập\nTừ mới");
});
test("từ chối sai bài / schema cũ / thay cấu hình", async () => {
  for (const [cell, value] of [
    ["D2", "wrong"],
    ["E2", 99],
    ["B5", 1],
  ] as const) {
    const f = await edit((b) => {
      b.getWorksheet("Schema")!.getCell(cell).value = value;
    });
    await assert.rejects(() => parseWorkbook(f, context, a, students, results));
  }
});
test("lỗi từng dòng/cột: ID trùng, ngoài lớp, chữ, thập phân, attendance, version", async () => {
  const f = await edit((b) => {
    const s = b.getWorksheet("Scores")!;
    s.getCell("D2").value = "2";
    s.getCell("A3").value = students[0].id;
    s.getCell("A4").value = "foreign";
    s.getCell("C5").value = "invalid";
    s.getCell("C6").value = "PRESENT";
    s.getCell("D6").value = 0.2;
    s.getCell("C7").value = "ABSENT";
    s.getCell("D7").value = 0;
    s.getCell("C8").value = "PRESENT";
    s.getCell("D8").value = 9;
    s.getRow(9).getCell(headersFor(a).indexOf("result_version") + 1).value = 99;
  });
  const p = await parseWorkbook(f, context, a, students, results);
  for (const row of [2, 3, 4, 5, 6, 7, 8, 9])
    assert.ok(
      p.errors.some((e) => e.row === row),
      `row ${row}`,
    );
});
test("xóa chỉ khi REPLACE_ALL rõ ràng", async () => {
  const f = await edit((b) => {
    b.getWorksheet("Scores")!.getCell("D2").value = null;
    b.getWorksheet("Scores")!.getCell("E2").value = null;
  });
  const p = await parseWorkbook(
    f,
    context,
    a,
    students,
    results,
    "REPLACE_ALL",
  );
  assert.equal(p.changes[0].after.skillResults[0].score, null);
  assert.equal(p.changes[0].after.skillResults[0].comment, "");
});
