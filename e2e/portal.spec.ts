import { test, expect, type Page } from "@playwright/test";
import { Workbook } from "exceljs";
const context =
  "classId=class-green&sessionId=session-3&assessmentId=assessment-seven";
async function login(page: Page) {
  await page.goto("login/");
  await page.getByLabel("ID giảng viên").fill("GV0001");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Lớp học của tôi" }),
  ).toBeVisible();
}
test("đăng nhập, reload, theme, deep links và 401", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("class/?classId=class-green");
  await expect(
    page.getByRole("heading", { name: "Đăng nhập giảng viên" }),
  ).toBeVisible();
  await page.getByLabel("ID giảng viên").fill("wrong");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByText("ID giảng viên hoặc mật khẩu không đúng."),
  ).toBeVisible();
  await login(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Lớp học của tôi" }),
  ).toBeVisible();
  await page.getByLabel("Giao diện").click();
  await page.getByRole("option", { name: "Tối", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Giao diện")).toHaveText("Tối");
  for (const route of [
    "class/?classId=class-green",
    "session/?classId=class-green&sessionId=session-3",
    "assessment/?" + context,
    "scores/?" + context,
    "student-score/?" + context,
    "import/?" + context,
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    await page.reload();
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("learnleaf.staff.mock.v1")!);
    db.tokens = {};
    localStorage.setItem("learnleaf.staff.mock.v1", JSON.stringify(db));
  });
  await page.goto("home/");
  await expect(
    page.getByRole("heading", { name: "Đăng nhập giảng viên" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("learnleaf.staff.auth")),
  ).toBeNull();
  expect(errors).toEqual([]);
});
test("link: xóa fragment, đổi mã một lần, hết hạn/thiếu mã", async ({
  page,
}) => {
  await page.goto("login/link/#code=teacher-demo");
  await expect(
    page.getByRole("heading", { name: "Lớp học của tôi" }),
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await page.goto("login/link/#code=teacher-demo");
  await expect(page.getByText("Liên kết đã được sử dụng.")).toBeVisible();
  await page.goto("login/link/#code=expired-demo");
  await expect(page.getByText("Liên kết đã hết hạn.")).toBeVisible();
  await page.goto("login/link/");
  await expect(page.getByText("Liên kết thiếu mã đăng nhập.")).toBeVisible();
});
test("sửa học sinh, tạo phiên và bài 2 kỹ năng; phiên mới không tăng tiến độ", async ({
  page,
}) => {
  await login(page);
  await page.goto("class/?classId=class-green");
  await page.getByRole("button", { name: "Sửa Hữu Văn" }).click();
  await page.getByLabel("Biệt danh").fill("Bon mới");
  await page.getByRole("button", { name: "Lưu học sinh" }).click();
  await expect(
    page.getByRole("cell", { name: "Bon mới", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Phiên học", exact: true }).click();
  await page
    .getByRole("button", { name: "Tạo phiên học", exact: true })
    .click();
  await page.getByLabel("Tên phiên học").fill("Buổi luyện tập");
  await page.getByLabel("Unit liên quan").click();
  await page.getByRole("option", { name: "Unit 3", exact: true }).click();
  await page.getByRole("button", { name: "Tạo phiên", exact: true }).click();
  await expect(page.getByText("Buổi luyện tập", { exact: true })).toBeVisible();
  await expect(page.getByText("2/8 Unit · 25%")).toBeVisible();
  await page
    .getByText("Buổi luyện tập", { exact: true })
    .locator("..")
    .locator("..")
    .locator("..")
    .getByRole("link", { name: "Mở phiên" })
    .click();
  await page.getByRole("button", { name: "Tạo bài đánh giá" }).click();
  await page.getByLabel("Tên bài đánh giá").fill("Luyện nghe và nói");
  for (const name of ["Từ vựng", "Ngữ pháp", "Phát âm", "Đọc", "Viết"]) {
    const checkbox = page.getByRole("checkbox", { name, exact: true });
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
  }
  await page.getByRole("button", { name: "Lưu schema" }).click();
  await expect(
    page.getByRole("heading", { name: "Luyện nghe và nói" }),
  ).toBeVisible();
  await expect(page.getByText(/2 kỹ năng · Tổng tối đa 15/)).toBeVisible();
});
test("form/table dùng chung, null/0, cảnh báo rời trang, lưu dòng và xác nhận vắng", async ({
  page,
}) => {
  await login(page);
  await page.goto("student-score/?" + context);
  await expect(
    page.getByRole("heading", { name: "23.1 / 35 · 66%" }),
  ).toBeVisible();
  await page.getByLabel("Số câu / điểm đạt", { exact: true }).first().fill("0");
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("link", { name: "← Bảng điểm" }).click();
  await expect(
    page.getByRole("heading", { name: "Nhập điểm học sinh" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByText("Đã lưu điểm thành công.")).toBeVisible();
  await page.getByRole("link", { name: "← Bảng điểm" }).click();
  await page.getByLabel("Điểm Từ vựng HV1001", { exact: true }).fill("1");
  page.once("dialog", (d) => d.dismiss());
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Nhập nhanh theo bảng" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lưu 1 dòng đã sửa" }).click();
  await expect(page.getByText("Đã lưu 1 học sinh.")).toBeVisible();
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("checkbox", { name: "Có mặt HV1001", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Có mặt HV1001", exact: true }),
  ).toBeChecked();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("checkbox", { name: "Có mặt HV1001", exact: true })
    .uncheck();
  await expect(
    page.getByLabel("Điểm Từ vựng HV1001", { exact: true }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Lưu 1 dòng đã sửa" }).click();
  await expect(page.getByText("Đã lưu 1 học sinh.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Có mặt HV1001", exact: true }),
  ).not.toBeChecked();
});
test("Excel tải mẫu thực, preview và commit; mobile không tràn màn hình", async ({
  page,
}) => {
  await login(page);
  await page.goto("import/?" + context);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải file mẫu .xlsx" }).click();
  const downloaded = await event,
    path = await downloaded.path();
  expect(path).toBeTruthy();
  const book = new Workbook();
  await book.xlsx.readFile(path!);
  book.getWorksheet("Scores")!.getCell("D2").value = 0;
  const buffer = Buffer.from(await book.xlsx.writeBuffer());
  await page.getByLabel("File Excel", { exact: true }).setInputFiles({
    name: "diem.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  });
  await page
    .getByRole("button", { name: "Kiểm tra dữ liệu", exact: true })
    .click();
  await expect(page.getByText(/1 học sinh thay đổi · 0 lỗi/)).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Xác nhận import", exact: true })
    .click();
  await expect(page.getByText("Import thành công: 1 học sinh.")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("scores/?" + context);
  await expect(
    page.getByRole("link", { name: "Nhập điểm học sinh" }).first(),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("link", { name: "Nhập điểm học sinh" }).first().click();
  await expect(
    page.getByLabel("Số câu / điểm đạt", { exact: true }).first(),
  ).toHaveValue("0");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/mobile-student.png",
    fullPage: true,
  });
});
