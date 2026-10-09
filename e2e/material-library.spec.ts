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
async function fixture(page: Page, withPost = false) {
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
    files = [
      file("a", "one"),
      file("b", "two"),
      {
        ...file("audio", "one"),
        displayName: "Listening Unit 3.wav",
        mimeType: "audio/wav",
        sizeBytes: 160044,
      },
    ];
  let actorId = "GV0001";
  const posts: Post[] = withPost
    ? [
        {
          id: "new-post",
          classId: "class-green",
          sessionId: null,
          postType: "ANNOUNCEMENT",
          title: "Thông báo của lớp",
          body: "Thông tin cần biết",
          status: "PUBLISHED",
          authorId: actorId,
          authorName: "Nguyễn Minh Anh",
          publishedBy: actorId,
          publisherName: "Nguyễn Minh Anh",
          createdAt: "2026-10-08T08:00:00Z",
          updatedAt: "2026-10-08T08:00:00Z",
          version: 1,
          canEdit: true,
          canDelete: true,
          attachments: [],
          reactions: [],
          myReaction: null,
          commentCount: 0,
        },
      ]
    : [];
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
    if (path === "/auth/login") {
      actorId = route.request().postDataJSON().teacherId;
      await route.fallback();
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
    else if (path === "/materials/audio/content") {
      expect(route.request().headers().authorization).toMatch(/^Bearer /);
      const wav = Buffer.alloc(160044);
      wav.write("RIFF");
      wav.writeUInt32LE(160036, 4);
      wav.write("WAVEfmt ", 8);
      wav.writeUInt32LE(16, 16);
      wav.writeUInt16LE(1, 20);
      wav.writeUInt16LE(1, 22);
      wav.writeUInt32LE(8000, 24);
      wav.writeUInt32LE(16000, 28);
      wav.writeUInt16LE(2, 32);
      wav.writeUInt16LE(16, 34);
      wav.write("data", 36);
      wav.writeUInt32LE(160000, 40);
      await route.fulfill({
        status: 200,
        headers: cors,
        contentType: "audio/wav",
        body: wav,
      });
      return;
    } else if (path === "/materials/a/content") {
      expect(route.request().headers().authorization).toMatch(/^Bearer /);
      await route.fulfill({
        status: 200,
        headers: cors,
        contentType: "application/pdf",
        body: samplePdf(),
      });
      return;
    } else if (path === "/materials/a/access-url")
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
    } else if (path === "/classes/class-green/thread-sessions") {
      data = {
        items: [
          {
            id: "session-3",
            name: "Unit 3",
            date: "2026-10-08",
            unitNumber: 3,
            status: "DRAFT",
          },
        ],
        nextCursor: null,
      };
    } else if (path === "/posts/new-post" && method === "PATCH") {
      const post = posts.find((p) => p.id === "new-post")!;
      const input = route.request().postDataJSON();
      Object.assign(post, input, {
        editedAt: "2026-10-08T09:00:00Z",
        version: post.version + 1,
        attachments: input.attachments.map(
          (a: { materialId: string; group: string }) => ({
            ...a,
            available: true,
            file: files.find((f) => f.id === a.materialId),
          }),
        ),
      });
      data = post;
    } else if (path === "/posts/new-post" && method === "DELETE") {
      posts.splice(
        posts.findIndex((p) => p.id === "new-post"),
        1,
      );
      data = { deleted: true };
    } else if (
      path === "/sessions/session-3/posts" ||
      path === "/classes/class-green/threads"
    ) {
      if (method === "POST") {
        const body = route.request().postDataJSON();
        const p: Post = {
          ...body,
          id: "new-post",
          sessionId: path.includes("/sessions/")
            ? "session-3"
            : (body.sessionId ?? null),
          postType: path.includes("/sessions/")
            ? "SESSION_MATERIAL"
            : body.postType,
          editedAt: null,
          canEdit: true,
          canDelete: true,
          className: "Juniors 03",
          sessionName:
            body.sessionId || path.includes("/sessions/") ? "Unit 3" : null,
          version: 1,
          classId: "class-green",
          authorId: actorId,
          authorName: "Nguyễn Minh Anh",
          publishedBy: actorId,
          publisherName: "Nguyễn Minh Anh",
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
      } else
        data = {
          items: (path.includes("/sessions/")
            ? posts.filter((p) => p.sessionId === "session-3")
            : posts
          ).map((p) => ({
            ...p,
            canEdit:
              route.request().headers()["x-workspace"] === "teacher" &&
              p.authorId === actorId,
            canDelete:
              route.request().headers()["x-workspace"] === "manager" ||
              p.authorId === actorId,
          })),
          nextCursor: null,
        };
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
test("manager folder actions use ellipsis and physical deletion reviews usage", async ({
  page,
}) => {
  await fixture(page);
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization,content-type,x-workspace",
    "Access-Control-Allow-Methods": "GET,DELETE,OPTIONS",
  };
  let removed = false;
  await page.route(`${api}/materials/a/deletion-impact`, async (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers: cors });
    await route.fulfill({
      json: {
        data: {
          file: {
            ...file("a", "one"),
            thumbnailBytes: 200,
            storageBytes: 1200,
          },
          usages: [],
        },
      },
      headers: cors,
    });
  });
  await page.route(`${api}/materials/a`, async (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers: cors });
    const body = route.request().postDataJSON();
    expect(body.version).toBe(1);
    expect(body.linkAction).toBe("DETACH");
    expect(body.reason).toBe("Không sử dụng");
    removed = true;
    await route.fulfill({
      json: { data: { id: "a", status: "DELETING" } },
      headers: cors,
    });
  });
  await page.route(`${api}/materials?**`, async (route) => {
    const folder = new URL(route.request().url()).searchParams.get("folderId");
    await route.fulfill({
      json: {
        data: {
          items: folder === "one" && !removed ? [file("a", "one")] : [],
          nextCursor: null,
        },
      },
      headers: cors,
    });
  });
  await login(page, "MG0001");
  await page.goto(`${base}/materials/`);
  await expect(
    page.getByRole("button", { name: "Sửa thư mục Juniors" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Thao tác thư mục Juniors" }).click();
  await expect(
    page.getByRole("menuitem", { name: "Sửa thư mục" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Juniors", exact: true }).click();
  await page.getByRole("button", { name: "Thông tin Bài học a.pdf" }).click();
  await page.getByRole("button", { name: "Xóa tài liệu", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Thumbnail: 200/)).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Xác nhận xóa" }),
  ).toBeDisabled();
  await dialog.getByLabel("Lý do xóa").fill("Không sử dụng");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Xác nhận xóa" }).click();
  await expect(page.getByText(/Đã ẩn tài liệu/)).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Chọn Bài học a.pdf" }),
  ).toHaveCount(0);
  expect(removed).toBeTruthy();
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
  await page.getByRole("button", { name: "Tạo bài đăng", exact: true }).click();
  await page.getByLabel("Tiêu đề", { exact: true }).fill("Hướng dẫn Unit 1");
  await page.getByLabel("Nội dung / hướng dẫn").fill("Xem trang 1–2.");
  const draftPost = page.getByRole("dialog").getByTestId("lesson-post");
  await expect(
    draftPost.getByRole("button", { name: "Thích", exact: true }),
  ).toBeDisabled();
  await expect(
    draftPost.getByRole("button", { name: /^Bình luận/ }),
  ).toBeDisabled();
  await page.screenshot({
    path: "test-results/post-composer-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Chọn từ kho", exact: true })
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
  await page.getByRole("button", { name: "Tạo bài đăng", exact: true }).click();
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    "Hướng dẫn Unit 1",
  );
  await page.getByRole("button", { name: "Lưu bài", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hướng dẫn Unit 1" }),
  ).toBeVisible();
  expect(
    await page.getByTestId("lesson-post").evaluate((el) => {
      const area = el.closest("[role=tabpanel]") ?? el.closest("main");
      if (!area) throw new Error("Missing content area");
      const p = el.getBoundingClientRect(),
        a = area.getBoundingClientRect();
      return Math.abs(p.left + p.right - (a.left + a.right));
    }),
  ).toBeLessThan(2);
  await page.getByRole("button", { name: "Thích", exact: true }).click();
  await expect(page.getByText("Dữ liệu đã đổi, thử lại.")).toBeVisible();
  await expect(page.getByLabel("Thích: 0", { exact: true })).toBeVisible();
  const input = page.getByRole("textbox", {
    name: "Viết bình luận",
    exact: true,
  });
  await expect(input).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mở phần bình luận" }),
  ).toHaveCount(0);
  const originalInput = await input.elementHandle();
  const commentsLoaded = page.waitForResponse(
    (r) =>
      r.url().includes("/posts/new-post/comments") &&
      r.request().method() === "GET",
  );
  await page
    .getByRole("button", { name: "Bình luận (0)", exact: true })
    .click();
  await commentsLoaded;
  await input.fill("Bản nháp bình luận cần giữ");
  await page
    .getByRole("button", { name: "Bình luận (0)", exact: true })
    .click();
  await expect(page.getByTestId("comment-list")).toHaveCount(0);
  await expect(input).toHaveValue("Bản nháp bình luận cần giữ");
  await page
    .getByRole("button", { name: "Bình luận (0)", exact: true })
    .click();
  expect(await input.evaluate((el, old) => el === old, originalInput)).toBe(
    true,
  );
  await expect(
    page.getByRole("form", { name: "Soạn bình luận" }).getByRole("button", {
      name: "Đính kèm ảnh / file / audio / video",
      exact: true,
    }),
  ).toBeVisible();
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
  await expect
    .poll(() =>
      dialog.locator("canvas").evaluate((node) => {
        const canvas = node as HTMLCanvasElement;
        return (
          canvas.width > 0 &&
          Math.abs(canvas.width / canvas.height - 2) < 0.02 &&
          canvas.height <= window.innerHeight * 0.69
        );
      }),
    )
    .toBe(true);
  await dialog.getByRole("button", { name: "Cuộn dọc", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Lật trang", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Toàn màn hình", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Thu về cửa sổ", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "+", exact: true }).click();
  await expect(dialog.getByText("125%", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Chọn Bài học a.pdf" }),
  ).not.toBeChecked();
});

test("class thread defaults first, session materials synchronize, and authors can edit/delete", async ({
  page,
}) => {
  await fixture(page);
  await login(page);
  await page.goto(`${base}/class/?classId=class-green`);
  await expect(
    page.getByRole("tab", { name: "Thread", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Tạo bài đăng", exact: true }).click();
  await page
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Bài học phiên Unit 3");
  await page.getByLabel("Loại bài đăng", { exact: true }).click();
  await page
    .getByRole("option", { name: "Tài liệu phiên học", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lưu bài", exact: true }),
  ).toBeDisabled();
  await page.getByRole("combobox", { name: "Chọn phiên học" }).fill("Unit 3");
  await page.getByRole("option", { name: /Unit 3/ }).click();
  await page
    .getByRole("button", { name: "Chọn từ kho", exact: true })
    .last()
    .click();
  const picker = page.getByRole("dialog").last();
  await picker.getByRole("button", { name: "Juniors", exact: true }).click();
  await picker.getByRole("checkbox", { name: "Chọn Bài học a.pdf" }).check();
  await picker.getByRole("button", { name: "Level 1", exact: true }).click();
  await picker.getByRole("checkbox", { name: "Chọn Bài học b.pdf" }).check();
  await picker.getByRole("button", { name: "Thêm 2 file vào bài" }).click();
  await page.getByRole("button", { name: "Lưu bài", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bài học phiên Unit 3", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Hồ sơ & quan hệ", exact: true }).click();
  await page.getByRole("tab", { name: "Thread", exact: true }).click();
  await page
    .getByRole("button", { name: "Thao tác bài đăng", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Sửa bài", exact: true }).click();
  await page
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Bài học Unit 3 cập nhật");
  await page.getByRole("button", { name: "Lưu bài", exact: true }).click();
  await expect(page.getByText("Đã chỉnh sửa", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Xem Bài học a.pdf", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: "test-results/class-thread-desktop-light.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Giao diện", exact: true }).click();
  await page.getByRole("menuitem", { name: "Tối", exact: true }).click();
  await expect(
    page.getByRole("menuitem", { name: "Tối", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/class-thread-mobile-dark.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.goto(`${base}/session/?classId=class-green&sessionId=session-3`);
  await expect(
    page.getByRole("heading", { name: "Bài học Unit 3 cập nhật", exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept("Không còn dùng"));
  await page
    .getByRole("button", { name: "Thao tác bài đăng", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Xóa bài", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bài học Unit 3 cập nhật", exact: true }),
  ).toHaveCount(0);
});

test("manager class thread only reads and deletes, with profile edit in the third tab", async ({
  page,
}) => {
  await fixture(page, true);
  await login(page, "MG0001");
  await page.goto(`${base}/manage/profile/?entity=classes&id=class-green`);
  await expect(
    page.getByRole("tab", { name: "Thread", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: "Tạo bài đăng", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Chỉnh sửa hồ sơ / trạng thái" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Thông báo của lớp", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Thao tác bài đăng", exact: true })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Sửa bài", exact: true }),
  ).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept("Không phù hợp"));
  await page.getByRole("menuitem", { name: "Xóa bài", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Thông báo của lớp", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Hồ sơ & quan hệ", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Chỉnh sửa hồ sơ / trạng thái" }),
  ).toBeVisible();
});

test("inline audio loads on demand with auth, controls speed and downloads through the API", async ({
  page,
}) => {
  await fixture(page);
  await login(page);
  await page.goto(`${base}/class/?classId=class-green`);
  await page.getByRole("button", { name: "Tạo bài đăng", exact: true }).click();
  await page.getByLabel("Tiêu đề", { exact: true }).fill("Bài luyện nghe");
  await page
    .getByRole("button", { name: "Chọn từ kho", exact: true })
    .last()
    .click();
  const picker = page.getByRole("dialog").last();
  await picker.getByRole("button", { name: "Juniors", exact: true }).click();
  await picker
    .getByRole("checkbox", { name: "Chọn Listening Unit 3.wav" })
    .check();
  await picker.getByRole("button", { name: "Thêm 1 file vào bài" }).click();
  let loads = 0;
  page.on("request", (r) => {
    if (r.url().includes("/materials/audio/content") && r.method() === "GET")
      loads++;
  });
  await page.getByRole("button", { name: "Lưu bài", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bài luyện nghe", exact: true }),
  ).toBeVisible();
  expect(loads).toBe(0);
  await page
    .getByRole("button", { name: "Phát Listening Unit 3.wav", exact: true })
    .click();
  await expect(page.locator("audio")).toHaveAttribute("src", /^blob:/);
  await expect
    .poll(() =>
      page.locator("audio").evaluate((a) => (a as HTMLAudioElement).duration),
    )
    .toBe(10);
  await page
    .getByRole("combobox", { name: "Tốc độ audio Listening Unit 3.wav" })
    .click();
  await expect(page.getByRole("option")).toHaveCount(8);
  await page.getByRole("option", { name: "1.5x", exact: true }).click();
  await expect(page.locator("audio")).toHaveJSProperty("playbackRate", 1.5);
  await page
    .getByRole("button", { name: "Tạm dừng Listening Unit 3.wav", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Phát Listening Unit 3.wav", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Tạm dừng Listening Unit 3.wav",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tạm dừng Listening Unit 3.wav", exact: true })
    .click();
  expect(loads).toBe(1);
  await page.getByRole("button", { name: "Tải tài liệu", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Listening Unit 3.wav", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("Listening Unit 3.wav");
  expect(loads).toBe(2);
});

test("inline comment bubbles and attachment icon retain drafts across class tabs and themes", async ({
  page,
}) => {
  await fixture(page, true);
  const comments = [
    {
      id: "comment-one",
      postId: "new-post",
      parentId: null,
      authorId: "student-one",
      authorName: "Học sinh kiểm thử",
      body: "Cô ơi, con luyện nói theo audio phải không ạ?",
      createdAt: "2026-10-08T08:00:00Z",
      version: 1,
      attachments: [],
    },
    {
      id: "comment-two",
      postId: "new-post",
      parentId: null,
      authorId: "GV0001",
      authorName: "Nguyễn Minh Anh",
      body: "Con nghe rồi thử nói về gia đình nhé.",
      createdAt: "2026-10-08T08:05:00Z",
      version: 1,
      attachments: [],
    },
  ];
  let reads = 0;
  await page.route(`${api}/posts/new-post/comments**`, async (route) => {
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type,x-workspace",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    };
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    reads++;
    await route.fulfill({
      headers,
      json: { data: { items: comments, nextCursor: null } },
    });
  });
  await login(page);
  await page.goto(`${base}/class/?classId=class-green`);
  const post = page.getByTestId("lesson-post");
  const input = post.getByRole("textbox", {
    name: "Viết bình luận",
    exact: true,
  });
  await expect(input).toBeVisible();
  expect(reads).toBe(0);
  const originalInput = await input.elementHandle();
  await input.fill("Bản nháp giữ nguyên");
  await expect(post.getByTestId("post-comment")).toHaveCount(2);
  await expect(post.getByTestId("post-comment").nth(1)).toContainText(
    "Giảng viên",
  );
  await expect(
    post.getByRole("form", { name: "Soạn bình luận" }).getByRole("button", {
      name: "Đính kèm ảnh / file / audio / video",
      exact: true,
    }),
  ).toBeVisible();
  await post.getByRole("button", { name: /^Bình luận/ }).click();
  await expect(post.getByTestId("comment-list")).toHaveCount(0);
  await expect(input).toHaveValue("Bản nháp giữ nguyên");
  await post.getByRole("button", { name: /^Bình luận/ }).click();
  expect(await input.evaluate((el, old) => el === old, originalInput)).toBe(
    true,
  );
  await page.getByRole("tab", { name: "Hồ sơ & quan hệ", exact: true }).click();
  await page.getByRole("tab", { name: "Thread", exact: true }).click();
  await expect(input).toHaveValue("Bản nháp giữ nguyên");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Giao diện", exact: true }).click();
  await page.getByRole("menuitem", { name: "Tối", exact: true }).click();
  await input.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/staff-inline-comments-mobile-dark.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(reads).toBe(1);
});

test("dual-role workspace changes do not reuse manager-only post permission cache", async ({
  page,
}) => {
  await fixture(page);
  // The base dual-role fixture has an ENDED assignment; model an actively assigned teacher here.
  await page.route(`${api}/classes/class-green/access`, async (route) => {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization,content-type,x-workspace",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    };
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    return route.fulfill({
      headers,
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
    });
  });
  await login(page, "BOTH0001");
  await page.getByRole("combobox", { name: "Không gian", exact: true }).click();
  await page.getByRole("option", { name: "Giảng viên", exact: true }).click();
  await page.goto(`${base}/class/?classId=class-green`);
  await page.getByRole("button", { name: "Tạo bài đăng", exact: true }).click();
  await page
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Thông báo của tác giả");
  await page.getByLabel("Loại bài đăng", { exact: true }).click();
  await page.getByRole("option", { name: "Thông báo", exact: true }).click();
  await page.getByRole("button", { name: "Lưu bài", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Thông báo của tác giả", exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Không gian", exact: true }).click();
  await page.getByRole("option", { name: "Quản lý", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tạo bài đăng", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Thao tác bài đăng", exact: true })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Sửa bài", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: "Không gian", exact: true }).click();
  await page.getByRole("option", { name: "Giảng viên", exact: true }).click();
  await page
    .getByRole("button", { name: "Thao tác bài đăng", exact: true })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Sửa bài", exact: true }),
  ).toBeVisible();
});

test("pinned comments survive collapse; paging, likes, reply target and pin mutation work", async ({
  page,
}) => {
  await fixture(page, true);
  const comments = ["Ghim luôn hiển thị", "Trang đầu", "Trang sau"].map(
    (body, i) => ({
      id: `interaction-${i}`,
      postId: "new-post",
      parentId: i === 2 ? "interaction-1" : null,
      parentAuthorName: i === 2 ? "Học sinh thử" : null,
      authorId: i === 0 ? "GV0001" : "student-test",
      authorName: i === 0 ? "Nguyễn Minh Anh" : "Học sinh thử",
      body,
      version: 1,
      createdAt: "2026-10-09T08:00:00Z",
      attachments: [],
      isPinned: i === 0,
      likeCount: 0,
      myLike: false,
    }),
  );
  const post: Post = {
    id: "new-post",
    classId: "class-green",
    sessionId: null,
    postType: "ANNOUNCEMENT",
    title: "Bài trao đổi",
    body: "Hướng dẫn theo thiết kế",
    status: "PUBLISHED",
    authorId: "GV0001",
    authorName: "Nguyễn Minh Anh",
    publishedBy: "GV0001",
    publisherName: "Nguyễn Minh Anh",
    createdAt: "2026-10-09T08:00:00Z",
    updatedAt: "2026-10-09T08:00:00Z",
    version: 1,
    attachments: [],
    reactions: [],
    myReaction: null,
    commentCount: 3,
    canEdit: true,
    canDelete: true,
    canPinComment: true,
  };
  let pages = 0,
    likes = 0,
    pins = 0,
    failLike = true;
  await page.route(`${api}/classes/class-green/threads**`, (r) =>
    r.fulfill({
      json: {
        data: {
          items: [
            { ...post, pinnedComments: comments.filter((c) => c.isPinned) },
          ],
          nextCursor: null,
        },
      },
    }),
  );
  await page.route(`${api}/posts/new-post/comments**`, async (r) => {
    pages++;
    const cursor = new URL(r.request().url()).searchParams.get("cursor");
    await r.fulfill({
      json: {
        data: {
          items: cursor ? [comments[2]] : [comments[1]],
          nextCursor: cursor ? null : "second",
        },
      },
    });
  });
  await page.route(`${api}/comments/interaction-0/**`, async (r) => {
    const action = new URL(r.request().url()).pathname.split("/").at(-1);
    if (action === "like") {
      likes++;
      if (failLike) {
        failLike = false;
        await r.fulfill({
          status: 409,
          json: {
            error: { code: "CONFLICT", message: "Chưa thể thích bình luận." },
          },
        });
        return;
      }
      comments[0].myLike = r.request().method() === "PUT";
      comments[0].likeCount = comments[0].myLike ? 1 : 0;
    } else {
      pins++;
      comments[0].isPinned = r.request().postDataJSON().isPinned;
      comments[0].version++;
    }
    await r.fulfill({ json: { data: comments[0] } });
  });
  await login(page);
  await page.goto(`${base}/class/?classId=class-green`);
  const article = page.getByTestId("lesson-post"),
    pinned = article.getByTestId("pinned-comments");
  await expect(pinned).toContainText("Ghim luôn hiển thị");
  expect(pages).toBe(0);
  await pinned
    .getByRole("button", { name: "Thích bình luận", exact: true })
    .click();
  await expect(
    article.getByText("Chưa thể thích bình luận.", { exact: true }),
  ).toBeVisible();
  await expect(
    pinned.getByRole("button", { name: "Thích bình luận", exact: true }),
  ).toBeVisible();
  await pinned
    .getByRole("button", { name: "Thích bình luận", exact: true })
    .click();
  await expect(
    pinned.getByRole("button", { name: "Bỏ thích bình luận", exact: true }),
  ).toBeVisible();
  expect(likes).toBe(2);
  await article.getByRole("button", { name: /^Bình luận/ }).click();
  await expect(article.getByText("Trang đầu", { exact: true })).toBeVisible();
  await article
    .getByRole("button", { name: "Xem thêm bình luận", exact: true })
    .click();
  await expect(article.getByText("Trang sau", { exact: true })).toBeVisible();
  await expect(
    article.getByText("Trả lời Học sinh thử", { exact: true }),
  ).toBeVisible();
  await article.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(article.getByText("Trang đầu", { exact: true })).toHaveCount(0);
  await expect(pinned).toBeVisible();
  await pinned
    .getByRole("button", { name: "Thao tác bình luận", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Bỏ ghim", exact: true }).click();
  await expect(pinned).toHaveCount(0);
  expect(pins).toBe(1);
});
