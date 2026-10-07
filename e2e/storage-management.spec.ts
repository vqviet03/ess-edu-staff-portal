import { test, expect } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import type { Storage, MaterialFile } from "../src/features/materials/models";
const api = process.env.NEXT_PUBLIC_API_BASE_URL!, base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
test("manager adds a private drive, browses its files and queues transfer on mobile", async ({ page }) => {
  await installHttpFixture(page);
  const drives: Storage[] = [{ id: "DOCUMENTS", name: "Văn bản", category: "DOCUMENTS", lifecycle: "ACTIVE", configured: true, version: 1, totalBytes: 4.5e9, usedBytes: 1200, reservedBytes: 0, remainingBytes: 4.5e9 - 1200, percentage: 0, status: "LOW", maxUploadBytes: 1e8, largeFileWarningBytes: 2e7 }];
  const file: MaterialFile = { id: "84d5e195-f865-43f3-bb32-d6122f74301f", publicId: "MAT21", originalName: "Bài học.pdf", displayName: "Bài học.pdf", mimeType: "application/pdf", sizeBytes: 1000, thumbnailBytes: 200, storageBytes: 1200, thumbnailUrl: null, folderId: null, authorId: "staff-internal", authorName: "Giảng viên", uploadedBy: "staff-internal", uploadSource: "library", sourceSessionId: null, sourcePostId: null, storageId: "DOCUMENTS", status: "AVAILABLE", version: 2, createdAt: "2026-10-07T00:00:00Z", updatedAt: "2026-10-07T00:00:00Z" };
  let moves = 0, jobs: unknown[] = [];
  const data = (value: unknown) => JSON.stringify({ data: value });
  await page.route(`${api}/storages**`, async route => {
    const req = route.request();
    if (req.method() === "POST") { const body = req.postDataJSON(); expect(body.connection.secretAccessKey).toBe("fake-secret-storage-key"); drives.push({ ...drives[0], id: body.publicId, name: body.name, category: body.category, usedBytes: 0, remainingBytes: body.capacityBytes, totalBytes: body.capacityBytes, version: 2 }); await route.fulfill({ contentType: "application/json", body: data({ id: body.publicId, version: 2 }) }); }
    else await route.fulfill({ contentType: "application/json", body: data({ items: drives, nextCursor: null, configurationEnabled: true }) });
  });
  await page.route(`${api}/material-folders**`, route => route.fulfill({ contentType: "application/json", body: data({ items: [], nextCursor: null }) }));
  await page.route(`${api}/materials**`, async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.endsWith("/storage-transfers")) {
      if (request.method() === "POST") { const body = request.postDataJSON(); expect(body.ids).toEqual([file.id]); expect(body.targetStorageId).toBe("DOC2"); expect(body.versions[file.id]).toBe(2); moves++; jobs = [{ id: "internal-job", version: 1, filePublicId: "MAT21", fileName: file.displayName, fromStorageId: "DOCUMENTS", toStorageId: "DOC2", status: "PENDING", switched: false, attempts: 0, lastError: null }]; await route.fulfill({ contentType: "application/json", body: data({ status: "IN_PROGRESS", count: 1 }) }); }
      else await route.fulfill({ contentType: "application/json", body: data({ items: jobs, nextCursor: null }) });
    } else await route.fulfill({ contentType: "application/json", body: data({ items: url.searchParams.get("storageId") === "DOC2" ? [] : [file], nextCursor: null }) });
  });
  await page.goto(`${base}/login/`); await page.getByLabel("ID giảng viên").fill("MG0001"); await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click(); await expect(page).toHaveURL(/\/home\//);
  await page.goto(`${base}/storages/`); await page.getByRole("button", { name: "Thêm ổ Neon" }).click();
  const editor = page.getByRole("dialog"); await editor.getByLabel("Mã ổ công khai").fill("DOC2"); await editor.getByLabel("Tên ổ").fill("Văn bản bổ sung");
  await editor.getByLabel("Neon S3 endpoint (HTTPS)").fill("https://br-demo.storage.c-3.ap-southeast-1.aws.neon.tech"); await editor.getByLabel("Bucket").fill("private-materials"); await editor.getByLabel("S3 Access Key ID").fill("fake-access-key"); await editor.getByLabel("S3 Secret Access Key").fill("fake-secret-storage-key"); await editor.getByLabel("Lý do / nhật ký").fill("Thêm dung lượng"); await editor.getByRole("button", { name: "Lưu cấu hình" }).click(); await expect(page.getByText("Đã lưu cấu hình storage.")).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))).not.toContain("fake-secret-storage-key");
  await page.getByRole("button", { name: "Xem file", exact: true }).first().click(); const browser = page.getByRole("dialog"); await expect(browser.getByText("PDF · MAT21")).toBeVisible(); await expect(browser.getByText(file.id, { exact: false })).toHaveCount(0);
  await browser.getByRole("checkbox", { name: "Chọn Bài học.pdf" }).check(); await browser.getByRole("button", { name: "Chuyển sang ổ khác" }).click();
  const transfer = page.getByRole("dialog").filter({ has: page.getByText("Chuyển file sang ổ khác", { exact: true }) }); await transfer.getByLabel("Ổ đích cùng nhóm").click(); await page.getByRole("option", { name: /Văn bản bổ sung/ }).click(); await transfer.getByLabel("Lý do chuyển").fill("Cân bằng dung lượng"); page.on("dialog", dialog => void dialog.accept()); await transfer.getByRole("button", { name: "Xác nhận chuyển" }).click(); await expect(browser.getByText("Đã xếp hàng chuyển file.", { exact: false })).toBeVisible(); expect(moves).toBe(1);
  await page.setViewportSize({ width: 375, height: 812 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy(); await browser.locator(".MuiDialogActions-root").getByRole("button", { name: "Đóng", exact: true }).click(); await expect(page.getByText("Đang chờ chuyển", { exact: false })).toBeVisible();
});
test("settings missing migration shows guidance without requesting proposals", async ({ page }) => {
  await installHttpFixture(page); let requests = 0;
  await page.route(`${api}/application-settings`, route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { appName: "ESS", classIdPrefix: "ess", version: 1, schemaReady: false } }) }));
  page.on("request", r => { if (r.url().includes("/settings/proposals")) requests++; });
  await page.goto(`${base}/login/`); await page.getByLabel("ID giảng viên").fill("MG0001"); await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click(); await expect(page).toHaveURL(/\/home\//);
  await page.goto(`${base}/manage/settings/`); await expect(page.getByText("Cấu hình hệ thống chưa sẵn sàng.", { exact: false })).toBeVisible(); expect(requests).toBe(0); await expect(page.getByRole("button", { name: "Gửi đề xuất thay đổi" })).toHaveCount(0);
});
