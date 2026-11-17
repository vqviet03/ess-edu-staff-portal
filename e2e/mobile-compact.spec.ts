import { test, expect, type Page } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import type { Assignment } from "../src/features/assignments/models";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
async function login(page: Page, id = "GV0001") {
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill(id);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/home\//);
}
for (const width of [320, 390]) {
  test(`mobile ${width}: compact statistics, whole class card and return navigation`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await installHttpFixture(page);
    await login(page);
    const link = page.getByRole("link", { name: /^Mở lớp / }).first();
    await expect(link).toBeVisible();
    const box = await link.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.y).toBeLessThan(650);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    if (width === 390) {
      await page.screenshot({
        path: test.info().outputPath("classes-390-light.png"),
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Giao diện", exact: true })
        .click();
      await page.getByRole("menuitem", { name: "Tối", exact: true }).click();
      await page.screenshot({
        path: test.info().outputPath("classes-390-dark.png"),
        fullPage: true,
      });
    }
    await link.click();
    await expect(page).toHaveURL(/\/class\//);
    await page.goBack();
    await expect(link).toBeVisible();
  });
}
const assignment: Assignment = {
  id: "compact-assignment",
  classId: "class-green",
  postId: "compact-post",
  sessionId: null,
  unitNumber: 5,
  title: "Ôn tập Unit 5",
  instructions: "Chọn câu đúng",
  status: "DRAFT",
  deadline: null,
  allowLate: false,
  publishedAt: null,
  version: 1,
  assignmentVersionId: "compact-version",
  schemaVersion: 1,
  canEdit: true,
  canEditSchema: true,
  totalMax: 1,
  questions: [
    {
      id: "compact-question",
      type: "SINGLE",
      content: "Where is the eagle?",
      instructions: "Chọn một đáp án.",
      rubric: "Riêng giảng viên",
      maxScore: 1,
      order: 0,
      allowUploadedAudio: true,
      maxDurationSeconds: 60,
      media: [],
      options: [
        {
          id: "a",
          content: "In the tree",
          isCorrect: true,
          order: 0,
          media: [],
        },
        {
          id: "b",
          content: "In the hive",
          isCorrect: false,
          order: 1,
          media: [],
        },
      ],
    },
  ],
};
for (const id of ["GV0001", "MG0001"]) {
  test(`${id}: top actions, collapsible preview and teacher answer keys without draft requests`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installHttpFixture(page);
    let writes = 0,
      drafts = 0,
      submissions = 0;
    await page.route("**/assignments/compact-assignment**", async (route) => {
      const req = route.request(),
        headers = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization,content-type,x-workspace",
        };
      if (req.method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      if (req.method() !== "GET") writes++;
      if (req.url().endsWith("/draft")) drafts++;
      if (req.url().endsWith("/submissions")) submissions++;
      return route.fulfill({ headers, json: { data: assignment } });
    });
    await login(page, id);
    await page.goto(
      `${base}/assignment/?classId=class-green&assignmentId=compact-assignment`,
    );
    const action = page.getByRole("button", {
      name: "Xem bài nộp",
      exact: true,
    });
    const question = page.getByRole("button", { name: /Câu 1/ });
    await expect(question).toBeVisible();
    expect((await action.boundingBox())!.y).toBeLessThan(
      (await question.boundingBox())!.y,
    );
    await expect(page.getByText("Đáp án đúng", { exact: true })).toHaveCount(
      id === "GV0001" ? 1 : 0,
    );
    await expect(page.getByRole("radio")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Thu gọn tất cả", exact: true })
      .click();
    await expect(page.getByText("In the tree", { exact: true })).toHaveCount(0);
    await question.click();
    await expect(page.getByText("In the tree", { exact: true })).toBeVisible();
    await question.click();
    await page
      .getByRole("button", { name: "Mở rộng tất cả", exact: true })
      .click();
    await expect(page.getByText("In the tree", { exact: true })).toBeVisible();
    expect(writes).toBe(0);
    expect(drafts).toBe(0);
    expect(submissions).toBe(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await page.screenshot({
      path: test.info().outputPath(`assignment-${id}-390.png`),
      fullPage: true,
    });
  });
}
