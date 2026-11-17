import type { Page } from "@playwright/test";

/** Below `md` the header keeps display preferences in the avatar menu. */
const compact = (page: Page) => (page.viewportSize()?.width ?? 1280) < 900;
/** Signed-in phones open preferences from the avatar; sign-in uses ⋮. */
const more = (page: Page) =>
  page.getByRole("button", { name: /^(Tài khoản|Tùy chọn khác)$/ });

/** Opens the menu that lists Sáng / Tối / Theo hệ thống. */
export async function openAppearance(page: Page) {
  if (compact(page)) await more(page).click();
  else
    await page.getByRole("button", { name: "Giao diện", exact: true }).click();
}

/** Shows or hides the page guide. */
export async function toggleGuide(page: Page) {
  if (!compact(page)) {
    await page
      .getByRole("button", { name: /^(Ẩn hướng dẫn|Hướng dẫn)$/ })
      .click();
    return;
  }
  await more(page).click();
  await page
    .getByRole("menuitem", { name: /^(Ẩn hướng dẫn|Hướng dẫn)$/ })
    .click();
}

/** Clicks a zoom control (Thu nhỏ / Phóng to / Đặt lại) in either layout. */
export async function zoom(page: Page, name: string) {
  if (compact(page)) await more(page).click();
  await page.getByRole("button", { name, exact: true }).click();
  if (compact(page)) await page.keyboard.press("Escape");
}
