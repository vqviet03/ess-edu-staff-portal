import { defineConfig } from "@playwright/test";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://127.0.0.1:4173${base}/`, trace: "retain-on-failure", launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {} },
  webServer: {
    command: "npm run preview",
    url: `http://127.0.0.1:4173${base}/login/`,
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
