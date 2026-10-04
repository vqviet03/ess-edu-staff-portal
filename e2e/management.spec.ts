import { test, expect, type Page } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const go = (page: Page, path: string) => page.goto(`${base}${path}`);
async function login(page: Page, id = "MG0001") {
  await go(page, "/login/");
  await page.getByLabel("ID giảng viên").fill(id);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/home\//);
}
async function confirmPreview(
  page: Page,
  reason = "Xác nhận kiểm thử nghiệp vụ",
) {
  const checks = page.getByRole("checkbox");
  for (const c of await checks.all())
    if (
      (await c.isVisible()) &&
      (await c.isEnabled()) &&
      !(await c.isChecked())
    )
      await c.check();
  const reasonField = page.getByLabel(/Lý do thay đổi|Lý do \/ ghi chú/);
  await reasonField.fill(reason);
  await page
    .getByRole("button", { name: /Xác nhận cập nhật \d+ bản ghi/ })
    .click();
}
test.beforeEach(async ({ page }) => {
  if (process.env.NEXT_PUBLIC_USE_MOCK !== "true")
    await installHttpFixture(page);
});
test("manager dashboard, navigation, readonly grades/schema, dark/mobile và deep links", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Tổng quan", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Không gian")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/management-overview-light.png",
    fullPage: true,
  });
  await go(
    page,
    "/scores/?classId=class-green&sessionId=session-3&assessmentId=assessment-seven",
  );
  await expect(page.getByText(/Chỉ xem nội dung học tập/)).toBeVisible();
  await expect(page.getByRole("table", { name: "Bảng nhập điểm" })).toBeVisible(
    { timeout: 15000 },
  );
  await expect(page.getByRole("button", { name: /Lưu.*dòng/ })).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Nhận xét tổng HV1001" }),
  ).toBeDisabled();
  await go(
    page,
    "/assessment/?classId=class-green&sessionId=session-3&assessmentId=assessment-seven",
  );
  await expect(
    page.getByRole("button", { name: "Đánh dấu hoàn thành" }),
  ).toBeDisabled();
  await go(page, "/home/");
  await page.getByLabel("Giao diện").click();
  await page.getByRole("option", { name: "Tối", exact: true }).click();
  await page.screenshot({
    path: "test-results/management-overview-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await go(page, "/manage/list/?entity=students");
  await expect(
    page.getByRole("heading", { name: "Học sinh", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Hồ sơ", exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/management-students-mobile.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Học sinh", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("dual switch giữ lựa chọn, lịch sử chỉ xem; teacher không được vào quản lý", async ({
  page,
}) => {
  await login(page, "BOTH0001");
  await page.getByLabel("Không gian").click();
  await page.getByRole("option", { name: "Giảng viên", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Không gian")).toHaveText("Giảng viên");
  await go(page, "/session/?classId=class-green&sessionId=session-3");
  await expect(
    page.getByRole("button", { name: "Tạo bài đánh giá" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Thông tin phiên" }),
  ).toBeDisabled();
  await go(page, "/manage/list/?entity=students");
  await expect(page.getByText(/Cần không gian Quản lý/)).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await login(page, "GV0001");
  await expect(page.getByLabel("Không gian")).toHaveCount(0);
  await go(page, "/manage/list/?entity=students");
  await expect(page.getByText(/Cần không gian Quản lý/)).toBeVisible();
});
test("tạo học sinh cùng tài khoản PENDING, sửa ID khóa; preview giữ form và sinh link kích hoạt", async ({
  page,
}) => {
  await login(page);
  await go(page, "/manage/list/?entity=students");
  await page
    .getByRole("button", { name: "Thêm học sinh", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("ID", { exact: true }).fill("HVNEW01");
  await dialog.getByLabel("Họ tên", { exact: true }).fill("Học sinh mới");
  await dialog.getByLabel("Biệt danh").fill("Bean");
  await dialog.getByLabel("Tạo tài khoản PENDING cùng hồ sơ").check();
  await dialog.getByRole("button", { name: "Kiểm tra & xem trước" }).click();
  await expect(dialog.getByText("PENDING", { exact: false })).toHaveCount(0);
  await confirmPreview(page);
  await expect(page.getByText(/Đã cập nhật 1 bản ghi/)).toBeVisible();
  await page.getByLabel("Tên / ID / số liên hệ").fill("HVNEW01");
  await page.getByRole("link", { name: "Học sinh mới", exact: true }).click();
  await expect(
    page.getByText("Chờ kích hoạt", { exact: false }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Chỉnh sửa hồ sơ / trạng thái" })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("ID", { exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page
    .getByRole("button", { name: "Tạo / cấp lại link kích hoạt" })
    .click();
  await expect(page.getByLabel("Link kích hoạt", { exact: true })).toHaveValue(
    /\/activate\/#code=/,
  );
});
test("ngừng/khôi phục giảng viên rồi xác nhận phân công; cảnh báo còn người thay tính đúng", async ({
  page,
}) => {
  await login(page);
  await go(page, "/manage/profile/?entity=teachers&id=GV0001");
  await page
    .getByRole("button", { name: "Chỉnh sửa hồ sơ / trạng thái" })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Trạng thái", { exact: true })
    .click();
  await page
    .getByRole("option", { name: "Ngừng hoạt động", exact: true })
    .click();
  await page.getByRole("button", { name: "Kiểm tra & xem trước" }).click();
  await expect(
    page.getByRole("heading", { name: "Ảnh hưởng đến 2 lớp" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Lê Linh", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Xác nhận cập nhật/ }),
  ).toBeDisabled();
  await confirmPreview(page);
  await go(page, "/manage/warnings/");
  await expect(
    page.getByRole("heading", { name: "Starters 02", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Juniors 03", exact: true }),
  ).toHaveCount(0);
  await go(page, "/manage/profile/?entity=teachers&id=GV0001");
  await page
    .getByRole("button", { name: "Chỉnh sửa hồ sơ / trạng thái" })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Trạng thái", { exact: true })
    .click();
  await page.getByRole("option", { name: "Hoạt động", exact: true }).click();
  await page.getByRole("button", { name: "Kiểm tra & xem trước" }).click();
  await confirmPreview(page);
  await go(page, "/manage/profile/?entity=classes&id=class-single");
  await page
    .getByRole("button", { name: "Cập nhật phụ trách", exact: true })
    .first()
    .click();
  await page.getByRole("dialog").getByLabel("Trạng thái quan hệ").click();
  await page.getByRole("option", { name: "Hoạt động", exact: true }).click();
  await page
    .getByRole("button", { name: "Kiểm tra ảnh hưởng", exact: true })
    .click();
  await confirmPreview(page);
  await go(page, "/manage/warnings/");
  await expect(
    page.getByRole("heading", { name: "Starters 02", exact: true }),
  ).toHaveCount(0);
});
test("bulk FILTER nhiều trang, preview/cập nhật, export có scope và audit", async ({
  page,
}) => {
  await login(page);
  await go(page, "/manage/list/?entity=students");
  await page.getByRole("button", { name: /Chọn tất cả \d+ kết quả/ }).click();
  await expect(page.getByText(/Đã chọn \d+ trong toàn bộ/)).toBeVisible();
  await page.getByRole("button", { name: /trang 2/i }).click();
  await page
    .getByRole("checkbox", { name: /Chọn HV/ })
    .first()
    .uncheck();
  await page
    .getByRole("button", { name: "Sửa hàng loạt", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByRole("checkbox", { name: "Ghi chú", exact: true }).check();
  await d.getByLabel("Ghi chú mới").fill("Bulk nhiều trang\nTiếng Việt");
  await d.getByRole("button", { name: "Xem preview trước / sau" }).click();
  await expect(page.getByText(/Toàn bộ kết quả bộ lọc/).first()).toBeVisible();
  await confirmPreview(page);
  await expect(page.getByText(/Đã cập nhật \d+ bản ghi/)).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất Excel toàn bộ bộ lọc" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  await go(page, "/manage/audit/");
  await expect(page.getByText(/PREVIEW_COMMIT/).first()).toBeVisible();
});
test("bảng nhập dán nhiều dòng, cell errors/ID trùng và lưu preview", async ({
  page,
}) => {
  await login(page);
  await go(page, "/manage/grid/?entity=students");
  await page.getByLabel("ID dòng 2", { exact: true }).evaluate((el) => {
    const data = new DataTransfer();
    data.setData(
      "text/plain",
      "HVGRID01\tNguyễn An\tBon\t2016-05-12\t0901234567\tACTIVE\tGhi chú\tFALSE\nHVGRID02\tMinh Hà\t\t2016-06-01\t\tACTIVE\t\tFALSE",
    );
    el.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, clipboardData: data }),
    );
  });
  await expect(
    page.getByText("2 dòng có dữ liệu · 1 dòng trống được bỏ qua"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xem trước & lưu" }).click();
  await confirmPreview(page);
  await expect(page.getByText("Đã thêm 2 hồ sơ.")).toBeVisible();
});
test("Excel template/download/import .xlsx thật; lỗi và commit hợp lệ", async ({
  page,
}) => {
  await login(page);
  await go(page, "/manage/excel/?entity=students");
  const promise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Tải template trống", exact: true })
    .click();
  const download = await promise;
  const path = await download.path();
  const { default: Excel } = await import("exceljs"),
    book = new Excel.Workbook();
  await book.xlsx.readFile(path!);
  expect(book.getWorksheet("Data")!.getCell("A2").value).toBeNull();
  book.getWorksheet("Data")!.getCell("A2").value = "HVEXCEL01";
  book.getWorksheet("Data")!.getCell("B2").value = "Học sinh Excel";
  book.getWorksheet("Data")!.getCell("F2").value = "INVALID";
  await page.locator('input[type="file"]').setInputFiles({
    name: "students.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await book.xlsx.writeBuffer()),
  });
  await page
    .getByRole("button", { name: "Kiểm tra & xem trước", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lỗi cần sửa" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Xác nhận cập nhật/ }),
  ).toBeDisabled();
  book.getWorksheet("Data")!.getCell("F2").value = "ACTIVE";
  await page.locator('input[type="file"]').setInputFiles({
    name: "students.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await book.xlsx.writeBuffer()),
  });
  await page
    .getByRole("button", { name: "Kiểm tra & xem trước", exact: true })
    .click();
  await confirmPreview(page);
  await expect(page.getByText("Import thành công: 1 bản ghi.")).toBeVisible();
});

test("activation Staff mới, xóa fragment, đặt mật khẩu và từ chối dùng lại link", async ({
  page,
}) => {
  await login(page);
  await go(page, "/manage/profile/?entity=teachers&id=GV90000");
  await page
    .getByRole("button", { name: "Tạo / cấp lại link kích hoạt" })
    .click();
  const link = await page
    .getByLabel("Link kích hoạt", { exact: true })
    .inputValue();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await page.goto(link);
  await expect(page).not.toHaveURL(/#code=/);
  await page.getByLabel("Mật khẩu mới (10–128 ký tự)").fill("TeacherNew123!");
  await page.getByLabel("Nhập lại mật khẩu").fill("TeacherNew123!");
  await page.getByRole("button", { name: "Xác nhận đặt mật khẩu" }).click();
  await expect(
    page.getByText("Đã đặt mật khẩu.", { exact: false }),
  ).toBeVisible();
  await go(page, "/login/");
  await page.getByLabel("ID giảng viên").fill("GV90000");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("TeacherNew123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/home\//);
  await expect(page.getByLabel("Không gian")).toHaveCount(0);
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await page.goto(link);
  await page.getByLabel("Mật khẩu mới (10–128 ký tự)").fill("TeacherNew123!");
  await page.getByLabel("Nhập lại mật khẩu").fill("TeacherNew123!");
  await page.getByRole("button", { name: "Xác nhận đặt mật khẩu" }).click();
  await expect(
    page.getByText(/Link không hợp lệ, hết hạn hoặc đã dùng/),
  ).toBeVisible();
});
