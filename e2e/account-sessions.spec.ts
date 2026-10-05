import { test, expect, type Page } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import { seed, type Database } from "../src/mock/fixtures";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const go = (page: Page, path: string) => page.goto(base + path);
async function login(page: Page, id = "MG0001") {
  await go(page, "/login/"); await page.getByLabel("ID giảng viên").fill(id); await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click(); await expect(page).toHaveURL(/\/home\//);
}
test("Quản lý đặt thời hạn, thu hồi phiên qua realtime và giảng viên đăng nhập lại được", async ({ page, browser }) => {
  let value = JSON.stringify(seed()); const shared = { get: () => value, set: (next: string) => { value = next; } };
  await installHttpFixture(page, shared); const context = await browser.newContext(); const teacher = await context.newPage(); await installHttpFixture(teacher, shared);
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message)); teacher.on("pageerror", (e) => errors.push(e.message));
  await login(teacher, "GV0001"); await login(page); await go(page, "/manage/profile/?entity=teachers&id=GV0001");
  await expect(page.getByRole("heading", { name: "Phiên đăng nhập" })).toBeVisible(); await expect(page.getByText("1 phiên còn hiệu lực", { exact: false })).toBeVisible();
  await page.getByRole("checkbox", { name: "Dùng thời hạn mặc định của hệ thống" }).uncheck(); await page.getByLabel("Thời hạn phiên (phút)").fill("7"); await page.getByLabel("Lý do thay đổi thời hạn").fill("Đặt thời hạn kiểm thử");
  await page.getByRole("button", { name: "Lưu thời hạn phiên", exact: true }).click(); await expect(page.getByText("Thời hạn: 7 phút", { exact: false })).toBeVisible(); await expect(teacher).toHaveURL(/\/home\//);
  await page.getByRole("button", { name: "Buộc kết thúc tất cả phiên", exact: true }).click(); const dialog = page.getByRole("dialog"); await dialog.getByLabel("Lý do kết thúc phiên").fill("Yêu cầu đăng nhập lại"); await dialog.getByRole("button", { name: "Xác nhận kết thúc phiên" }).click(); await expect(dialog).not.toBeVisible();
  await expect(teacher).toHaveURL(/\/login\//); expect(await teacher.evaluate(() => sessionStorage.getItem("learnleaf.staff.auth"))).toBeNull(); await expect(page.getByText("0 phiên còn hiệu lực", { exact: false })).toBeVisible();
  await login(teacher, "GV0001"); const expiresAt = await teacher.evaluate(() => JSON.parse(sessionStorage.getItem("learnleaf.staff.auth")!).expiresAt as string); expect(Math.abs(Date.parse(expiresAt) - Date.now() - 420000)).toBeLessThan(10000);
  expect((JSON.parse(value) as Database).management!.accounts.find((a) => a.id === "acc-GV0001")!.status).toBe("ACTIVE"); expect(errors).toEqual([]); await context.close();
});
test("Mobile tối: bảo vệ MANAGER, giữ form khi version conflict và cảnh báo chưa lưu", async ({ page }) => {
  let value = JSON.stringify(seed()); const shared = { get: () => value, set: (next: string) => { value = next; } }; await installHttpFixture(page, shared);
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: "dark" }); await login(page); await go(page, "/manage/profile/?entity=accounts&id=acc-BOTH0001");
  await expect(page.getByRole("button", { name: "Buộc kết thúc tất cả phiên" })).toBeDisabled(); await expect(page.getByText("Tài khoản có vai trò MANAGER được bảo vệ", { exact: false })).toBeVisible();
  await page.getByRole("checkbox", { name: "Dùng thời hạn mặc định của hệ thống" }).uncheck(); await page.getByLabel("Thời hạn phiên (phút)").fill("15"); await page.getByLabel("Lý do thay đổi thời hạn").fill("Thời hạn mới");
  const db = JSON.parse(value) as Database; db.management!.accounts.find((a) => a.id === "acc-BOTH0001")!.version++; value = JSON.stringify(db);
  await page.getByRole("button", { name: "Lưu thời hạn phiên", exact: true }).click(); await expect(page.getByText("Dữ liệu đã thay đổi.", { exact: false })).toBeVisible(); await expect(page.getByLabel("Thời hạn phiên (phút)")).toHaveValue("15");
  page.once("dialog", async (dialog) => { expect(dialog.message()).toContain("chưa lưu"); await dialog.dismiss(); }); await page.getByRole("link", { name: "← Danh sách" }).click(); await expect(page).toHaveURL(/acc-BOTH0001/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
