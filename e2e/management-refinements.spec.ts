import { test, expect, type Page } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import { seed } from "../src/mock/fixtures";
import { managementSeed } from "../src/mock/management-fixtures";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
async function login(page: Page) {
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill("MG0001");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/home\//);
}
test("audit deep link paginates, sidebar collapses with active icon, edit IDs and back", async ({ page }) => {
  const db = seed(); db.management = managementSeed(db);
  for (let i = 0; i < 25; i++) db.management.audit.push({ id: `log-${i}`, actorId: "MG0001", at: new Date().toISOString(), entity: "materials", action: "DELETE_STORAGE_OBJECTS", ids: ["file"], changes: [], reason: "Kiểm tra" });
  let value = JSON.stringify(db); await installHttpFixture(page, { get: () => value, set: v => { value = v; } });
  await login(page); await page.goto(`${base}/manage/audit/`);
  await expect(page.getByRole("heading", { name: "Nhật ký thay đổi" })).toBeVisible();
  await expect(page.getByText(/25 bản ghi/)).toBeVisible();
  await expect(page.getByText(/Nguyễn Mai.*MG0001/).first()).toBeVisible();
  await page.getByRole("button", { name: "Tới trang 2" }).click();
  await expect(page.getByText("25 bản ghi · Trang 2")).toBeVisible();
  await page.getByRole("button", { name: "Thu menu" }).click();
  await expect(page.getByTestId("sidebar")).toHaveAttribute("data-collapsed", "true");
  await expect(page.getByRole("link", { name: "Nhật ký", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Mở menu" }).click();
  await page.goto(`${base}/manage/profile/?entity=students&id=${encodeURIComponent(db.management.students[0].id)}`);
  await page.getByRole("button", { name: "Chỉnh sửa hồ sơ / trạng thái" }).click();
  const dialog = page.getByRole("dialog"); await expect(dialog.getByLabel("ID", { exact: true })).toBeEnabled();
  await dialog.getByLabel("ID", { exact: true }).fill("student.renamed");
  await dialog.getByRole("button", { name: "Kiểm tra trùng" }).click(); await expect(dialog.getByText(/ID có thể sử dụng/)).toBeVisible();
  await dialog.getByRole("button", { name: "Kiểm tra & xem trước" }).click();
  await dialog.getByRole("button", { name: /Xác nhận cập nhật 1 bản ghi/ }).click();
  await expect(page).toHaveURL(/id=student.renamed/); await expect(page.getByText(/student.renamed/).first()).toBeVisible();
  await page.getByRole("link", { name: "Quay lại", exact: true }).click(); await expect(page).toHaveURL(/manage\/list/);
});
test("manager creates a branding proposal without changing the current name", async ({ page }) => {
  await installHttpFixture(page); await login(page); await page.goto(`${base}/manage/settings/`);
  await expect(page.getByRole("heading", { name: "Cấu hình ứng dụng" })).toBeVisible();
  await page.getByLabel("Tên ứng dụng").fill("LearnLeaf Academy"); await page.getByLabel("Tiền tố gợi ý ID lớp").fill("leaf"); await page.getByLabel("Lý do thay đổi").fill("Đổi tên đã trao đổi");
  page.on("dialog", d => void d.accept()); await page.getByRole("button", { name: "Gửi đề xuất thay đổi" }).click();
  await expect(page.getByText(/Đã gửi đề xuất, đang chờ/)).toBeVisible(); await expect(page.getByText("Chờ xác nhận", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "ESS", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});
