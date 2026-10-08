import { test, expect, type Page } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import { seed } from "../src/mock/fixtures";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const go = (page: Page, path: string) => page.goto(`${base}${path}`);
async function login(page: Page, id = "MG0001") {
  await go(page, "/login/"); await page.getByLabel("ID giảng viên").fill(id); await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click(); await expect(page).toHaveURL(/\/home\//);
}
async function save(page: Page) {
  await page.getByRole("button", { name: "Kiểm tra & xem trước" }).click();
  await page.getByRole("button", { name: /Xác nhận cập nhật 1 bản ghi/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
test("backend ID suggestions, custom check and websocket refresh another manager without reload", async ({ page, context }) => {
  test.skip(process.env.NEXT_PUBLIC_USE_MOCK === "true", "This scenario validates the HTTP + websocket API contract.");
  let value = JSON.stringify(seed()); const shared = { get: () => value, set: (next: string) => { value = next; } };
  const other = await context.newPage(); await installHttpFixture(page, shared); await installHttpFixture(other, shared);
  await login(page); await login(other, "BOTH0001");
  await go(other, "/manage/list/?entity=students"); await other.getByLabel("Tên / ID / số liên hệ").fill("custom.viet"); await expect(other.getByText("custom.viet", { exact: true })).toHaveCount(0);
  await go(page, "/manage/list/?entity=students"); await page.getByRole("button", { name: "Thêm học sinh", exact: true }).click();
  const dialog = page.getByRole("dialog"); await dialog.getByLabel("Họ tên", { exact: true }).fill("Vũ Quốc Việt"); await expect(dialog.getByLabel("ID", { exact: true })).toHaveValue("vq.viet");
  await dialog.getByLabel("ID", { exact: true }).fill("HV1001"); await dialog.getByRole("button", { name: "Kiểm tra trùng" }).click(); await expect(dialog.getByText(/ID đã dùng/)).toBeVisible();
  await dialog.getByLabel("ID", { exact: true }).fill("custom.viet"); await dialog.getByLabel("Họ tên", { exact: true }).fill("Vũ Quốc Việt realtime"); await dialog.getByRole("button", { name: "Kiểm tra trùng" }).click(); await expect(dialog.getByText(/ID có thể sử dụng/)).toBeVisible(); await expect(dialog.getByLabel("ID", { exact: true })).toHaveValue("custom.viet");
  await save(page);
  await expect(other.getByText("custom.viet", { exact: true })).toBeVisible(); await expect(other.getByText(/Tác vụ đã hoàn tất/)).toBeVisible();
  await other.close();
});
test("class ID suggestion is editable and changing name keeps class ID", async ({ page }) => {
  if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") await installHttpFixture(page);
  await login(page); await go(page, "/manage/list/?entity=classes"); await page.getByRole("button", { name: "Thêm lớp học", exact: true }).click();
  const dialog = page.getByRole("dialog"); await expect(dialog.getByLabel("ID", { exact: true })).toHaveValue("ess21"); await expect(dialog.getByLabel("ID", { exact: true })).toBeEnabled();
  await dialog.getByLabel("Hậu tố tên lớp").fill("a1"); await dialog.getByLabel("Lịch học").fill("Thứ 3 · 18:00"); await save(page);
  await go(page, "/manage/profile/?entity=classes&id=ess21"); await expect(page.getByRole("heading", { name: "ess21-a1", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Hồ sơ & quan hệ", exact: true }).click();
  await page.getByRole("button", { name: "Chỉnh sửa hồ sơ / trạng thái" }).click(); await dialog.getByLabel("Tên", {exact:true}).fill("ess21-b2"); await save(page); await expect(page.getByRole("heading", { name: "ess21-b2", exact: true })).toBeVisible();
});
