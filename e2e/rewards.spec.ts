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
    const summary = (id: string, date?: string) =>
      totals(
        entries
          .filter(
            (e) =>
              e.studentId === id &&
              e.kind === "EARN" &&
              (!date || e.date === date),
          )
          .reduce((n, e) => n + e.amount, 0),
        entries
          .filter(
            (e) =>
              e.studentId === id &&
              e.kind === "PENALTY" &&
              (!date || e.date === date),
          )
          .reduce((n, e) => n + e.amount, 0),
        entries
          .filter(
            (e) =>
              e.studentId === id &&
              e.kind === "SPEND" &&
              (!date || e.date === date),
          )
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
      if (path.endsWith("/correction")) {
        const original = entries.find((e) =>
          path.includes(`/${e.id}/correction`),
        )!;
        original.isReversed = true;
        entries.push({
          ...original,
          id: crypto.randomUUID(),
          amount: -original.amount,
          note: String(body!.reason),
          reversesId: original.id,
          isReversed: false,
        });
        const replacement = {
          ...original,
          id: crypto.randomUUID(),
          amount: Number(body!.amount),
          note: String(body!.note),
          isReversed: false,
        };
        if (replacement.amount > 0) entries.push(replacement);
        return reply(replacement.amount > 0 ? replacement : entries.at(-1));
      }
      const student = students.find((s) => s.id === id)!;
      const e: RewardEntry = {
        id: crypto.randomUUID(),
        kind: body!.kind as RewardEntry["kind"],
        amount: Number(body!.amount),
        note: String(
          body!.note ?? `${student.nickname} vừa đạt được thành tích mới`,
        ),
        date: String(body!.date ?? today),
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
    const selectedDate = url.searchParams.get("date") ?? today;
    return reply({
      classId: "class-green",
      date: selectedDate,
      dayVersion: 0,
      closed: false,
      highestToday: Math.max(
        ...students.map((s) => summary(s.id, selectedDate).earned),
      ),
      items: students.map((s) => ({
        studentId: s.id,
        publicId: s.id,
        name: s.name,
        nickname: s.nickname,
        attendance: "PRESENT",
        totals: summary(s.id),
        today: summary(s.id, selectedDate),
        todayProgress: summary(s.id, selectedDate).earned ? 100 : 0,
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
test("teacher records past points and corrects them without losing original history", async ({
  page,
}) => {
  const f = await rewardsFixture(page),
    past = dateWindow(vietnamToday(), 8).from;
  await login(page);
  await page.goto(`${base}/class/?classId=class-green`);
  await page
    .getByRole("button", { name: "Cộng điểm động viên", exact: true })
    .click();
  const award = page.getByRole("dialog"),
    row = award.getByRole("row").filter({ hasText: "Hữu Văn" });
  await award.getByLabel("Ngày học", { exact: true }).fill(past);
  await row
    .locator("label")
    .filter({ hasText: /3 cúp$/ })
    .click();
  await row.getByRole("button", { name: "Lưu nhanh", exact: true }).click();
  await expect.poll(() => f.entries.length).toBe(1);
  expect(f.entries[0].date).toBe(past);
  await row
    .getByRole("button", { name: "Xem chi tiết tích thưởng", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Chỉnh sửa điểm đã ghi", exact: true })
    .click();
  const correction = page.getByRole("dialog");
  await expect(correction.getByLabel("Ngày ghi nhận điểm")).toHaveValue(past);
  await expect(correction.getByLabel("Ngày ghi nhận điểm")).toBeDisabled();
  await correction
    .locator("label")
    .filter({ hasText: /2 cúp$/ })
    .click();
  await correction
    .getByLabel("Ghi chú thành tích")
    .fill("Đã đối chiếu buổi học");
  await correction.getByLabel("Lý do điều chỉnh").fill("Nhập nhầm số cúp");
  await correction
    .getByRole("button", { name: "Lưu điều chỉnh", exact: true })
    .click();
  await expect(correction).toHaveCount(0);
  await expect.poll(() => f.entries.length).toBe(3);
  expect(f.entries.map((e) => e.amount)).toEqual([3, -3, 2]);
  expect(f.entries.reduce((sum, e) => sum + e.amount, 0)).toBe(2);
  await expect(
    page.getByText("Đã đối chiếu buổi học", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Chỉnh sửa điểm đã ghi", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Chỉnh sửa điểm đã ghi", exact: true })
    .click();
  await correction
    .locator("label")
    .filter({ hasText: /2 cúp$/ })
    .click();
  await correction.getByLabel("Lý do điều chỉnh").fill("Hủy lượt nhập nhầm");
  await correction
    .getByRole("button", { name: "Lưu điều chỉnh", exact: true })
    .click();
  await expect(correction).toHaveCount(0);
  await expect.poll(() => f.entries.length).toBe(4);
  expect(f.entries.reduce((sum, e) => sum + e.amount, 0)).toBe(0);
  await expect(
    page.getByRole("button", { name: "Chỉnh sửa điểm đã ghi", exact: true }),
  ).toHaveCount(0);
});
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
    ...Array.from(
      { length: 21 },
      (_, i): RewardEntry => ({
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
      }),
    ),
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

test("mobile schedule switches months and keeps all planned dates grouped", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await rewardsFixture(page);
  const month = vietnamToday().slice(0, 7);
  const next = new Date(`${month}-01T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const nextMonth = next.toISOString().slice(0, 7);
  await page.route(/\/v1\/classes\/[^/]+\/schedule(?:\?|$)/, (route) =>
    route.fulfill({
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization,content-type,x-workspace",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
      json: {
        data: {
          version: 1,
          effectiveFrom: `${month}-01`,
          timeZone: "Asia/Ho_Chi_Minh",
          configuration: {
            mode: "FIXED",
            cycle: "WEEKLY",
            timeMode: "GLOBAL",
            startTime: "19:00",
            endTime: "21:00",
            slots: [{ day: 7, date: null, startTime: null, endTime: null }],
          },
          occurrences: [`${month}-18`, `${month}-25`, `${nextMonth}-01`].map(
            (date) => ({ date, startTime: "19:00", endTime: "21:00" }),
          ),
        },
      },
    }),
  );
  await login(page, "MG0001");
  await page.goto(
    `${base}/manage/profile/?entity=students&id=HV1001&tab=rewards`,
  );
  await page.getByRole("button", { name: "Xem lịch học", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("2 buổi trong tháng", { exact: true }),
  ).toBeVisible();
  await dialog.screenshot({
    path: "test-results/compact-schedule-calendar-mobile.png",
    animations: "disabled",
  });
  await dialog.getByLabel("Tháng học").click();
  await page
    .getByRole("option", {
      name: `Tháng ${Number(nextMonth.slice(5))} / ${nextMonth.slice(0, 4)}`,
    })
    .click();
  await expect(
    dialog.getByText("1 buổi trong tháng", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Toàn bộ lịch học", exact: true })
    .click();
  await expect(dialog.getByText("18 · 25", { exact: true })).toBeVisible();
  await expect(dialog.getByText("01", { exact: true })).toBeVisible();
  await dialog.screenshot({
    path: "test-results/compact-schedule-months-mobile.png",
    animations: "disabled",
  });
  await dialog
    .getByRole("button", { name: "Đóng lịch học", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
});

for (const width of [390, 1440]) {
  test(`managed student gift history uses resolved IDs at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await rewardsFixture(page);
    const classId = "11111111-1111-4111-8111-111111111111";
    const studentId = "22222222-2222-4222-8222-222222222222";
    const requests: URL[] = [];
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization,content-type,x-workspace",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    };
    await page.route(
      /\/v1\/classes\/[^/]+\/students\/HV1001\/rewards\?/,
      (route) =>
        route.fulfill({
          headers,
          json: {
            data: {
              classId,
              studentId,
              todayDate: vietnamToday(),
              totals: totals(),
              today: totals(),
              attendance: "UNSET",
              todayProgress: 0,
              chart: [],
              activities: [],
              activityCount: 0,
            },
          },
        }),
    );
    await page.route(/\/v1\/reward-gifts\/redemptions(?:\?|$)/, (route) => {
      if (route.request().method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      const url = new URL(route.request().url());
      requests.push(url);
      const valid =
        url.searchParams.get("classId") === classId &&
        url.searchParams.get("studentId") === studentId;
      return route.fulfill({
        headers,
        status: valid ? 200 : 400,
        json: valid
          ? { data: { items: [], total: 0, page: 1, pageSize: 20 } }
          : {
              error: {
                code: "VALIDATION_ERROR",
                message: "Dữ liệu không hợp lệ.",
              },
            },
      });
    });
    await login(page, "MG0001");
    await page.goto(
      `${base}/manage/profile/?entity=students&id=HV1001&tab=rewards`,
    );
    await expect(page.getByText("Chưa có yêu cầu đổi quà.")).toBeVisible();
    expect(requests).toHaveLength(1);
    await expect(
      page.getByRole("alert").filter({ hasText: "Dữ liệu không hợp lệ." }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Đổi quà hộ", exact: true }),
    ).toHaveCount(0);
    const status = page.getByLabel("Trạng thái", { exact: true });
    await expect(status).toHaveValue("");
    const field = status.locator(
      "xpath=ancestor::div[contains(@class,'MuiFormControl-root')]",
    );
    await expect(field.locator("label")).toHaveAttribute("data-shrink", "true");
    await status.selectOption("PENDING");
    await expect
      .poll(() => requests.at(-1)?.searchParams.get("status"))
      .toBe("PENDING");
    expect(
      requests.every((url) => url.searchParams.get("studentId") === studentId),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
