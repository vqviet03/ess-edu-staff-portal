import { test, expect, type Page } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import { confirmAppDialog } from "./support/app-dialog";
import type { Assignment } from "../src/features/assignments/models";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization,content-type,x-workspace,idempotency-key",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
};
const image = {
  materialId: "question-image",
  displayWidth: null,
  displayHeight: null,
  keepAspectRatio: true,
  file: {
    id: "question-image",
    originalName: "beach.svg",
    displayName: "Bãi biển",
    mimeType: "image/svg+xml",
    sizeBytes: 150,
    thumbnailUrl: null,
    folderId: null,
    authorId: "GV0001",
    authorName: "Teacher",
    uploadedBy: "GV0001",
    uploadSource: "assignment",
    sourceSessionId: null,
    sourcePostId: null,
    status: "AVAILABLE",
    version: 1,
    createdAt: "2026-10-10T00:00:00Z",
    updatedAt: "2026-10-10T00:00:00Z",
  },
};
const assignment: Assignment = {
  id: "assignment-review",
  classId: "class-green",
  postId: "post-review",
  sessionId: null,
  unitNumber: 1,
  title: "Biển và động vật",
  instructions: "",
  status: "PUBLISHED",
  deadline: null,
  allowLate: true,
  publishedAt: "2026-10-09T00:00:00Z",
  version: 2,
  assignmentVersionId: "version-review",
  schemaVersion: 1,
  canEdit: true,
  canEditSchema: false,
  totalMax: 4,
  questions: [
    {
      id: "q-sea",
      type: "SINGLE",
      content: "Which animal lives in the sea?",
      instructions: "",
      rubric: "",
      maxScore: 2,
      order: 0,
      allowUploadedAudio: true,
      maxDurationSeconds: 60,
      options: [
        { id: "fish", content: "A fish", isCorrect: true, order: 0, media: [] },
        { id: "cat", content: "A cat", isCorrect: false, order: 1, media: [] },
      ],
      media: [image],
    },
    {
      id: "q-colour",
      type: "SINGLE",
      content: "What colour is the sky?",
      instructions: "",
      rubric: "",
      maxScore: 2,
      order: 1,
      allowUploadedAudio: true,
      maxDurationSeconds: 60,
      options: [
        { id: "blue", content: "Blue", isCorrect: true, order: 0, media: [] },
        { id: "red", content: "Red", isCorrect: false, order: 1, media: [] },
      ],
      media: [],
    },
  ],
} as unknown as Assignment;
const submission = (
  id: string,
  name: string,
  status: "GRADED" | "PENDING_GRADING" | "PUBLISHED",
  picks: string[] = ["cat", "blue"],
) => ({
  id,
  assignmentId: assignment.id,
  assignmentVersionId: assignment.assignmentVersionId,
  studentId: id,
  studentName: name,
  studentNickname: null,
  submittedAt: "2026-10-10T12:00:00Z",
  publishedAt: status === "PUBLISHED" ? "2026-10-11T00:00:00Z" : null,
  version: 3,
  attempt: 1,
  reopenedAt: null,
  submissionOpen: false,
  status,
  isLate: false,
  totalScore: status === "PENDING_GRADING" ? null : 2,
  totalMax: 4,
  percentage: status === "PENDING_GRADING" ? null : 50,
  overallComment: "",
  overallAdvice: "",
  answers: assignment.questions.map((q, i) => ({
    questionId: q.id,
    text: "",
    link: "",
    optionIds: [picks[i]],
    materialIds: [],
    files: [],
  })),
  grades: assignment.questions.map((q, i) => ({
    questionId: q.id,
    score:
      status === "PENDING_GRADING" && i
        ? null
        : picks[i] === "fish" || picks[i] === "blue"
          ? q.maxScore
          : 0,
    automatic: true,
    comment: "",
    advice: "",
  })),
});
async function login(page: Page) {
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill("GV0001");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/home\//);
}

