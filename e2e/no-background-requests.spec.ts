import { test, expect } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
test("background closes the socket; foreground replays saved notices without HTTP polling", async ({page}) => {
  test.skip(process.env.NEXT_PUBLIC_USE_MOCK === "true", "Checks the real transport lifecycle.");
  const fixture = await installHttpFixture(page);
  const requests: string[] = [];
  page.on("request", request => { if(new URL(request.url()).hostname === "api.example.com" && request.method() !== "OPTIONS") requests.push(request.url()); });
  await page.goto(`${base}/login/`); await page.getByLabel("ID giảng viên").fill("GV0001");
  await page.getByLabel("Mật khẩu", {exact:true}).fill("Demo123!"); await page.getByRole("button", {name:"Đăng nhập",exact:true}).click();
  await expect(page).toHaveURL(/\/home\//);
  await expect.poll(() => fixture.connectionCounts().active).toBe(1);
  expect(fixture.connectionCounts().connections).toBe(1);
  const before = [...requests];
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {configurable:true, value:true});
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => fixture.connectionCounts().active).toBe(0);
  fixture.pushNotice({id:"missed",type:"MATERIAL",title:"Bài mới khi đang ở nền",href:"/materials/",isRead:false,version:1,createdAt:new Date().toISOString()});
  await page.waitForTimeout(200); expect(fixture.connectionCounts().connections).toBe(1); expect(requests).toEqual(before);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {configurable:true, value:false});
    document.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("online"));
  });
  await expect.poll(() => fixture.connectionCounts().active).toBe(1);
  expect(fixture.connectionCounts().connections).toBe(2);
  await expect(page.getByRole("link", {name:"Thông báo (1)",exact:true})).toBeVisible();
  expect(requests.some(url => new URL(url).pathname === "/v1/notifications")).toBe(false);
  expect(requests.some(url => new URL(url).pathname === "/v1/operations")).toBe(false);
});
test("idle/focus/reconnect send no HTTP; login/reload and notifications do not duplicate", async ({ page }) => {
  test.skip(process.env.NEXT_PUBLIC_USE_MOCK === "true", "Counts actual browser HTTP requests.");
  await installHttpFixture(page);
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname === "api.example.com" && request.method() !== "OPTIONS") requests.push(`${request.method()} ${url.pathname}`);
  });
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill("MG0001");
  await page.getByLabel("Mật khẩu", {exact: true}).fill("Demo123!");
  await page.getByRole("button", {name: "Đăng nhập", exact: true}).click();
  await expect(page).toHaveURL(/\/home\//);
  await expect(page.getByRole("link", {name: /^Thông báo/})).toBeVisible();
  await page.waitForTimeout(300);
  const count = (path: string) => requests.filter((request) => request === `GET /v1${path}`).length;
  expect(count("/auth/me")).toBe(0);
  expect(count("/notifications")).toBe(0);
  expect(count("/operations")).toBe(0);
  const before = [...requests];
  await page.clock.install();
  await page.clock.fastForward(5 * 60 * 1000);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("blur")); window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online"));
  });
  await page.waitForTimeout(150);
  expect(requests).toEqual(before);
  await page.getByRole("link", {name: /^Thông báo/}).click();
  await expect(page).toHaveURL(/\/notifications\//);
  await expect(page.getByRole("heading", {name: "Thông báo", exact: true})).toBeVisible();
  expect(count("/notifications")).toBe(0);
  await page.reload();
  await expect(page.getByRole("heading", {name: "Thông báo", exact: true})).toBeVisible();
  expect(count("/auth/me")).toBe(1);
  expect(count("/notifications")).toBe(0);
  expect(requests.filter((request) => request.includes("/operations")).length).toBe(0);
});

test("socket notice updates badge/list; read actions patch cache without notification GETs", async ({ page }) => {
  test.skip(process.env.NEXT_PUBLIC_USE_MOCK === "true", "Validates websocket frames and HTTP counts.");
  const fixture = await installHttpFixture(page);
  const root = process.env.NEXT_PUBLIC_API_BASE_URL!.replace(/\/$/, "");
  let gets = 0, writes = 0;
  page.on("request", (request) => { if (request.method() === "GET" && new URL(request.url()).pathname === "/v1/notifications") gets++; });
  await page.goto(`${base}/login/`); await page.getByLabel("ID giảng viên").fill("GV0001");
  await page.getByLabel("Mật khẩu", {exact:true}).fill("Demo123!"); await page.getByRole("button", {name:"Đăng nhập",exact:true}).click();
  await expect(page).toHaveURL(/\/home\//); await page.waitForTimeout(200);
  const notice = {id:"socket-notice",type:"MATERIAL",title:"Tài liệu mới qua socket",href:"/materials/",isRead:false,version:1,createdAt:new Date().toISOString()};
  fixture.pushNotice(notice); fixture.pushNotice(notice);
  await expect(page.getByRole("link", {name:"Thông báo (1)",exact:true})).toBeVisible();
  await page.getByRole("link", {name:"Thông báo (1)",exact:true}).click();
  await expect(page.getByText(notice.title, {exact:true})).toHaveCount(1);
  expect(gets).toBe(0);
  await page.route(`${root}/notifications/${notice.id}`, async (route) => {
    writes++; await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:{...notice,isRead:true,version:2}})});
  });
  await page.getByRole("button", {name:"Đánh dấu đã đọc",exact:true}).click();
  await expect(page.getByRole("button", {name:"Đánh dấu chưa đọc",exact:true})).toBeVisible();
  expect(writes).toBe(1); expect(gets).toBe(0);
  fixture.pushNotice({...notice,id:"socket-notice-2",title:"Thông báo thứ hai"});
  await expect(page.getByText("Thông báo thứ hai", {exact:true})).toBeVisible();
  await page.route(`${root}/notifications/read-all`, async (route) => {
    writes++; await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:{updated:1}})});
  });
  await page.getByRole("button", {name:"Đọc tất cả",exact:true}).click();
  await expect(page.getByText("0 chưa đọc", {exact:true})).toBeVisible();
  expect(writes).toBe(2); expect(gets).toBe(0);
});
