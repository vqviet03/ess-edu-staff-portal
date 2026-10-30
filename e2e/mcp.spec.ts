import { test, expect } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type,x-workspace",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
};
function requestQuery() {
  return new URLSearchParams({
    client_id: "ees-chatgpt",
    redirect_uri: "https://chatgpt.com/connector_platform_oauth_redirect",
    response_type: "code",
    code_challenge: "a".repeat(43),
    code_challenge_method: "S256",
    resource: "https://api.example.com/mcp",
    scope: "ees.read offline_access",
    state: "keep-this-state",
  });
}
for (const width of [390, 1440])
  test(`ChatGPT consent retains login return target and only grants read roles at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await installHttpFixture(page);
    let posted: Record<string, unknown> | undefined;
    await page.route("**/mcp/consent", async (r) => {
      if (r.request().method() === "OPTIONS")
        return r.fulfill({ status: 204, headers: cors });
      posted = r.request().postDataJSON();
      return r.fulfill({
        headers: cors,
        json: {
          data: {
            redirectUrl:
              "https://chatgpt.com/connector_platform_oauth_redirect?code=approved&state=keep-this-state&iss=https%3A%2F%2Fapi.example.com",
          },
        },
      });
    });
    await page.route(
      "https://chatgpt.com/connector_platform_oauth_redirect**",
      (r) =>
        r.fulfill({
          contentType: "text/html",
          body: "<p>ChatGPT connected</p>",
        }),
    );
    await page.goto(`${base}/mcp/authorize/?${requestQuery()}`);
    await expect(page).toHaveURL(/login\//);
    await page.getByLabel("ID giảng viên").fill("GV0001");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/mcp\/authorize\//);
    await expect(
      page.getByRole("heading", { name: "Kết nối ChatGPT với EES" }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Giảng viên", exact: true }),
    ).toBeChecked();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/mcp-consent-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Cho phép tra cứu", exact: true })
      .click();
    await expect(page).toHaveURL(
      /chatgpt.com\/connector_platform_oauth_redirect/,
    );
    expect(posted?.scope).toBe("ees.read offline_access");
    expect(posted?.state).toBe("keep-this-state");
    expect(posted?.approve).toBe(true);
    expect(posted?.roles).toEqual(["teacher"]);
  });
test("profile lists only connection metadata and confirms revoke before sending DELETE", async ({
  page,
}) => {
  await installHttpFixture(page);
  let revoked = false;
  await page.route("**/mcp/connections**", async (r) => {
    if (r.request().method() === "OPTIONS")
      return r.fulfill({ status: 204, headers: cors });
    if (r.request().method() === "DELETE") {
      revoked = true;
      return r.fulfill({ headers: cors, json: { data: { revoked: true } } });
    }
    return r.fulfill({
      headers: cors,
      json: {
        data: {
          enabled: true,
          items: revoked
            ? []
            : [
                {
                  id: "connection-1",
                  createdAt: "2026-10-30T00:00:00Z",
                  expiresAt: "2026-11-30T00:00:00Z",
                  connected: true,
                  roles: ["teacher"],
                  scope: "ees.read",
                },
              ],
        },
      },
    });
  });
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill("GV0001");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/home\//);
  await page.goto(`${base}/profile/`);
  await page
    .getByRole("button", { name: "Thu hồi kết nối ChatGPT", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(revoked).toBe(false);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Thu hồi", exact: true })
    .click();
  await expect.poll(() => revoked).toBe(true);
  await expect(
    page.getByText("Chưa có kết nối.", { exact: true }),
  ).toBeVisible();
});
