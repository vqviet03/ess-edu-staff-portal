import { test, expect } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import { defaultContent } from "../src/features/introduction/models";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
test("manager edits the same landing layout, saves draft separately and explicitly publishes", async ({
  page,
}) => {
  await installHttpFixture(page);
  let value = {
    content: defaultContent,
    version: 0,
    published: false,
    publishedAt: null as string | null,
  };
  const writes: string[] = [];
  await page.route("**/v1/introduction/**", (r) => {
    const req = r.request();
    if (req.method() === "OPTIONS")
      return r.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization,content-type,x-workspace",
          "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
        },
      });
    if (req.method() === "PUT") {
      const body = req.postDataJSON();
      expect(body.version).toBe(value.version);
      value = { ...value, content: body.content, version: value.version + 1 };
      writes.push("draft");
    }
    if (req.method() === "POST") {
      expect(req.postDataJSON().version).toBe(value.version);
      value = {
        ...value,
        published: true,
        publishedAt: "2026-10-16T00:00:00Z",
        version: value.version + 1,
      };
      writes.push("publish");
    }
    return r.fulfill({
      headers: { "Access-Control-Allow-Origin": "*" },
      json: { data: value },
    });
  });
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill("MG0001");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/home\//);
  await page.goto(`${base}/manage/introduction/`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Vững tiếng Anh.",
  );
  await expect(
    page.getByRole("button", { name: "Lưu nháp", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Chỉnh sửa nội dung", exact: true })
    .click();
  await page.getByRole("heading", { level: 1 }).click();
  await page
    .getByRole("dialog", { name: "Sửa nội dung" })
    .getByRole("textbox")
    .fill("Tiếng Anh cùng EES");
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tiếng Anh cùng EES",
  );
  expect(writes).toEqual([]);
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(
    page.getByText("Đã lưu bản nháp.", { exact: true }),
  ).toBeVisible();
  expect(writes).toEqual(["draft"]);
  await page.getByRole("button", { name: "Công bố", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(
    page.getByText("Đã cập nhật trạng thái công bố.", { exact: true }),
  ).toBeVisible();
  expect(writes).toEqual(["draft", "publish"]);
});
