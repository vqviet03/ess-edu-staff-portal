import { expect, type Page } from "@playwright/test";

/** In-app MUI confirmation/prompt dialog rendered by <DialogHost/>. */
export const appDialog = (page: Page) => page.locator("[data-app-dialog]");

export async function confirmAppDialog(
  page: Page,
  options: { text?: string; message?: string | RegExp } = {},
) {
  const dialog = appDialog(page);
  await expect(dialog.getByRole("dialog")).toBeVisible();
  if (options.message)
    await expect(dialog.getByText(options.message).first()).toBeVisible();
  if (options.text !== undefined)
    await dialog.getByRole("textbox").fill(options.text);
  await dialog.locator(".MuiDialogActions-root button").last().click();
  await expect(dialog).toHaveCount(0);
}

export async function cancelAppDialog(
  page: Page,
  options: { message?: string | RegExp } = {},
) {
  const dialog = appDialog(page);
  await expect(dialog.getByRole("dialog")).toBeVisible();
  if (options.message)
    await expect(dialog.getByText(options.message).first()).toBeVisible();
  await dialog.locator(".MuiDialogActions-root button").first().click();
  await expect(dialog).toHaveCount(0);
}
