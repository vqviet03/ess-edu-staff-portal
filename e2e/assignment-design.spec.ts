import { test, expect } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import type {
  Assignment,
  AssignmentWrite,
} from "../src/features/assignments/models";
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
test("builder keeps the app shell, rich content, question navigation and mobile theme working", async ({
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
  expect((await sidebar.boundingBox())!.width).toBe(220);
  await expect(
    sidebar.getByRole("link", { name: "Kho tài liệu" }),
  ).toBeVisible();
  await expect(
    sidebar.getByRole("link", { name: "Tổng quan" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page
      .locator("header")
      .getByRole("link", { name: "Hồ sơ cá nhân", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator("header")
      .evaluate((el) => el.closest("[data-assignment-surface]") === null),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("builder-desktop.png"),
    fullPage: true,
  });
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
  await expect(sidebar).toBeVisible();
  await expect(page.getByRole("button", { name: "Câu 2 / 2" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Giao diện", exact: true }).click();
  await page.getByRole("menuitem", { name: "Tối", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.mouse.click(380, 180);
  await expect(page.locator("[data-assignment-surface]").first()).toHaveCSS(
    "color",
    "rgb(228, 243, 234)",
  );
  await page.screenshot({
    path: test.info().outputPath("builder-mobile-dark.png"),
    fullPage: true,
  });
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

for (const type of ["SINGLE", "MULTIPLE"] as const) {
  test(`${type} answers expose deletion and labeled media dimensions with original defaults`, async ({
    page,
  }) => {
    await installHttpFixture(page);
    let current = structuredClone(assignment);
    current.questions[0].type = type;
    current.questions[0].options[1].media = [
      {
        materialId: "option-image",
        displayWidth: null,
        displayHeight: null,
        keepAspectRatio: true,
        file: {
          id: "option-image",
          originalName: "answer.svg",
          displayName: "Answer image",
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
      },
    ];
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization,content-type,x-workspace,idempotency-key",
      "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    };
    const writes: AssignmentWrite[] = [];
    await page.route(
      "**/classes/class-green/assignments/assignment-design",
      (route) => {
        if (route.request().method() === "OPTIONS")
          return route.fulfill({ status: 204, headers });
        const body = route.request().postDataJSON() as (typeof writes)[number];
        writes.push(body);
        current = {
          ...current,
          version: current.version + 1,
          questions: current.questions.map((q, i) => ({
            ...q,
            ...body.questions[i],
            media: q.media,
            options: body.questions[i].options.map((o, j) => ({
              ...o,
              id: `saved-option-${j}`,
              order: j,
              media: o.media.map((m) => ({
                ...m,
                file: current.questions[0].options[1].media[0].file,
              })),
            })),
          })),
        };
        return route.fulfill({ headers, json: { data: current } });
      },
    );
    await page.route("**/v1/assignments/assignment-design**", (route) =>
      route.fulfill({ headers, json: { data: current } }),
    );
    await page.route("**/materials/option-image/content**", (route) => {
      if (route.request().method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      return route.fulfill({
        headers,
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="green"/></svg>',
      });
    });
    await page.goto(`${base}/login/`);
    await page.getByLabel("ID giảng viên").fill("GV0001");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/home\//);
    await page.goto(
      `${base}/assignment/?classId=class-green&assignmentId=assignment-design&mode=edit`,
    );
    await page
      .getByRole("button", { name: "2 Soạn câu hỏi", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Thêm lựa chọn", exact: true })
      .click();
    await page.getByLabel("Đáp án 3", { exact: true }).fill("A bird");
    await page
      .getByRole("button", { name: "Xóa đáp án 1", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Hủy", exact: true })
      .click();
    await expect(page.getByLabel("Đáp án 1", { exact: true })).toHaveValue(
      "A fish",
    );
    await page
      .getByRole("button", { name: "Xóa đáp án 3", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Xóa lựa chọn", exact: true })
      .click();
    await expect(page.getByLabel("Đáp án 3", { exact: true })).toHaveCount(0);
    await expect(
      page.getByLabel("Đáp án đúng 1", { exact: true }),
    ).toBeChecked();
    const media = page.locator(".assignment-option").nth(1);
    await media
      .getByText("Chỉnh hiển thị / gỡ tài liệu", { exact: true })
      .click();
    await expect(
      media.getByText(
        "Kích thước mặc định (gốc): 640 × 360 px. Tự co vừa khung hiển thị.",
      ),
    ).toBeVisible();
    const width = media.getByRole("spinbutton", {
      name: "Chiều rộng",
      exact: true,
    });
    const height = media.getByRole("spinbutton", {
      name: "Chiều cao",
      exact: true,
    });
    await expect(width).toHaveAttribute("placeholder", "640");
    await expect(height).toHaveAttribute("placeholder", "360");
    if (type === "SINGLE")
      await page.screenshot({
        path: test.info().outputPath("answer-media-desktop.png"),
        fullPage: true,
      });
    await expect(media.getByText("px", { exact: true })).toHaveCount(2);
    for (const label of await media
      .locator(".assignment-labels label.MuiInputLabel-root")
      .all()) {
      const box = await label.boundingBox();
      expect(box!.width).toBeGreaterThan(40);
      expect(box!.height).toBeGreaterThan(10);
      await expect(label).toHaveCSS("clip-path", "none");
    }
    await width.fill("320");
    await height.fill("180");
    await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].questions[0].options.map((o) => o.content)).toEqual([
      "A fish",
      "A cat",
    ]);
    expect(writes[0].questions[0].options[1].media[0]).toEqual({
      materialId: "option-image",
      displayWidth: 320,
      displayHeight: 180,
      keepAspectRatio: true,
    });
    await expect(
      media.getByRole("img", { name: "Minh họa bài tập" }),
    ).toHaveCSS("width", "320px");
    // Saving returns new option IDs, so the media disclosure starts closed again.
    await media
      .getByText("Chỉnh hiển thị / gỡ tài liệu", { exact: true })
      .click();
    await media
      .getByRole("button", { name: "Kích thước gốc", exact: true })
      .click();
    await expect(width).toHaveValue("");
    await expect(height).toHaveValue("");
    await expect(width).toHaveAttribute("placeholder", "640");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(width).toBeVisible();
    await expect(height).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Xóa đáp án 2", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
    await expect.poll(() => writes.length).toBe(2);
    expect(writes[1].questions[0].options[1].media[0]).toEqual({
      materialId: "option-image",
      displayWidth: null,
      displayHeight: null,
      keepAspectRatio: true,
    });
  });
}
