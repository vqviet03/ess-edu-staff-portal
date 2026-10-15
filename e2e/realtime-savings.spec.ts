import { test, expect, type Page } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import { seed } from "../src/mock/fixtures";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
async function login(page: Page) {
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill("GV0001");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/home\//);
}
async function hidden(page: Page, value: boolean) {
  await page.evaluate((value) => {
    Object.defineProperty(document, "hidden", { configurable: true, value });
    document.dispatchEvent(new Event("visibilitychange"));
  }, value);
}
test("visible idle sleeps at ten minutes; waking consumes gesture and never polls HTTP", async ({
  page,
}) => {
  const fixture = await installHttpFixture(page);
  await page.clock.install();
  await login(page);
  await expect.poll(() => fixture.connectionCounts().active).toBe(1);
  await page.waitForTimeout(150);
  let reads = 0;
  page.on("request", (r) => {
    if (r.url().includes("/v1/") && r.method() !== "OPTIONS") reads++;
  });
  await page.clock.fastForward(9 * 60 * 1000);
  await expect(page.getByTestId("realtime-idle")).toHaveCount(0);
  await page.mouse.move(200, 200);
  await page.clock.fastForward(9 * 60 * 1000);
  await expect(page.getByTestId("realtime-idle")).toHaveCount(0);
  await page.clock.fastForward(60 * 1000 + 1);
  await expect(page.getByTestId("realtime-idle")).toBeVisible();
  await expect.poll(() => fixture.connectionCounts().active).toBe(0);
  expect(reads).toBe(0);
  await page.evaluate(() => {
    (window as unknown as { clicks: number }).clicks = 0;
    document.addEventListener("click", () => {
      (window as unknown as { clicks: number }).clicks++;
    });
  });
  await page.mouse.click(220, 220);
  await expect(page.getByTestId("realtime-idle")).toHaveCount(0);
  await expect.poll(() => fixture.connectionCounts().active).toBe(1);
  expect(
    await page.evaluate(() => (window as unknown as { clicks: number }).clicks),
  ).toBe(0);
});
test("hidden tabs stop immediately without blur and reset their visible idle deadline", async ({
  page,
}) => {
  const fixture = await installHttpFixture(page);
  await page.clock.install();
  await login(page);
  await expect.poll(() => fixture.connectionCounts().active).toBe(1);
  await hidden(page, true);
  await expect.poll(() => fixture.connectionCounts().active).toBe(0);
  await page.clock.fastForward(11 * 60 * 1000);
  await expect(page.getByTestId("realtime-idle")).toHaveCount(0);
  await hidden(page, false);
  await expect.poll(() => fixture.connectionCounts().active).toBe(1);
  await expect(page.getByTestId("realtime-idle")).toHaveCount(0);
});
test("same session/context shares one socket; owner hide hands over and events reach both tabs", async ({
  page,
  context,
}) => {
  await context.addInitScript(() =>
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    }),
  );
  let value = JSON.stringify(seed());
  const shared = {
    get: () => value,
    set: (next: string) => {
      value = next;
    },
  };
  const first = await installHttpFixture(page, shared);

  await login(page);
  const secondPage = await context.newPage();
  const second = await installHttpFixture(secondPage, shared);
  await secondPage.goto(`${base}/home/`);
  await expect(secondPage).toHaveURL(/\/home\//);
  const active = () =>
    first.connectionCounts().active + second.connectionCounts().active;
  await expect.poll(active).toBe(1);
  // Wait until the follower participates in the elected transport (not just initial load).
  await expect(
    secondPage.getByRole("link", { name: /^Thông báo/ }),
  ).toBeVisible();
  const notice = {
    id: "shared-notice",
    type: "MATERIAL" as const,
    title: "Bài mới qua kết nối chung",
    href: "/materials/",
    isRead: false,
    version: 1,
    createdAt: new Date().toISOString(),
  };
  first.pushNotice(notice);
  second.pushNotice(notice);
  await expect(
    page.getByRole("link", { name: "Thông báo (1)", exact: true }),
  ).toBeVisible();
  await expect(
    secondPage.getByRole("link", { name: "Thông báo (1)", exact: true }),
  ).toBeVisible();
  const owner = first.connectionCounts().active ? page : secondPage;
  await hidden(owner, true);
  await expect.poll(active).toBe(1);
  expect(
    owner === page
      ? first.connectionCounts().active
      : second.connectionCounts().active,
  ).toBe(0);
  await hidden(page, true);
  await hidden(secondPage, true);
  await expect.poll(active).toBe(0);
  await secondPage.close();
});
test("browsers without sharing APIs still close dedicated sockets while hidden", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: undefined,
    }),
  );
  const fixture = await installHttpFixture(page);
  await login(page);
  await expect.poll(() => fixture.connectionCounts().active).toBe(1);
  await hidden(page, true);
  await expect.poll(() => fixture.connectionCounts().active).toBe(0);
  await hidden(page, false);
  await expect.poll(() => fixture.connectionCounts().active).toBe(1);
});
