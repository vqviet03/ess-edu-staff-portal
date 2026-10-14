import { test, expect } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
test("nested class/session pages restore the originating tab after reload and back", async ({
  page,
}) => {
  await installHttpFixture(page);
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill("GV0001");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/home\//);
  await page.goto(`${base}/class/?classId=class-green`);
  await page.getByRole("tab", { name: "Tiến độ lớp", exact: true }).click();
  await expect(page).toHaveURL(/\/class\/progress\/\?classId=class-green/);
  await expect(
    page.getByRole("link", { name: "Tổng quan", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const origin = page.url();
  await page.locator('a[href*="sessionId=session-3"]').click();
  await expect(
    page.getByRole("tab", { name: "Tài liệu", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Bài kiểm tra", exact: true }).click();
  await expect(page).toHaveURL(/\/session\/assessments\//);
  await page
    .getByRole("link", { name: "Nhập điểm dạng bảng", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("table", { name: "Bảng nhập điểm" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("link", { name: "Quay lại", exact: true }).click();
  await expect(page).toHaveURL(/\/session\/assessments\//);
  await expect(
    page.getByRole("tab", { name: "Bài kiểm tra", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("link", { name: "Quay lại", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Tài liệu", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("link", { name: "Quay lại", exact: true }).click();
  await expect(page).toHaveURL(origin);
  await expect(
    page.getByRole("tab", { name: "Tiến độ lớp", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});
test("student profile report tab has its own static URL and survives browser back/forward", async ({
  page,
}) => {
  await installHttpFixture(page);
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill("GV0001");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/home\//);
  await page.goto(`${base}/student/?classId=class-green&studentId=HV1001`);
  await page.getByRole("tab", { name: "Báo cáo học tập", exact: true }).click();
  await expect(page).toHaveURL(/\/student\/report\//);
  await page.getByRole("tab", { name: "Thông tin", exact: true }).click();
  await expect(page).toHaveURL(/\/student\/info\//);
  await page.goBack();
  await expect(
    page.getByRole("tab", { name: "Báo cáo học tập", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.goForward();
  await expect(
    page.getByRole("tab", { name: "Thông tin", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

test("creating an assessment from materials opens its editor on the assessments page", async ({
  page,
}) => {
  await installHttpFixture(page);
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill("GV0001");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/home\//);
  await page.goto(
    `${base}/session/materials/?classId=class-green&sessionId=session-3`,
  );
  await page
    .getByRole("button", { name: "Tạo bài đánh giá", exact: true })
    .click();
  await expect(page).toHaveURL(/\/session\/assessments\/.*createAssessment=1/);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).not.toHaveURL(/createAssessment/);
});
