import { test, expect, type Page } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const go = (page: Page, path: string) => page.goto(`${base}${path}`);
async function login(page: Page, id = "GV0001") {
  await go(page, "/login/");
  await page.getByLabel("ID giảng viên").fill(id);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/home\//);
}
const table = (page: Page) =>
  page.getByRole("table", { name: "Danh sách học sinh của lớp" });
async function studentMenu(page: Page) {
  await page
    .getByRole("button", { name: "Thao tác học sinh Hữu Văn", exact: true })
    .click();
}
async function tabs(page: Page) {
  await expect(page.getByRole("tab")).toHaveText([
    "Thread",
    "Tiến độ lớp",
    "Hồ sơ & quan hệ",
  ]);
}
test.beforeEach(async ({ page }) => {
  if (process.env.NEXT_PUBLIC_USE_MOCK !== "true")
    await installHttpFixture(page);
});

test("ba tab, tải phiên/học sinh khi mở và menu không điều hướng nhầm", async ({
  page,
}) => {
  await login(page);
  const requests: string[] = [];
  page.on("request", (r) => requests.push(new URL(r.url()).pathname));
  await go(page, "/class/?classId=class-green");
  await tabs(page);
  await expect(
    page.getByRole("tab", { name: "Thread", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("heading", { name: "Thread lớp học" }),
  ).toBeVisible();
  expect(
    requests.filter((p) =>
      /\/classes\/class-green\/(sessions|students)$/.test(p),
    ),
  ).toEqual([]);
  await page.getByRole("tab", { name: "Tiến độ lớp" }).click();
  await expect(page.getByText("2/8 Unit · 25%", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Mở phiên", exact: true }),
  ).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Tạo phiên học", exact: true }),
  ).toBeEnabled();
  expect(
    requests.filter((p) => p.endsWith("/classes/class-green/sessions")),
  ).toHaveLength(1);
  expect(
    requests.filter((p) => p.endsWith("/classes/class-green/students")),
  ).toHaveLength(0);
  await page.getByRole("tab", { name: "Hồ sơ & quan hệ" }).click();
  await expect(table(page).getByRole("columnheader")).toHaveText([
    "ID",
    "Họ tên",
    "Biệt danh",
    "Ngày sinh",
    "Trạng thái",
    "Thao tác",
  ]);
  expect(
    requests.filter((p) => p.endsWith("/classes/class-green/students")),
  ).toHaveLength(1);
  await studentMenu(page);
  await expect(page.getByRole("menuitem")).toHaveText([
    "Báo cáo học tập",
    "Chỉnh sửa thông tin học sinh",
    "Cập nhật trạng thái",
  ]);
  await expect(
    page.getByRole("menuitem", { name: "Cập nhật trạng thái" }),
  ).toBeDisabled();
  await page
    .getByRole("menuitem", { name: "Chỉnh sửa thông tin học sinh" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/class\//);
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.getByRole("tab", { name: "Tiến độ lớp" }).click();
  await page.getByRole("tab", { name: "Hồ sơ & quan hệ" }).click();
  expect(
    requests.filter((p) =>
      /\/classes\/class-green\/(sessions|students)$/.test(p),
    ),
  ).toHaveLength(2);
});

test("dòng học sinh mở hồ sơ, reload đường dẫn tĩnh và chặn học sinh ngoài lớp", async ({
  page,
}) => {
  await login(page);
  await go(page, "/class/?classId=class-green&tab=profile");
  const row = table(page).getByRole("row", {
    name: "Xem hồ sơ Hữu Văn",
    exact: true,
  });
  await row.getByRole("cell", { name: "Bon", exact: true }).click();
  await expect(page).toHaveURL(
    /\/student\/\?classId=class-green&studentId=HV1001/,
  );
  await expect(
    page.getByRole("heading", { name: "Hữu Văn", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Chỉnh sửa thông tin học sinh" }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hữu Văn", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "← Hồ sơ lớp học" }).click();
  await expect(
    page.getByRole("tab", { name: "Hồ sơ & quan hệ" }),
  ).toHaveAttribute("aria-selected", "true");
  await table(page)
    .getByRole("row", { name: "Xem hồ sơ Minh Anh", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Minh Anh", exact: true }),
  ).toBeVisible();
  await go(page, "/student/?classId=class-green&studentId=HV2001");
  await expect(
    page.getByText(
      "Học sinh không thuộc lớp này hoặc không còn dữ liệu hồ sơ.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Chỉnh sửa thông tin học sinh" }),
  ).toHaveCount(0);
});

test("quản lý xem tiến độ, menu cập nhật trạng thái dùng preview và giữ thông tin khác", async ({
  page,
}) => {
  await login(page, "MG0001");
  await go(page, "/manage/profile/?entity=classes&id=class-green");
  await tabs(page);
  await expect(
    page.getByRole("button", { name: "Chỉnh sửa hồ sơ / trạng thái" }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Tiến độ lớp" }).click();
  await expect(
    page.getByRole("button", { name: "Tạo phiên học" }),
  ).toBeDisabled();
  await expect(page.getByText("2/8 Unit · 25%", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Hồ sơ & quan hệ" }).click();
  await expect(
    page.getByRole("button", { name: "Chỉnh sửa hồ sơ / trạng thái" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Xem phiên học, schema, điểm & báo cáo" }),
  ).toHaveCount(0);
  await studentMenu(page);
  await page.getByRole("menuitem", { name: "Cập nhật trạng thái" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("textbox", { name: "Họ tên", exact: true }),
  ).toHaveCount(0);
  await dialog.getByLabel("Trạng thái", { exact: true }).click();
  await page.getByRole("option", { name: "Tạm dừng", exact: true }).click();
  const pending = page.waitForRequest(
    (r) =>
      r.url().includes("/manager/changes/preview") && r.method() === "POST",
  );
  await dialog.getByRole("button", { name: /xem trước/i }).click();
  const request = await pending;
  expect(request.postDataJSON()).toMatchObject({
    entity: "students",
    mode: "UPDATE",
    clearFields: [],
    rows: [{ id: "HV1001", status: "PAUSED", version: 1 }],
  });
  expect(Object.keys(request.postDataJSON().rows[0]).sort()).toEqual([
    "id",
    "status",
    "version",
  ]);
  await expect(
    dialog.getByRole("button", { name: "Xác nhận cập nhật 1 bản ghi" }),
  ).toBeVisible();
  for (const c of await dialog.getByRole("checkbox").all())
    if (await c.isEnabled()) await c.check();
  await dialog
    .getByRole("textbox", { name: /Lý do thay đổi|Lý do \/ ghi chú/ })
    .fill("Tạm dừng hồ sơ sau khi kiểm tra ảnh hưởng");
  await dialog
    .getByRole("button", { name: "Xác nhận cập nhật 1 bản ghi" })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    table(page).getByRole("row", { name: "Xem hồ sơ Hữu Văn", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Hiện ghi danh đã kết thúc / hoàn thành" })
    .click();
  const row = table(page).getByRole("row", {
    name: "Xem hồ sơ Hữu Văn",
    exact: true,
  });
  await expect(
    row.getByRole("cell", { name: "Bon", exact: true }),
  ).toBeVisible();
  await row.getByRole("cell", { name: "Bon", exact: true }).click();
  await expect(page).toHaveURL(/entity=students&id=HV1001/);
  await expect(
    page.getByRole("heading", { name: "Hữu Văn", exact: true }),
  ).toBeVisible();
});

test("đường dẫn lớp của quản lý resolve ID công khai, mobile và giao diện tối", async ({
  page,
}) => {
  await login(page, "MG0001");
  // The teacher Class DTO uses an opaque key; manager detail requires the public ID returned by /access.
  if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
    await page.route(
      "**/classes/00000000-0000-4000-8000-000000000020/access",
      async (route) => {
        await route.fulfill({
          json: {
            data: {
              classId: "class-green",
              canView: true,
              assignmentStatus: null,
              assignmentConfirmed: false,
              profileStatus: "ACTIVE",
              accountStatus: "ACTIVE",
              classStatus: "ACTIVE",
            },
          },
        });
      },
    );
  }
  await go(
    page,
    `/class/?classId=${process.env.NEXT_PUBLIC_USE_MOCK === "true" ? "class-green" : "00000000-0000-4000-8000-000000000020"}&tab=profile`,
  );
  await tabs(page);
  await expect(table(page)).toBeVisible();
  await page.getByRole("button", { name: "Giao diện", exact: true }).click();
  await page.getByRole("menuitem", { name: "Tối", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    table(page).getByRole("row", { name: "Xem hồ sơ Hữu Văn", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/class-profile-mobile-dark.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Hồ sơ & quan hệ" }),
  ).toHaveAttribute("aria-selected", "true");
});
