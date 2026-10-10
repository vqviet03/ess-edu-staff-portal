import { test, expect, type Page } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import { seed } from "../src/mock/fixtures";
import {
  todayDate,
  type ClassAttendance,
  type AttendanceDate,
} from "../src/features/attendance/models";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
async function fixture(page: Page, scheduled = true) {
  await installHttpFixture(page);
  const students = seed().students["class-green"].slice(0, 4),
    today = todayDate();
  let version = 0,
    saved = false,
    confirmed = false;
  const rows = students.map((s, i) => ({
    studentId: s.id,
    publicId: s.id,
    name: s.name,
    nickname: s.nickname ?? "",
    status: "UNSET" as "UNSET" | "PRESENT" | "ABSENT",
    stats: {
      present: 7,
      absent: [1, 2, 4, 5][i],
      unrecorded: 2,
      plannedSessions: 20,
      absencePercentage: [5, 10, 20, 25][i],
      warning: ["ACCEPTABLE", "WARNING", "WARNING", "DANGER"][i] as
        | "ACCEPTABLE"
        | "WARNING"
        | "DANGER",
    },
  }));
  const writes: string[] = [];
  await page.route("**/v1/classes/class-green/attendance**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      body =
        request.method() === "GET"
          ? null
          : (request.postDataJSON() as Record<string, unknown>),
      date = url.searchParams.get("date") ?? today;
    if (request.method() === "POST" || url.pathname.endsWith("/calendar")) {
      confirmed = true;
      version++;
      writes.push("CONFIRM");
    }
    if (request.method() === "PUT" && !url.pathname.endsWith("/calendar")) {
      saved = true;
      version++;
      writes.push("SAVE");
      for (const input of body!.rows as {
        studentId: string;
        status: "PRESENT" | "ABSENT";
      }[]) {
        rows.find((r) => r.studentId === input.studentId)!.status =
          input.status;
      }
    }
    const calendar: AttendanceDate[] = [
      {
        date: today,
        scheduled,
        confirmed,
        status: saved ? "SAVED" : "UNSET",
        reasonKind: confirmed ? "SUPPLEMENTAL" : null,
        reason: confirmed ? "Ôn tập" : "",
        replacesDate: null,
        replaced: false,
        startTime: "18:00",
        endTime: "19:30",
      } as AttendanceDate,
    ];
    const data: ClassAttendance = {
      classId: "class-green",
      today,
      date,
      version,
      saved,
      scheduled,
      confirmed,
      replaced: false,
      reasonKind: confirmed ? "SUPPLEMENTAL" : null,
      reason: confirmed ? "Ôn tập" : "",
      replacesDate: null,
      startTime: "18:00",
      endTime: "19:30",
      updatedBy: saved ? "Giảng viên" : null,
      updatedAt: saved ? new Date().toISOString() : null,
      plannedSessions: 20,
      savedSessions: saved ? 9 : 8,
      supplementalSessions: 2,
      needsAttention: 3,
      items: rows,
      calendar,
      changes: [],
    };
    await route.fulfill({ json: { data } });
  });
  return { writes };
}
async function login(page: Page, id = "GV0001") {
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill(id);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/home/);
  await page.goto(`${base}/class/?classId=class-green&tab=attendance`);
}
test("teacher confirms absences before saving; report is responsive and idle makes no requests", async ({
  page,
}) => {
  const { writes } = await fixture(page);
  await page.clock.install();
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Điểm danh hôm nay" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Điểm danh hôm nay", { exact: true }),
  ).toBeVisible();
  const roster = page.getByTestId("attendance-row");
  await expect(roster).toHaveCount(8);
  await page
    .getByRole("button", { name: "Lưu điểm danh", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Xác nhận lưu", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: "Xác nhận cả lớp vắng", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page
    .getByRole("checkbox", { name: /Có mặt:/ })
    .first()
    .check();
  await page
    .getByRole("button", { name: "Lưu điểm danh", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("vắng");
  expect(writes).toEqual([]);
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(
    page.getByText("Đã lưu điểm danh.", { exact: true }),
  ).toBeVisible();
  expect(writes).toEqual(["SAVE"]);
  await page.screenshot({
    path: "test-results/attendance-teacher-desktop.png",
    fullPage: true,
  });
  let reads = 0;
  page.on("request", (r) => {
    if (r.url().includes("/attendance")) reads++;
  });
  await page.clock.fastForward(120000);
  expect(reads).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("tab", { name: "Điểm danh", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: "test-results/attendance-teacher-mobile.png",
    fullPage: true,
  });
});
test("off-schedule requires reason, manager controls stay read-only", async ({
  page,
}) => {
  await fixture(page, false);
  await login(page);
  await expect(
    page.getByRole("checkbox", { name: /Có mặt:/ }).first(),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Ghim lịch học bù / học thêm", exact: true })
    .first()
    .click();
  await page.getByLabel("Ghi chú / lý do").fill("Ôn tập");
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: /Có mặt:/ }).first(),
  ).toBeEnabled();
  await page.evaluate(() => sessionStorage.clear());
  await login(page, "MG0001");
  await expect(
    page.getByRole("checkbox", { name: /Có mặt:/ }).first(),
  ).toBeDisabled();
  await expect(
    page
      .getByText(
        "Chỉ xem. Giảng viên đang phụ trách lớp mới được thêm hoặc sửa điểm danh.",
      )
      .first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/attendance-manager-readonly.png",
    fullPage: true,
  });
});
