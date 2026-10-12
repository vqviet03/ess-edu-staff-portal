import { test, expect } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import type { Assignment } from "../src/features/assignments/models";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const assignment: Assignment = {
  id: "assignment-design",
  classId: "class-green",
  postId: "post-design",
  sessionId: null,
  unitNumber: 1,
  title: "Khám phá đại dương",
  instructions: "Hoàn thành bài tập",
  status: "DRAFT",
  deadline: null,
  allowLate: true,
  publishedAt: null,
  version: 1,
  assignmentVersionId: "version-design",
  schemaVersion: 1,
  canEdit: true,
  canEditSchema: true,
  totalMax: 3,
  questions: [
    {
      id: "question-one",
      type: "SINGLE",
      content: "Which animal lives in the sea?",
      instructions: "",
      rubric: "",
      maxScore: 1,
      order: 0,
      allowUploadedAudio: true,
      maxDurationSeconds: 60,
      options: [
        {
          id: "option-a",
          content: "A fish",
          isCorrect: true,
          order: 0,
          media: [],
        },
        {
          id: "option-b",
          content: "A cat",
          isCorrect: false,
          order: 1,
          media: [],
        },
      ],
      media: [],
    },
    {
      id: "question-two",
      type: "TEXT",
      content: "Viết câu trả lời",
      instructions: "",
      rubric: "",
      maxScore: 2,
      order: 1,
      allowUploadedAudio: true,
      maxDurationSeconds: 60,
      options: [],
      media: [],
    },
  ],
};
test("builder follows Figma grid and keeps rich content, question navigation and mobile theme working", async ({
  page,
}) => {
  await installHttpFixture(page);
  await page.route("**/classes/class-green/access", (r) =>
    r.fulfill({
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization,content-type,x-workspace",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
      json: {
        data: {
          classId: "class-green",
          canView: true,
          assignmentStatus: "ACTIVE",
          assignmentConfirmed: true,
          classStatus: "ACTIVE",
          profileStatus: "ACTIVE",
          accountStatus: "ACTIVE",
        },
      },
    }),
  );
  await page.route("**/assignments/assignment-design**", (r) =>
    r.fulfill({
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization,content-type,x-workspace",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
      json: { data: assignment },
    }),
  );
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill("GV0001");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/home\//);
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.goto(
    `${base}/assignment/?classId=class-green&assignmentId=assignment-design&mode=edit`,
  );
  await page
    .getByRole("button", { name: "2 Soạn câu hỏi", exact: true })
    .click();
  const sidebar = page.getByTestId("sidebar");
  expect((await sidebar.boundingBox())!.width).toBe(180);
  const input = page.getByRole("textbox", {
    name: "Nội dung câu hỏi",
    exact: true,
  });
  await input.fill("Hãy đọc https://example.com trước.");
  await input.press("Tab");
  await expect(input.locator(".assignment-chip-link")).toHaveText(
    "example.com",
  );
  await page.getByRole("button", { name: "Câu 2 · 2 điểm Tự luận" }).click();
  await expect(input).toHaveText("Viết câu trả lời");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sidebar).toBeHidden();
  await expect(page.getByRole("button", { name: "Câu 2 / 2" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Tuỳ chọn giao diện và tài khoản" })
    .click();
  await page.getByRole("button", { name: "Giao diện", exact: true }).click();
  await page.getByRole("menuitem", { name: "Tối", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.mouse.click(380, 180);
  await expect(page.locator("[data-assignment-surface]").first()).toHaveCSS(
    "color",
    "rgb(228, 243, 234)",
  );
});

test("manager sees the grading summary and purple total but cannot change or publish scores", async ({
  page,
}) => {
  await installHttpFixture(page);
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization,content-type,x-workspace",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
  };
  const result = {
    id: "submission-design",
    assignmentId: assignment.id,
    assignmentVersionId: assignment.assignmentVersionId,
    studentId: "bon",
    studentName: "Hữu Văn",
    studentNickname: "Bon",
    submittedAt: "2026-10-10T12:00:00Z",
    publishedAt: null,
    version: 1,
    status: "GRADED",
    isLate: false,
    totalScore: 3,
    totalMax: 3,
    percentage: 100,
    overallComment: "Đủ ý",
    overallAdvice: "Luyện tập mỗi ngày",
    answers: assignment.questions.map((q) => ({
      questionId: q.id,
      text: q.type === "TEXT" ? "The fish lives in the sea." : "",
      link: "",
      optionIds: q.type === "SINGLE" ? ["option-a"] : [],
      materialIds: [],
      files: [],
    })),
    grades: assignment.questions.map((q) => ({
      questionId: q.id,
      score: q.maxScore,
      automatic: q.type === "SINGLE",
      comment: "Đúng nội dung",
      advice: "",
    })),
  };
  await page.route("**/assignments/assignment-design**", (r) => {
    if (r.request().method() === "OPTIONS")
      return r.fulfill({ status: 204, headers });
    return r.fulfill({
      headers,
      json: {
        data: r.request().url().includes("/submissions/") ? result : assignment,
      },
    });
  });
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill("MG0001");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/home\//);
  await page.goto(
    `${base}/assignment/?classId=class-green&assignmentId=assignment-design&submissionId=submission-design&mode=grade`,
  );
  await expect(
    page.getByRole("heading", { name: "Trắc nghiệm · Tự chấm 1/1" }),
  ).toBeVisible();
  await expect(page.getByLabel("Điểm Câu 2 / 2")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Công bố kết quả" }),
  ).toBeDisabled();
  await expect(page.getByRole("heading", { name: /Điểm cuối/ })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("submission overview renders all four server totals instead of inferring them from the current page", async ({
  page,
}) => {
  await installHttpFixture(page);
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization,content-type,x-workspace",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
  };
  await page.route("**/assignments/assignment-design**", (r) => {
    if (r.request().method() === "OPTIONS")
      return r.fulfill({ status: 204, headers });
    return r.fulfill({
      headers,
      json: {
        data: r.request().url().includes("/submissions")
          ? {
              items: [],
              nextCursor: null,
              summary: {
                assigned: 2,
                submitted: 0,
                awaitingGrading: 0,
                graded: 0,
                notSubmitted: 2,
              },
            }
          : assignment,
      },
    });
  });
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill("MG0001");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/home\//);
  await page.goto(
    `${base}/assignment/?classId=class-green&assignmentId=assignment-design`,
  );
  const region = page.getByRole("region", { name: "Tổng hợp bài nộp" });
  await expect(region.getByText("0/2", { exact: true })).toBeVisible();
  await expect(region.getByText("Chưa nộp", { exact: true })).toBeVisible();
  await expect(region.getByText("2", { exact: true })).toBeVisible();
  expect(await region.locator(".MuiPaper-root").count()).toBe(4);
});
