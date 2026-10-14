import { test, expect, type Page } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import type { Assignment } from "../src/features/assignments/models";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const assignment: Assignment = {
  id: "assignment-preview",
  classId: "class-green",
  postId: "post-preview",
  sessionId: null,
  unitNumber: 1,
  title: "Bài tập xem trước",
  instructions: "Chọn câu trả lời đúng",
  status: "DRAFT",
  deadline: null,
  allowLate: true,
  publishedAt: null,
  version: 1,
  assignmentVersionId: "version-preview",
  schemaVersion: 1,
  canEdit: true,
  canEditSchema: true,
  totalMax: 1,
  questions: [
    {
      id: "q-one",
      type: "SINGLE",
      content: "Một cộng một bằng bao nhiêu?",
      instructions: "",
      rubric: "Tiêu chí nội bộ",
      maxScore: 1,
      order: 0,
      allowUploadedAudio: true,
      maxDurationSeconds: 60,
      media: [],
      options: [
        { id: "opt-1", content: "Hai", isCorrect: true, order: 0, media: [] },
        { id: "opt-2", content: "Ba", isCorrect: false, order: 1, media: [] },
      ],
    },
  ],
};
async function setup(page: Page, id = "GV0001") {
  await installHttpFixture(page);
  const counts = { writes: 0, reads: 0, submissions: 0 };
  await page.route("**/assignments/assignment-preview**", async (r) => {
    const req = r.request(),
      headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization,content-type,x-workspace",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      };
    if (req.method() === "OPTIONS") return r.fulfill({ status: 204, headers });
    if (req.method() !== "GET") {
      counts.writes++;
      return r.fulfill({
        status: 500,
        headers,
        json: {
          error: {
            code: "UNEXPECTED_WRITE",
            message: "Không được lưu trong test hủy",
          },
        },
      });
    }
    if (new URL(req.url()).pathname.endsWith("/submissions")) {
      counts.submissions++;
      return r.fulfill({
        headers,
        json: {
          data: {
            items: [],
            nextCursor: null,
            summary: {
              assigned: 2,
              submitted: 0,
              awaitingGrading: 0,
              graded: 0,
              notSubmitted: 2,
            },
          },
        },
      });
    }
    counts.reads++;
    return r.fulfill({ headers, json: { data: assignment } });
  });
  page.on("request", (r) => {
    if (
      r.method() === "POST" &&
      r.url().includes("/classes/class-green/assignments")
    )
      counts.writes++;
  });
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill(id);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/home\//);
  return counts;
}
test("teacher opens preview, edits only via icon, cancels without writing or retaining changes", async ({
  page,
}) => {
  const counts = await setup(page);
  await page.goto(
    `${base}/assignment/?classId=class-green&assignmentId=assignment-preview`,
  );
  await expect(
    page.getByRole("heading", { name: assignment.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(assignment.questions[0].content, { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Tiêu chí nội bộ", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("link", { name: "Quay lại", exact: true }),
  ).toBeVisible();
  expect(counts.submissions).toBe(0);
  await page.clock.install();
  await page.getByText("Hai", { exact: true }).click();
  await page.clock.fastForward(2000);
  expect(counts.writes).toBe(0);
  await page
    .getByRole("link", { name: "Chỉnh sửa bài tập", exact: true })
    .click();
  await page.getByLabel("Tiêu đề", { exact: true }).fill("Thay đổi sẽ hủy");
  await page
    .getByRole("button", { name: "Hủy, không lưu nháp", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Tiếp tục chỉnh sửa", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    "Thay đổi sẽ hủy",
  );
  await page
    .getByRole("button", { name: "Hủy, không lưu nháp", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hủy, không lưu nháp", exact: true })
    .click();
  await expect(page).not.toHaveURL(/mode=edit/);
  await expect(
    page.getByRole("heading", { name: assignment.title, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Chỉnh sửa bài tập", exact: true })
    .click();
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    assignment.title,
  );
  await page
    .getByRole("button", { name: "Hủy, không lưu nháp", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: assignment.title, exact: true }),
  ).toBeVisible();
  expect(counts.writes).toBe(0);
  expect(counts.reads).toBe(1);
  await page.getByRole("link", { name: "Quay lại", exact: true }).click();
  await expect(page).toHaveURL(/\/class\/thread\//);
});
test("manager previews questions without editing and loads submissions only on demand", async ({
  page,
}) => {
  const counts = await setup(page, "MG0001");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(
    `${base}/assignment/?classId=class-green&assignmentId=assignment-preview`,
  );
  await expect(
    page.getByText(assignment.questions[0].content, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Chỉnh sửa bài tập", exact: true }),
  ).toHaveCount(0);
  expect(counts.submissions).toBe(0);
  await page.getByRole("button", { name: "Xem bài nộp", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Tổng hợp bài nộp" })
      .getByText("0/2", { exact: true }),
  ).toBeVisible();
  expect(counts.submissions).toBe(1);
  expect(counts.writes).toBe(0);
  await page.goto(
    `${base}/assignment/?classId=class-green&assignmentId=assignment-preview&mode=edit`,
  );
  await expect(
    page.getByText(assignment.questions[0].content, { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveCount(0);
  expect(counts.writes).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("canceling a new assignment does not create a server draft", async ({
  page,
}) => {
  const counts = await setup(page);
  await page.goto(`${base}/assignment/?classId=class-green&mode=create`);
  await page.getByLabel("Tiêu đề", { exact: true }).fill("Bài chưa lưu");
  await page
    .getByRole("button", { name: "Hủy, không lưu nháp", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hủy, không lưu nháp", exact: true })
    .click();
  await expect(page).toHaveURL(/\/class\/thread\//);
  expect(counts.writes).toBe(0);
});