for (const width of [1440, 390]) {
  test(`teacher publishes one graded row or all graded results from the list at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await installHttpFixture(page);
    const rows = [
      submission("s-an", "Nguyễn An", "GRADED"),
      submission("s-binh", "Trần Bình", "PENDING_GRADING"),
      submission("s-chi", "Lê Chi", "GRADED"),
      submission("s-dung", "Phạm Dũng", "PUBLISHED"),
    ];
    const calls: string[] = [];
    await page.route("**/v1/assignments/assignment-review**", (r) => {
      const req = r.request(),
        path = new URL(req.url()).pathname.split(
          "/assignments/assignment-review",
        )[1];
      if (req.method() === "OPTIONS")
        return r.fulfill({ status: 204, headers });
      if (req.method() === "POST" && path === "/submissions/publish") {
        calls.push("ALL");
        const ready = rows.filter((s) => s.status === "GRADED");
        ready.forEach((s) => {
          s.status = "PUBLISHED";
          s.publishedAt = "2026-11-19T00:00:00Z";
        });
        return r.fulfill({
          headers,
          json: {
            data: {
              published: ready.length,
              awaitingGrading: rows.filter(
                (s) => s.status === "PENDING_GRADING",
              ).length,
              remaining: false,
            },
          },
        });
      }
      const one = path.match(/^\/submissions\/([^/]+)\/publish$/);
      if (req.method() === "POST" && one) {
        const row = rows.find((s) => s.id === one[1])!;
        calls.push(row.id);
        expect(req.postDataJSON()).toEqual({ version: 3 });
        row.status = "PUBLISHED";
        row.publishedAt = "2026-11-19T00:00:00Z";
        return r.fulfill({ headers, json: { data: row } });
      }
      if (path.startsWith("/submissions"))
        return r.fulfill({
          headers,
          json: {
            data: {
              items: rows,
              nextCursor: null,
              summary: {
                assigned: 5,
                submitted: 4,
                awaitingGrading: 1,
                graded: 3,
                notSubmitted: 1,
              },
            },
          },
        });
      return r.fulfill({ headers, json: { data: assignment } });
    });
    await login(page);
    await page.goto(
      `${base}/assignment/?classId=class-green&assignmentId=assignment-review`,
    );
    await page
      .getByRole("button", { name: "Xem bài nộp", exact: true })
      .click();
    // Only results that are fully graded and not yet published get a row button.
    const rowButtons = page.getByRole("button", {
      name: /^Công bố kết quả của /,
    });
    await expect(rowButtons).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: "Công bố kết quả của Trần Bình" }),
    ).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`publish-list-${width}.png`),
    });
    await page
      .getByRole("button", { name: "Công bố kết quả của Nguyễn An" })
      .click();
    await expect(
      page.getByText("Đã công bố kết quả của Nguyễn An."),
    ).toBeVisible();
    await expect(rowButtons).toHaveCount(1);
    // The row button publishes without opening the grading page.
    await expect(page).toHaveURL(
      /assignmentId=assignment-review(?!.*submissionId)/,
    );

    await page
      .getByRole("button", { name: "Công bố tất cả bài đã chấm", exact: true })
      .click();
    await page.screenshot({
      path: info.outputPath(`publish-all-confirm-${width}.png`),
    });
    await confirmAppDialog(page, { message: /Bài còn chờ chấm được giữ lại/ });
    await expect(
      page.getByText("Đã công bố 1 bài. 1 bài còn chờ chấm."),
    ).toBeVisible();
    await expect(rowButtons).toHaveCount(0);
    expect(calls).toEqual(["s-an", "ALL"]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("manager view has no publish buttons", async ({ page }) => {
  await installHttpFixture(page);
  await page.route("**/v1/assignments/assignment-review**", (r) =>
    r.request().method() === "OPTIONS"
      ? r.fulfill({ status: 204, headers })
      : r.fulfill({
          headers,
          json: {
            data: r.request().url().includes("/submissions")
              ? {
                  items: [submission("s-an", "Nguyễn An", "GRADED")],
                  nextCursor: null,
                  summary: {
                    assigned: 1,
                    submitted: 1,
                    awaitingGrading: 0,
                    graded: 1,
                    notSubmitted: 0,
                  },
                }
              : { ...assignment, canEdit: false },
          },
        }),
  );
  await login(page);
  await page.goto(
    `${base}/assignment/?classId=class-green&assignmentId=assignment-review`,
  );
  await page.getByRole("button", { name: "Xem bài nộp", exact: true }).click();
  await expect(page.getByText("Nguyễn An").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Công bố/ })).toHaveCount(0);
});

for (const width of [1440, 390]) {
  test(`review shows each question, the pick and the right answer, with attachments folded at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await installHttpFixture(page);
    const result = submission("s-an", "Nguyễn An", "GRADED");
    let imageLoads = 0;
    await page.route("**/v1/assignments/assignment-review**", (r) =>
      r.request().method() === "OPTIONS"
        ? r.fulfill({ status: 204, headers })
        : r.fulfill({
            headers,
            json: {
              data: r.request().url().includes("/submissions/")
                ? result
                : assignment,
            },
          }),
    );
    await page.route("**/materials/question-image/content**", (r) => {
      if (r.request().method() === "OPTIONS")
        return r.fulfill({ status: 204, headers });
      imageLoads++;
      return r.fulfill({
        headers,
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="teal"/></svg>',
      });
    });
    await login(page);
    await page.goto(
      `${base}/assignment/?classId=class-green&assignmentId=assignment-review&submissionId=s-an&mode=grade`,
    );
    const auto = page
      .locator("section, div")
      .filter({
        has: page.getByRole("heading", { name: /Trắc nghiệm · Tự chấm/ }),
      })
      .last();
    await expect(
      auto.getByText("Which animal lives in the sea?"),
    ).toBeVisible();
    await expect(auto.getByText("What colour is the sky?")).toBeVisible();
    // Wrong pick: the student's choice and the right answer are both shown.
    await expect(auto.getByText("Học sinh chọn")).toHaveCount(2);
    await expect(auto.getByText("Đáp án đúng")).toHaveCount(1);
    await expect(auto.getByText("A cat", { exact: true })).toBeVisible();
    await expect(auto.getByText("A fish", { exact: true })).toBeVisible();
    await expect(auto.getByText("Red", { exact: true })).toHaveCount(0);
    // Question images start folded and are only fetched once opened.
    const toggle = auto.getByRole("button", {
      name: /Hình \/ tệp đính kèm của đề \(1\)/,
    });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(
      auto.getByRole("img", { name: "Minh họa bài tập" }),
    ).toHaveCount(0);
    expect(imageLoads).toBe(0);
    await page.screenshot({
      path: info.outputPath(`review-collapsed-${width}.png`),
      fullPage: true,
    });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(
      auto.getByRole("img", { name: "Minh họa bài tập" }),
    ).toBeVisible();
    await expect.poll(() => imageLoads).toBeGreaterThan(0);
    await page.screenshot({
      path: info.outputPath(`review-expanded-${width}.png`),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
