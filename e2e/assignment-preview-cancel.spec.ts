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

async function acceptanceSetup(page: Page, account = "GV0001") {
  await setup(page, account);
  const form: Assignment = {
    ...assignment,
    status: "PUBLISHED",
    deadline: new Date(Date.now() + 86400000).toISOString(),
    submissionWindow: {
      closed: false,
      lateWindowMinutes: null,
      closesAt: null,
      open: true,
    },
  };
  let sub = {
    id: "submission-one",
    assignmentId: form.id,
    assignmentVersionId: form.assignmentVersionId,
    studentId: "HV001",
    studentName: "Học sinh An",
    studentNickname: "An",
    submittedAt: new Date().toISOString() as string | null,
    publishedAt: null,
    version: 2,
    attempt: 1,
    status: "PENDING_GRADING",
    isLate: false,
    answers: [],
    grades: [],
    overallComment: "",
    overallAdvice: "",
    totalMax: 1,
    totalScore: null,
    percentage: null,
  };
  let writes = 0;
  await page.route("**/assignments/assignment-preview**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    };
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (path.endsWith("/submission-window")) {
      const body = route.request().postDataJSON();
      expect(body.version).toBe(form.version);
      writes++;
      form.submissionWindow = {
        closed: body.closed,
        lateWindowMinutes: body.lateWindowMinutes,
        closesAt: body.lateWindowMinutes
          ? new Date(
              Date.parse(form.deadline!) + body.lateWindowMinutes * 60000,
            ).toISOString()
          : null,
        open: !body.closed,
      };
      form.version++;
      return route.fulfill({ headers, json: { data: form } });
    }
    if (path.endsWith("/reopen")) {
      expect(route.request().postDataJSON()).toMatchObject({
        version: 2,
        reason: "Giảng viên cho phép nộp lại",
      });
      writes++;
      sub = {
        ...sub,
        submittedAt: null,
        version: 3,
        attempt: 2,
        status: "REOPENED",
      };
      return route.fulfill({ headers, json: { data: sub } });
    }
    if (path.endsWith("/submissions"))
      return route.fulfill({
        headers,
        json: {
          data: {
            items: [sub],
            nextCursor: null,
            summary: {
              assigned: 1,
              submitted: sub.submittedAt ? 1 : 0,
              awaitingGrading: sub.submittedAt ? 1 : 0,
              graded: 0,
              notSubmitted: sub.submittedAt ? 0 : 1,
            },
          },
        },
      });
    return route.fulfill({ headers, json: { data: form } });
  });
  await page.goto(
    `${base}/assignment/?classId=class-green&assignmentId=assignment-preview`,
  );
  return { writes: () => writes };
}

test("teacher sets an automatic cutoff, closes manually and reopens an individual submission with confirmation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fixture = await acceptanceSetup(page);
  await page.getByLabel("Đóng sau hạn (phút)").fill("90");
  await page
    .getByRole("button", { name: "Lưu thời gian nhận bài", exact: true })
    .click();
  await expect(page.getByText(/Mốc đóng:/)).toBeVisible();
  expect(fixture.writes()).toBe(1);
  await page
    .getByRole("button", { name: "Đóng nhận bài thủ công", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  expect(fixture.writes()).toBe(1);
  await page
    .getByRole("button", { name: "Đóng nhận bài thủ công", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Mở nhận bài", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xem bài nộp", exact: true }).click();
  await page
    .getByRole("button", { name: "Mở lại bài nộp", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText(/Riêng học sinh này được nộp lại/),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Mở lại bài nộp", exact: true })
    .click();
  await expect(
    page.getByText("Đã mở lại · Chờ nộp lại", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mở lại bài nộp", exact: true }),
  ).toBeDisabled();
  expect(fixture.writes()).toBe(3);
  await expect(
    page.getByRole("button", { name: "Mở nhận bài", exact: true }),
  ).toBeVisible();
});

test("manager sees submission controls read-only and cannot reopen students", async ({
  page,
}) => {
  const fixture = await acceptanceSetup(page, "MG0001");
  await expect(page.getByLabel("Đóng sau hạn (phút)")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Đóng nhận bài thủ công", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Xem bài nộp", exact: true }).click();
  await expect(page.getByText(/Học sinh An/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mở lại bài nộp", exact: true }),
  ).toHaveCount(0);
  expect(fixture.writes()).toBe(0);
});
