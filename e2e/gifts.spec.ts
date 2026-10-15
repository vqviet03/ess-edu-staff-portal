import { test, expect } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
const catalog = {
  id: "catalog-test",
  name: "Quà động viên",
  description: "Cùng nhau cố gắng mỗi ngày",
  ownerId: "teacher-test",
  ownerName: "Cô Mai",
  status: "ACTIVE",
  version: 1,
  classIds: ["class-green"],
  managerIds: [],
  canManage: true,
  canManageMembers: true,
};
const gift = {
  id: "gift-test",
  catalogId: catalog.id,
  name: "Gấu bông pastel",
  description: "Món quà từ những nỗ lực",
  category: "Đồ chơi",
  points: 20,
  available: 3,
  reserved: 0,
  status: "ACTIVE",
  version: 1,
  fileIds: [],
  favorite: false,
};
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test(`gift management stays usable at ${viewport.width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await installHttpFixture(page);
    const writes: unknown[] = [];
    await page.route(/\/v1\/reward-gifts(?:\/|\?|$)/, async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname.split("/reward-gifts")[1];
      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization,content-type,x-workspace,idempotency-key",
        "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
      };
      if (request.method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      let data: unknown = [];
      if (path === "/options")
        data = {
          classes: [{ id: "class-green", name: "EES20-A1" }],
          teachers: [],
        };
      else if (path.endsWith("/statistics"))
        data = { gifts: 1, available: 3, reserved: 0, classes: 1 };
      else if (path.endsWith("/categories")) data = ["Đồ chơi"];
      else if (path.endsWith("/visibility")) {
        if (request.method() === "PUT") writes.push(request.postDataJSON());
        data = writes.length
          ? [{ giftId: gift.id, classId: "class-green" }]
          : [];
      } else if (path === "")
        data = { items: [gift], total: 1, page: 1, pageSize: 20 };
      else if (path === `/catalogs/${catalog.id}`) data = catalog;
      else if (path === "/catalogs")
        data = { items: [catalog], total: 1, page: 1, pageSize: 20 };
      return route.fulfill({ headers, json: { data } });
    });
    await page.goto(`${base}/login/`);
    await page.getByLabel("ID giảng viên").fill("MG0001");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/home/);
    await page.goto(`${base}/rewards/catalogs/?id=${catalog.id}`);
    await expect(
      page.getByRole("heading", { name: catalog.name }),
    ).toBeVisible();
    await expect(page.getByText(gift.name, { exact: true })).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`gifts-${viewport.width}.png`),
      fullPage: true,
    });
    await page.getByRole("tab", { name: "Lớp & hiển thị" }).click();
    const check = page.getByRole("checkbox", {
      name: `${gift.name} tại EES20-A1`,
    });
    await check.click();
    await expect.poll(() => writes.length).toBe(1);
    await expect(check).toBeChecked();
    expect(writes[0]).toEqual([{ classId: "class-green", visible: true }]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
