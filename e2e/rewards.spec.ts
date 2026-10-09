import { test, expect, type Page } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import { seed } from "../src/mock/fixtures";
import {
  vietnamToday,
  dateWindow,
  type RewardEntry,
  type RewardTotals,
  type ScheduleConfig,
} from "../src/features/rewards/models";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const totals = (earned = 0, penalty = 0, spent = 0): RewardTotals => ({
  earned,
  penalty,
  spent,
  net: earned - penalty,
  balance: earned - penalty - spent,
});
async function rewardsFixture(page: Page) {
  await installHttpFixture(page);
  const students = seed().students["class-green"].slice(0, 2),
    today = vietnamToday();
  const entries: RewardEntry[] = [];
  let version = 0,
    config: ScheduleConfig = {
      mode: "FLEXIBLE",
      cycle: "WEEKLY",
      timeMode: "FLEXIBLE",
      startTime: null,
      endTime: null,
      slots: [],
    },
    schedules = 0,
    effectiveFrom = today,
    plannedSessions = 0,
    planStartDate: string | null = null;
  const writes: string[] = [];
  await page.route("**/v1/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.replace(/^.*\/v1/, ""),
      method = request.method(),
      headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization,content-type,idempotency-key,accept,prefer,x-workspace",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      };
    if (!/\/schedule$|\/rewards(?:\/|$)|reward-classes$/.test(path))
      return route.fallback();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
    const body = request.postDataJSON() as Record<string, unknown> | null;
    const reply = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        headers,
        json:
          status === 200
            ? { data }
            : { error: { code: "TEST_ERROR", message: String(data) } },
      });
    const summary = (id: string) =>
      totals(
        entries
          .filter((e) => e.studentId === id && e.kind === "EARN")
          .reduce((n, e) => n + e.amount, 0),
        entries
          .filter((e) => e.studentId === id && e.kind === "PENALTY")
          .reduce((n, e) => n + e.amount, 0),
        entries
          .filter((e) => e.studentId === id && e.kind === "SPEND")
          .reduce((n, e) => n + e.amount, 0),
      );
    if (path.endsWith("/schedule")) {
      if (method === "PUT") {
        version++;
        config = body!.configuration as ScheduleConfig;
        effectiveFrom = String(body!.effectiveFrom);
        schedules++;
        plannedSessions = Number(body!.plannedSessions ?? plannedSessions);
        planStartDate = String(body!.planStartDate ?? planStartDate ?? today);
      }
      return reply({
        classId: "class-green",
        plannedSessions,
        planStartDate,
        version,
        effectiveFrom,
        configuration: config,
        occurrences: [],
        timeZone: "Asia/Ho_Chi_Minh",
      });
    }
    if (path.endsWith("/reward-classes"))
      return reply([{ id: "class-green", name: "Juniors 03" }]);
    const studentMatch = path.match(/\/students\/([^/]+)\/rewards/),
      id = studentMatch?.[1] ?? students[0].id;
    if (method === "POST") {
      writes.push(request.headers()["idempotency-key"]);
      const student = students.find((s) => s.id === id)!;
      const e: RewardEntry = {
        id: crypto.randomUUID(),
        kind: body!.kind as RewardEntry["kind"],
        amount: Number(body!.amount),
        note: String(
          body!.note ?? `${student.nickname} vừa đạt được thành tích mới`,
        ),
        date: today,
        createdAt: new Date().toISOString(),
        authorName: "Vũ Quốc Việt",
        authorPublicId: "vq.viet",
        studentId: id,
        studentName: student.name,
        nickname: student.nickname,
        reversesId: null,
      };
      entries.push(e);
      return reply(e);
    }
    if (path.endsWith("/activities")) {
      const page = Number(url.searchParams.get("page") ?? 1);
      return reply({
        items: entries.slice((page - 1) * 20, page * 20),
        page,
        pageSize: 20,
        total: entries.length,
      });
    }
    if (path.endsWith("/history"))
      return reply({
        items: entries.filter((e) => e.studentId === id),
        page: 1,
        pageSize: 20,
        total: entries.length,
      });
    if (studentMatch) {
      const t = summary(id);
      return reply({
        classId: "class-green",
        studentId: id,
        todayDate: today,
        totals: t,
        today: t,
        attendance: "PRESENT",
        todayProgress: 100,
        chart: entries.length
          ? [
              {
                date: today,
                attendance: "PRESENT",
                dailyEarned: t.earned,
                dailyPenalty: t.penalty,
                dailySpent: t.spent,
                ...t,
              },
            ]
          : [],
        activities: entries.slice(0, 20),
        activityCount: entries.length,
      });
    }
    return reply({
      classId: "class-green",
      date: today,
      dayVersion: 0,
      closed: false,
      highestToday: Math.max(...students.map((s) => summary(s.id).earned)),
      items: students.map((s) => ({
        studentId: s.id,
        publicId: s.id,
        name: s.name,
        nickname: s.nickname,
        attendance: "PRESENT",
        totals: summary(s.id),
        today: summary(s.id),
        todayProgress: summary(s.id).earned ? 100 : 0,
      })),
    });
  });
  return {
    entries,
    writes,
    schedules: () => schedules,
    plannedSessions: () => plannedSessions,
    configuration: () => config,
    effectiveFrom: () => effectiveFrom,
  };
}
async function login(page: Page, id = "GV0001") {
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill(id);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/home/);
}
test("teacher awards trophies, saves note, opens reward detail and does not poll", async ({
  page,
}, testInfo) => {
  const f = await rewardsFixture(page);
  await login(page);
  await page.goto(`${base}/class/?classId=class-green`);
  await expect(
    page.getByRole("button", { name: "Thiết lập lịch học", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Cộng điểm động viên", exact: true })
    .click();
  const dialog = page.getByRole("dialog"),
    row = dialog.getByRole("row").filter({ hasText: "Hữu Văn" });
  await row
    .locator("label")
    .filter({ hasText: /3 cúp$/ })
    .click();
  await dialog.screenshot({
    path: testInfo.outputPath("rewards-award-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    row.getByRole("button", { name: "Lưu nhanh", exact: true }),
  ).toBeVisible();
  expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(
    true,
  );
  await dialog.screenshot({
    path: testInfo.outputPath("rewards-award-mobile.png"),
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await dialog.screenshot({
    path: testInfo.outputPath("rewards-award-mobile-dark.png"),
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await row.getByRole("button", { name: "Lưu nhanh", exact: true }).click();
  await expect.poll(() => f.entries.length).toBe(1);
  expect(f.entries[0].note).toBe("Bon vừa đạt được thành tích mới");
  expect(f.writes[0]).toMatch(/^[a-f\d-]{36}$/);
  await expect(row.getByText("3 đã nhận", { exact: true })).toBeVisible();
  await expect(
    row.getByRole("button", { name: "Lưu nhanh", exact: true }),
  ).toBeDisabled();
  await row
    .locator("label")
    .filter({ hasText: /2 cúp$/ })
    .click();
  await row
    .getByRole("button", { name: "Lưu kèm ghi chú", exact: true })
    .click();
  const note = page
    .getByRole("dialog")
    .filter({ has: page.getByText("Ghi nhận thành tích", { exact: true }) });
  await note.getByLabel("Ghi chú thành tích").fill("Chủ động hỗ trợ bạn");
  await note.getByRole("button", { name: "Lưu +2 điểm", exact: true }).click();
  await expect.poll(() => f.entries.length).toBe(2);
  await row
    .getByRole("button", { name: "Xem chi tiết tích thưởng", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Điểm tích luỹ", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByText("Chủ động hỗ trợ bạn", { exact: true }).first(),
  ).toBeVisible();
  let requests = 0;
  page.on("request", (r) => {
    if (/\/v1\//.test(r.url())) requests++;
  });
  await page.clock.install();
  await page.clock.fastForward(60000);
  expect(requests).toBe(0);
});
test("manager saves weekly/monthly/flexible schedule; mobile reward cards fit", async ({
  page,
}, testInfo) => {
  const f = await rewardsFixture(page);
  await page.setViewportSize({ width: 1280, height: 1100 });
  await login(page, "MG0001");
  await page.goto(`${base}/class/?classId=class-green`);
  await page
    .getByRole("button", { name: "Thiết lập lịch học", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Loại lịch").click();
  await page.getByRole("option", { name: "Lịch cố định", exact: true }).click();
  await dialog.getByRole("button", { name: "Thứ 2", exact: true }).click();
  await dialog.getByRole("button", { name: "Thứ 6", exact: true }).click();
  await dialog
    .getByRole("radio", { name: "Giờ áp dụng toàn bộ", exact: true })
    .click();
  await dialog
    .getByText("Ngày áp dụng & kế hoạch buổi học", { exact: true })
    .click();
  await dialog.getByLabel("Tổng buổi kế hoạch ban đầu").fill("12");
  const past = dateWindow(vietnamToday(), 90).from;
  await dialog.getByLabel("Áp dụng từ", { exact: true }).fill(past);
  expect(
    await dialog
      .getByLabel("Áp dụng từ", { exact: true })
      .evaluate((input: HTMLInputElement) => input.validity.valid),
  ).toBe(true);
  await dialog.getByLabel("Ngày bắt đầu kế hoạch").fill(past);
  await dialog
    .getByText("Ngày áp dụng & kế hoạch buổi học", { exact: true })
    .click();
  await dialog.getByLabel("Giờ bắt đầu").fill("17:00");
  await dialog.getByLabel("Giờ kết thúc").fill("18:30");
  await dialog
    .getByRole("radio", { name: "Giờ áp dụng toàn bộ", exact: true })
    .focus();
  await dialog.locator(".MuiDialogContent-root").evaluate((e) => {
    e.scrollTop = 0;
  });
  await dialog.screenshot({
    path: testInfo.outputPath("schedule-weekly-shared.png"),
  });
  await dialog
    .getByRole("radio", { name: "Giờ áp dụng từng ngày", exact: true })
    .click();
  await expect(dialog.getByLabel("Giờ bắt đầu")).toHaveCount(2);
  await dialog.screenshot({
    path: testInfo.outputPath("schedule-weekly-per-day.png"),
  });
  await dialog
    .getByRole("radio", { name: "Giờ áp dụng toàn bộ", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Lưu lịch học", exact: true })
    .click();
  await expect.poll(() => f.schedules()).toBe(1);
  expect(f.plannedSessions()).toBe(12);
  expect(f.effectiveFrom()).toBe(past);
  await expect(dialog).not.toBeVisible();
  expect(f.configuration().slots.map((s) => s.day)).toEqual([1, 5]);
  await page.reload();
  await page
    .getByRole("button", { name: "Thiết lập lịch học", exact: true })
    .click();
  await dialog
    .getByText("Ngày áp dụng & kế hoạch buổi học", { exact: true })
    .click();
  await expect(dialog.getByLabel("Áp dụng từ", { exact: true })).toHaveValue(
    past,
  );
  await dialog
    .getByText("Ngày áp dụng & kế hoạch buổi học", { exact: true })
    .click();
  await dialog.getByLabel("Chu kỳ", { exact: true }).click();
  await page.getByRole("option", { name: "Theo tháng", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Thêm ngày học", exact: true })
    .click();
  await dialog.getByLabel("Ngày trong tháng").fill("31");
  await dialog
    .getByRole("button", { name: "Thêm ngày học", exact: true })
    .click();
  await expect(dialog.getByLabel("Ngày trong tháng")).toHaveCount(2);
  await dialog.getByRole("button", { name: "Xoá ngày 2", exact: true }).click();
  await expect(dialog.getByLabel("Ngày trong tháng")).toHaveCount(1);
  await dialog
    .getByRole("radio", { name: "Giờ áp dụng từng ngày", exact: true })
    .click();
  await dialog.getByLabel("Giờ bắt đầu").fill("18:00");
  await dialog.getByLabel("Giờ kết thúc").fill("19:30");
  await dialog
    .getByRole("radio", { name: "Giờ áp dụng từng ngày", exact: true })
    .focus();
  await dialog.locator(".MuiDialogContent-root").evaluate((e) => {
    e.scrollTop = 0;
  });
  await dialog.screenshot({
    path: testInfo.outputPath("schedule-monthly.png"),
  });
  await dialog
    .getByRole("button", { name: "Lưu lịch học", exact: true })
    .click();
  await expect.poll(() => f.schedules()).toBe(2);
  expect(f.configuration().slots[0]).toMatchObject({
    day: 31,
    startTime: "18:00",
    endTime: "19:30",
  });
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", { name: "Thiết lập lịch học", exact: true })
    .click();
  await dialog.getByLabel("Loại lịch").click();
  await page
    .getByRole("option", { name: "Lịch linh động", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Thêm ngày học", exact: true })
    .click();
  await dialog.getByLabel("Ngày học", { exact: true }).fill(vietnamToday());
  await dialog
    .getByRole("radio", { name: "Giờ flexible", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Lưu lịch học", exact: true })
    .click();
  await expect.poll(() => f.schedules()).toBe(3);
  expect(f.configuration()).toMatchObject({
    mode: "FLEXIBLE",
    timeMode: "FLEXIBLE",
  });
  await expect(dialog).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Xem điểm động viên", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Hữu Văn (Bon)"),
  ).toBeVisible();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("staff-rewards-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
});
test("manager edits schedule but only views rewards", async ({ page }) => {
  await rewardsFixture(page);
  await login(page, "MG0001");
  await page.goto(`${base}/class/?classId=class-green`);
  await page
    .getByRole("button", { name: "Xem điểm động viên", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Lưu nhanh", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("dialog").getByRole("radio")).toHaveCount(0);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Thiết lập lịch học", exact: true }),
  ).toHaveCount(1);
  await page.goto(
    `${base}/manage/profile/?entity=students&id=HV1001&tab=rewards`,
  );
  await expect(
    page.getByRole("tab", { name: "Điểm tích luỹ", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("heading", { name: "Hành trình tích luỹ", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ghi nhận thành tích", exact: true }),
  ).toHaveCount(0);
});
test("class activities paginate sequentially without skipping the second page", async ({
  page,
}) => {
  const f = await rewardsFixture(page),
    student = seed().students["class-green"][0];
  f.entries.push(
    ...Array.from({ length: 21 }, (_, i): RewardEntry => ({
      id: `entry-${i}`,
      kind: "EARN",
      amount: 1,
      note: `Hoạt động số ${i + 1}`,
      date: vietnamToday(),
      createdAt: new Date().toISOString(),
      authorName: "Vũ Quốc Việt",
      authorPublicId: "vq.viet",
      reversesId: null,
      studentId: student.id,
      studentName: student.name,
      nickname: student.nickname ?? "",
    })),
  );
  await login(page);
  await page.goto(
    `${base}/student/?classId=class-green&studentId=${student.id}&tab=rewards`,
  );
  await expect(
    page.getByText("Hoạt động số 20", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Hoạt động tiếp theo", exact: true })
    .click();
  await expect(
    page.getByText("Hoạt động số 21", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("21 lượt · Trang 2", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Hoạt động tiếp theo", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Hoạt động trước", exact: true })
    .click();
  await expect(
    page.getByText("21 lượt · Trang 1", { exact: true }).first(),
  ).toBeVisible();
});
