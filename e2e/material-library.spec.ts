import { test, expect, type Page } from "@playwright/test";
import { installHttpFixture } from "./support/http-fixture";
import type {
  MaterialFile,
  Post,
  Folder,
} from "../src/features/materials/models";
const api = process.env.NEXT_PUBLIC_API_BASE_URL!;
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
function samplePdf() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 150] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    "<< /Length 39 >>\nstream\nBT /F1 18 Tf 20 100 Td (ESS test) Tj ET\nendstream",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let text = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(text));
    text += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const start = Buffer.byteLength(text);
  text += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(text);
}
const file = (id: string, folderId: string): MaterialFile => ({
  id,
  folderId,
  displayName: `Bài học ${id}.pdf`,
  originalName: `${id}.pdf`,
  mimeType: "application/pdf",
  sizeBytes: 1000,
  authorId: "teacher-green",
  authorName: "Giảng viên",
  uploadedBy: "teacher-green",
  thumbnailUrl: null,
  uploadSource: "library",
  sourceSessionId: null,
  sourcePostId: null,
  status: "AVAILABLE",
  version: 1,
  createdAt: "2026-10-06T00:00:00Z",
  updatedAt: "2026-10-06T00:00:00Z",
});
async function fixture(page: Page) {
  await installHttpFixture(page);
  const folders: Folder[] = [
      {
        id: "one",
        parentId: null,
        name: "Juniors",
        kind: "PROGRAM",
        version: 1,
      },
      {
        id: "two",
        parentId: "one",
        name: "Level 1",
        kind: "LEVEL",
        version: 1,
      },
      {
        id: "three",
        parentId: "two",
        name: "Unit 1",
        kind: "CUSTOM",
        version: 1,
      },
    ],
    files = [file("a", "one"), file("b", "two")];
  const posts: Post[] = [];
  const signedRequests: {
    authorization: string | undefined;
    mime: string | undefined;
  }[] = [];
  await page.route("https://files.example.test/pdf", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      contentType: "application/pdf",
      body: samplePdf(),
    }),
  );
  await page.route("https://uploads.example.test/**", async (route) => {
    if (route.request().method() === "PUT")
      signedRequests.push({
        authorization: route.request().headers()["authorization"],
        mime: route.request().headers()["content-type"],
      });
    await route.fulfill({
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "PUT,OPTIONS",
      },
      body: "",
    });
  });
  await page.route(`${api}/**`, async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname.replace(new URL(api).pathname, ""),
      method = route.request().method();
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization,content-type,x-workspace,prefer,idempotency-key",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    };
    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    let data: unknown;
    if (path === "/material-folders")
      data = {
        items: folders.filter(
          (f) => f.parentId === (url.searchParams.get("parentId") || null),
        ),
        nextCursor: null,
      };
    else if (/^\/material-folders\/[^/]+\/path$/.test(path)) {
      const id = path.split("/")[2];
      const result: Folder[] = [];
      let f = folders.find((f) => f.id === id);
      while (f) {
        result.unshift(f);
        f = folders.find((x) => x.id === f?.parentId);
      }
      data = { items: result, nextCursor: null };
    } else if (path === "/materials")
      data = {
        items: files.filter(
          (f) => f.folderId === url.searchParams.get("folderId"),
        ),
        nextCursor: null,
      };
    else if (path === "/notifications")
      data = { items: [], nextCursor: null, unreadCount: 0 };
    else if (path === "/storage-alerts") data = { items: [], nextCursor: null };
    else if (path === "/materials/a/content") {
      expect(route.request().headers().authorization).toMatch(/^Bearer /);
      await route.fulfill({status:200,headers:cors,contentType:"application/pdf",body:samplePdf()});return;
    }
    else if (path === "/materials/a/access-url")
      data = {
        url: "https://files.example.test/pdf",
        expiresAt: "2099-01-01T00:00:00Z",
      };
    else if (path === "/material-upload-settings")
      data = {
        maxUploadBytes: 10000,
        largeFileWarningBytes: 9000,
        areas: ["DOCUMENTS", "AUDIO", "CURRICULUM", "TESTS", "IMAGES", "OTHER"],
      };
    else if (path === "/material-uploads/initiate") {
      const input = route.request().postDataJSON();
      if (input.sizeBytes > 50) {
        await route.fulfill({
          status: 422,
          headers: cors,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "STORAGE_FULL",
              message: "Storage không đủ dung lượng.",
            },
          }),
        });
        return;
      }
      data = {
        uploadId: "uploaded",
        uploadUrl: "https://uploads.example.test/file",
        thumbnailUploadUrl: null,
        method: "PUT",
        headers: { "Content-Type": input.mimeType },
        expiresAt: "2099-01-01T00:00:00Z",
        version: 1,
      };
    } else if (path === "/material-uploads/uploaded/complete") {
      const uploaded = {
        ...file("uploaded", "one"),
        folderId: null,
        displayName: "notes.txt",
        originalName: "notes.txt",
        mimeType: "text/plain",
        sizeBytes: 12,
      };
      files.push(uploaded);
      data = uploaded;
    } else if (path === "/posts/new-post/comments") {
      if (method === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 900));
        await route.fulfill({
          status: 409,
          headers: cors,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "VERSION_CONFLICT",
              message: "Bình luận chưa lưu; hãy thử lại.",
            },
          }),
        });
        return;
      }
      data = { items: [], nextCursor: null };
    } else if (path === "/sessions/session-3/posts") {
      if (method === "POST") {
        const body = route.request().postDataJSON();
        const p: Post = {
          ...body,
          id: "new-post",
          sessionId: "session-3",
          classId: "class-green",
          authorId: "teacher-green",
          authorName: "Giảng viên",
          publishedBy: "teacher-green",
          publisherName: "Giảng viên",
          createdAt: "2026-10-06T00:00:00Z",
          updatedAt: "2026-10-06T00:00:00Z",
          reactions: [],
          myReaction: null,
          commentCount: 0,
          attachments: body.attachments.map(
            (a: { materialId: string; group: string }) => ({
              ...a,
              available: true,
              file: files.find((f) => f.id === a.materialId),
            }),
          ),
        };
        posts.push(p);
        data = p;
      } else data = { items: posts, nextCursor: null };
    } else if (path === "/posts/new-post/reaction") {
      await route.fulfill({
        status: 409,
        headers: cors,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "VERSION_CONFLICT",
            message: "Dữ liệu đã đổi, thử lại.",
          },
        }),
      });
      return;
    } else {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: cors,
      contentType: "application/json",
      body: JSON.stringify({ data }),
    });
  });
  return signedRequests;
}
async function login(page: Page, id = "GV0001") {
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill(id);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/home\//);
}
test("manager folder actions use ellipsis and physical deletion reviews usage", async ({ page }) => {
  await fixture(page);
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type,x-workspace", "Access-Control-Allow-Methods": "GET,DELETE,OPTIONS" };
  let removed = false;
  await page.route(`${api}/materials/a/deletion-impact`, async route => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    await route.fulfill({ json: { data: { file: { ...file("a", "one"), thumbnailBytes: 200, storageBytes: 1200 }, usages: [] } }, headers: cors });
  });
  await page.route(`${api}/materials/a`, async route => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const body = route.request().postDataJSON(); expect(body.version).toBe(1); expect(body.linkAction).toBe("DETACH"); expect(body.reason).toBe("Không sử dụng"); removed = true;
    await route.fulfill({ json: { data: { id: "a", status: "DELETING" } }, headers: cors });
  });
  await page.route(`${api}/materials?**`, async route => { const folder = new URL(route.request().url()).searchParams.get("folderId"); await route.fulfill({ json: { data: { items: folder === "one" && !removed ? [file("a", "one")] : [], nextCursor: null } }, headers: cors }); });
  await login(page, "MG0001"); await page.goto(`${base}/materials/`);
  await expect(page.getByRole("button", { name: "Sửa thư mục Juniors" })).toHaveCount(0);
  await page.getByRole("button", { name: "Thao tác thư mục Juniors" }).click();
  await expect(page.getByRole("menuitem", { name: "Sửa thư mục" })).toBeVisible(); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Juniors", exact: true }).click();
  await page.getByRole("button", { name: "Thông tin Bài học a.pdf" }).click(); await page.getByRole("button", { name: "Xóa tài liệu", exact: true }).click();
  const dialog = page.getByRole("dialog"); await expect(dialog.getByText(/Thumbnail: 200/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Xác nhận xóa" })).toBeDisabled();
  await dialog.getByLabel("Lý do xóa").fill("Không sử dụng"); await dialog.getByRole("checkbox").check(); await dialog.getByRole("button", { name: "Xác nhận xóa" }).click();
  await expect(page.getByText(/Đã ẩn tài liệu/)).toBeVisible(); await expect(page.getByRole("checkbox", { name: "Chọn Bài học a.pdf" })).toHaveCount(0); expect(removed).toBeTruthy();
});
test("grid across nested folders, tree selection and mobile bounds", async ({
  page,
}) => {
  await fixture(page);
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/materials/`);
  await page.getByRole("button", { name: "Juniors", exact: true }).click();
  await page.getByRole("checkbox", { name: "Chọn Bài học a.pdf" }).check();
  await page.getByRole("button", { name: "Level 1", exact: true }).click();
  await page.getByRole("checkbox", { name: "Chọn Bài học b.pdf" }).check();
  await expect(page.getByText("2 file đã chọn")).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((e) => e.clientWidth),
  );
  await page.screenshot({
    path: "test-results/materials-mobile-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Giao diện", exact: true }).click();
  await page.getByRole("menuitem", { name: "Tối", exact: true }).click();
  await page.screenshot({
    path: "test-results/materials-mobile-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cây thư mục", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Chọn Bài học b.pdf" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Thư mục", exact: true }).click();
  await page.getByRole("button", { name: "Unit 1", exact: true }).click();
  await expect(page.getByText("2 file đã chọn")).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((e) => e.clientWidth),
  );
});
test("picker attaches files across folders; draft survives tabs; reaction rolls back", async ({
  page,
}) => {
  await fixture(page);
  await login(page);
  await page.goto(`${base}/session/?classId=class-green&sessionId=session-3`);
  await expect(page.getByRole("tab")).toHaveCount(2);
  await page.getByRole("button", { name: "+ Đăng bài", exact: true }).click();
  await page.getByLabel("Tiêu đề", { exact: true }).fill("Hướng dẫn Unit 1");
  await page.getByLabel("Nội dung / hướng dẫn").fill("Xem trang 1–2.");
  await page
    .getByRole("button", { name: "Thêm từ kho", exact: true })
    .last()
    .click();
  const picker = page.getByRole("dialog").last();
  await picker.getByRole("button", { name: "Juniors", exact: true }).click();
  await picker.getByRole("checkbox", { name: "Chọn Bài học a.pdf" }).check();
  await picker.getByRole("button", { name: "Level 1", exact: true }).click();
  await picker.getByRole("checkbox", { name: "Chọn Bài học b.pdf" }).check();
  await picker.getByRole("button", { name: "Thêm 2 file vào bài" }).click();
  await page.getByRole("button", { name: "Đóng / giữ nháp" }).click();
  await page.getByRole("tab", { name: "Bài kiểm tra", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bài đánh giá", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Tài liệu", exact: true }).click();
  await page.getByRole("button", { name: "+ Đăng bài", exact: true }).click();
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    "Hướng dẫn Unit 1",
  );
  await page.getByRole("button", { name: "Lưu bài", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hướng dẫn Unit 1" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "👍 Thích", exact: true }).click();
  await expect(page.getByText("Dữ liệu đã đổi, thử lại.")).toBeVisible();
  await expect(page.getByText(/Chưa có tương tác/)).toBeVisible();
  const commentsLoaded = page.waitForResponse(
    (r) =>
      r.url().includes("/posts/new-post/comments") &&
      r.request().method() === "GET",
  );
  await page
    .getByRole("button", { name: "Bình luận (0)", exact: true })
    .click();
  await commentsLoaded;
  await page.getByLabel("Viết bình luận").fill("Bản nháp bình luận cần giữ");
  await page
    .getByRole("button", { name: "Gửi bình luận", exact: true })
    .click();
  await expect(
    page.locator("p").filter({ hasText: /^Bản nháp bình luận cần giữ$/ }),
  ).toHaveCount(1);
  await expect(
    page.getByText("Bình luận chưa lưu; hãy thử lại."),
  ).toBeVisible();
  await expect(page.getByLabel("Viết bình luận")).toHaveValue(
    "Bản nháp bình luận cần giữ",
  );
  await expect(
    page.locator("p").filter({ hasText: /^Bản nháp bình luận cần giữ$/ }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/session-desktop-light.png",
    fullPage: true,
  });
});
test("signed uploads send no JWT, complete and surface quota errors per file", async ({
  page,
}) => {
  const signed = await fixture(page);
  await login(page);
  await page.goto(`${base}/materials/`);
  await page
    .getByRole("button", { name: "Upload vào kho", exact: true })
    .click();
  await page.locator('input[type="file"]').setInputFiles([
    {
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Hello world!"),
    },
    { name: "large.txt", mimeType: "text/plain", buffer: Buffer.alloc(60, 65) },
  ]);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Tải các file đã chọn", exact: true })
    .click();
  await expect(page.getByText("Đã tải và xác minh")).toBeVisible();
  await expect(page.getByText("Storage không đủ dung lượng.")).toBeVisible();
  expect(signed).toEqual([{ authorization: undefined, mime: "text/plain" }]);
  await page.getByRole("button", { name: "Hủy file", exact: true }).click();
  await page.getByRole("button", { name: "Đóng", exact: true }).last().click();
  await expect(
    page.getByRole("checkbox", { name: "Chọn notes.txt" }),
  ).toBeVisible();
});
test("PDF viewer loads static worker under basePath and zooms without selecting the file", async ({
  page,
}) => {
  await fixture(page);
  await login(page);
  await page.goto(`${base}/materials/`);
  await page.getByRole("button", { name: "Juniors", exact: true }).click();
  await page
    .getByRole("button", { name: "Xem Bài học a.pdf", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("1/1", { exact: true })).toBeVisible();
  await expect.poll(() => dialog.locator("canvas").evaluate(node => {
    const canvas = node as HTMLCanvasElement;
    return canvas.width > 0 && Math.abs(canvas.width / canvas.height - 2) < 0.02 && canvas.height <= window.innerHeight * 0.69;
  })).toBe(true);
  await dialog.getByRole("button", {name: "Cuộn dọc", exact: true}).click();
  await expect(dialog.getByRole("button", {name: "Lật trang", exact: true})).toBeVisible();
  await dialog.getByRole("button", {name: "Toàn màn hình", exact: true}).click();
  await expect(dialog.getByRole("button", {name: "Thu về cửa sổ", exact: true})).toBeVisible();
  await dialog.getByRole("button", { name: "+", exact: true }).click();
  await expect(dialog.getByText("125%", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Chọn Bài học a.pdf" }),
  ).not.toBeChecked();
});
