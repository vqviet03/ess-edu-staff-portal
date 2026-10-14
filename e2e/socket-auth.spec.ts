import { test, expect } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
async function login(page: import("@playwright/test").Page) {
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill("MG0001");
  await page.locator('input[autocomplete="current-password"]').fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/home\//);
}
const meUrl = process.env.NEXT_PUBLIC_API_BASE_URL! + "/auth/me";
const connections = (fixture: Awaited<ReturnType<typeof installHttpFixture>>) =>
  fixture.connectionCounts().connections;

test("socket rejection verifies HTTP auth once and does not log out or loop when session is valid", async ({
  page,
}) => {
  test.skip(
    process.env.NEXT_PUBLIC_USE_MOCK === "true",
    "Uses HTTP and WebSocket transport.",
  );
  const fixture = await installHttpFixture(page);
  fixture.rejectSocketAuth(10);
  let reads = 0;
  page.on("request", (r) => {
    if (r.method() === "GET" && r.url() === meUrl) reads++;
  });
  await page.clock.install();
  await login(page);
  await expect.poll(() => reads).toBe(1);
  await expect.poll(() => connections(fixture)).toBe(2);
  await page.clock.fastForward(60000);
  expect(reads).toBe(1);
  expect(connections(fixture)).toBe(2);
  await expect(page).toHaveURL(/\/home\//);
  expect(
    await page.evaluate(() => localStorage.getItem("learnleaf.staff.auth")),
  ).not.toBeNull();
});

test("socket rejection waits for API 401 before clearing session", async ({
  page,
}) => {
  test.skip(
    process.env.NEXT_PUBLIC_USE_MOCK === "true",
    "Uses HTTP and WebSocket transport.",
  );
  const fixture = await installHttpFixture(page);
  await login(page);
  await expect.poll(() => connections(fixture)).toBe(1);
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route(meUrl, async (route) => {
    await gate;
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        error: { code: "UNAUTHORIZED", message: "Phiên không hợp lệ." },
      }),
    });
  });
  const checked = page.waitForRequest(
    (r) => r.method() === "GET" && r.url() === meUrl,
  );
  fixture.disconnectUnauthorized();
  await checked;
  await expect(page).toHaveURL(/\/home\//);
  expect(
    await page.evaluate(() => localStorage.getItem("learnleaf.staff.auth")),
  ).not.toBeNull();
  finish();
  await expect(page).toHaveURL(/\/login\//);
  expect(
    await page.evaluate(() => localStorage.getItem("learnleaf.staff.auth")),
  ).toBeNull();
});

test("failed auth verification preserves login without repeated HTTP attempts", async ({
  page,
}) => {
  test.skip(
    process.env.NEXT_PUBLIC_USE_MOCK === "true",
    "Uses HTTP and WebSocket transport.",
  );
  const fixture = await installHttpFixture(page);
  await page.route(meUrl, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        error: { code: "UNAVAILABLE", message: "Tạm thời không khả dụng." },
      }),
    }),
  );
  fixture.rejectSocketAuth(10);
  let reads = 0;
  page.on("request", (r) => {
    if (r.method() === "GET" && r.url() === meUrl) reads++;
  });
  await page.clock.install();
  await login(page);
  await expect.poll(() => reads).toBe(1);
  await page.clock.fastForward(60000);
  expect(reads).toBe(1);
  expect(connections(fixture)).toBe(1);
  await expect(page).toHaveURL(/\/home\//);
  expect(
    await page.evaluate(() => localStorage.getItem("learnleaf.staff.auth")),
  ).not.toBeNull();
});
