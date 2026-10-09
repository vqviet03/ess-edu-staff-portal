import { test, expect, type Locator, type Page } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import { vietnamToday } from "../src/features/rewards/models";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const skillCodes = ["vocabulary", "grammar", "pronunciation", "listening", "reading", "speaking", "writing"];
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type,accept,x-workspace", "Access-Control-Allow-Methods": "GET,OPTIONS" };
async function login(page: Page) {
  await page.goto(base + "/login/");
  await page.getByLabel("ID giảng viên").fill("GV0001");
  await page.getByLabel("Mật khẩu", {exact:true}).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/home\//);
}
async function exerciseZoom(page: Page, chart: Locator) {
  const region = chart.getByTestId("chart-scroll-region");
  const surface = chart.getByTestId("chart-surface");
  await expect.poll(() => region.evaluate(el => el.scrollWidth - el.clientWidth)).toBeGreaterThan(1);
  const size = await surface.boundingBox();
  expect(size).not.toBeNull();
  await chart.getByRole("button", { name: "Phóng to chiều ngang", exact: true }).click();
  await expect(chart.getByLabel("Mức zoom ngang")).toHaveText("125%");
  await expect.poll(async () => (await surface.boundingBox())!.width).toBeGreaterThan(size!.width);
  expect((await surface.boundingBox())!.height).toBe(size!.height);
  await region.hover();
  await page.mouse.wheel(280, 0);
  await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await chart.getByRole("button", { name: "Đặt lại zoom biểu đồ", exact: true }).click();
  await expect(chart.getByLabel("Mức zoom ngang")).toHaveText("100%");
  await expect.poll(async () => (await surface.boundingBox())!.width).toBe(size!.width);
  await chart.getByRole("button", { name: "Thu nhỏ chiều ngang", exact: true }).click();
  await expect(chart.getByLabel("Mức zoom ngang")).toHaveText("75%");
  await chart.getByRole("button", { name: "Đặt lại zoom biểu đồ", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
test("Unit curves and change charts scroll on narrow screens, zoom without losing points or fetching", async ({ page }, info) => {
  await installHttpFixture(page);
  await page.route("**/v1/**/progress", async route => {
    if (route.request().method() === "OPTIONS") return route.fulfill({status:204, headers});
    const items = Array.from({length:6}, (_, i) => ({
      unitId:`u${i+1}`, unitOrder:i+1, unitName:`Unit ${i+1}`, totalPercentage:50+i,
      skills:Object.fromEntries(skillCodes.map(code => [code, 50+i])),
    }));
    await route.fulfill({status:200, headers, json:{data:{items}}});
  });
  await page.setViewportSize({width:390,height:844});
  await login(page);
  await page.goto(base + "/reports/?classId=class-green&studentId=HV1001");
  await page.getByRole("heading", {name:/Biểu đồ tiến độ theo kỹ năng/}).scrollIntoViewIfNeeded();
  const chart = page.getByTestId("skills-chart");
  await chart.scrollIntoViewIfNeeded();
  await expect(chart.locator(".recharts-line-curve")).toHaveCount(7);
  await expect(chart.locator(".recharts-line-dots").first().locator("circle")).toHaveCount(6);
  await expect(chart.getByRole("application")).toContainText("Unit 6");
  let requests = 0;
  page.on("request", request => { if (request.url().includes("/v1/")) requests++; });
  await exerciseZoom(page, chart);
  await page.screenshot({path:info.outputPath("chart-mobile-scroll-zoom.png")});
  await page.getByRole("heading", {name:"Thay đổi điểm theo từng kỹ năng qua các Unit",exact:true}).scrollIntoViewIfNeeded();
  const comparison = page.getByTestId("change-chart").first();
  await comparison.scrollIntoViewIfNeeded();
  await expect(comparison.locator(".recharts-label-list text")).toHaveCount(5);
  await exerciseZoom(page, comparison);
  await page.setViewportSize({width:1440,height:1000});
  await expect.poll(() => chart.getByTestId("chart-scroll-region").evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await expect(chart.locator(".recharts-line-curve")).toHaveCount(7);
  await page.clock.install(); await page.clock.fastForward(60000);
  expect(requests).toBe(0);
});
test("daily reward chart retains all dates, lines and tooltip values while scrolling and zooming", async ({ page }) => {
  await installHttpFixture(page);
  const points = Array.from({length:30}, (_, i) => ({
    date:new Date(Date.UTC(2026, 8, i+1)).toISOString().slice(0,10), attendance:"PRESENT",
    dailyEarned:1, dailyPenalty:0, dailySpent:0, earned:i+1, penalty:0, net:i+1, balance:i+1,
  }));
  await page.route("**/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (!/reward-classes$|\/rewards(?:\/history|\/activities)?$/.test(path)) return route.fallback();
    if (route.request().method() === "OPTIONS") return route.fulfill({status:204,headers});
    const data = path.endsWith("reward-classes") ? [{id:"class-green",name:"Juniors 03"}]
      : path.endsWith("history") || path.endsWith("activities") ? {items:[],total:0,page:1,pageSize:20}
      : {classId:"class-green",studentId:"HV1001",todayDate:vietnamToday(),attendance:"PRESENT",todayProgress:0,
        totals:{earned:30,penalty:0,spent:0,net:30,balance:30},today:{earned:0,penalty:0,spent:0,net:0,balance:0},
        chart:points,activities:[],activityCount:0};
    await route.fulfill({status:200,headers,json:{data}});
  });
  await page.setViewportSize({width:390,height:844});
  await login(page);
  await page.goto(base + "/student/?classId=class-green&studentId=HV1001&tab=rewards");
  const chart = page.getByTestId("chart-viewport");
  await chart.scrollIntoViewIfNeeded();
  await expect(chart.locator(".recharts-line")).toHaveCount(4);
  await expect(chart.locator(".recharts-line-dots").first().locator("circle")).toHaveCount(30);
  await exerciseZoom(page, chart);
  const region = chart.getByTestId("chart-scroll-region");
  await region.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  await page.mouse.move(0, 0);
  await chart.locator(".recharts-line-dots").last().locator("circle").last().hover();
  await expect(chart.locator(".recharts-tooltip-wrapper")).toContainText("30/09/2026");
  await expect(chart.locator(".recharts-tooltip-wrapper")).toContainText("Đã nhận: 30");
  await page.getByRole("button", {name:"Vi phạm",exact:true}).click();
  await expect(chart.locator(".recharts-line")).toHaveCount(3);
});
