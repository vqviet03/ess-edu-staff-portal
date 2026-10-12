import {test,expect,type Page} from "@playwright/test";
import {installHttpFixture} from "./support/http-fixture";
import type {Post,MaterialFile} from "../src/features/materials/models";
const base=process.env.NEXT_PUBLIC_BASE_PATH??"";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,content-type,x-workspace","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
const file:MaterialFile={id:"link-file",originalName:"Hai trang.pdf",displayName:"Hai trang.pdf",mimeType:"application/pdf",sizeBytes:500,thumbnailUrl:null,folderId:null,authorId:"teacher-one",authorName:"Giảng viên",uploadedBy:"teacher-one",uploadSource:"session",sourceSessionId:null,sourcePostId:"link-post",status:"AVAILABLE",version:1,createdAt:"2026-10-10T08:00:00Z",updatedAt:"2026-10-10T08:00:00Z"};
const post:Post={id:"link-post",classId:"class-green",sessionId:null,title:"Bài đăng chia sẻ",body:"Nội dung của lớp",postType:"ANNOUNCEMENT",status:"PUBLISHED",authorId:"teacher-one",authorName:"Giảng viên",publishedBy:"teacher-one",publisherName:"Giảng viên",createdAt:"2026-10-10T08:00:00Z",updatedAt:"2026-10-10T08:00:00Z",version:1,canEdit:false,canDelete:false,attachments:[{materialId:file.id,group:"LESSON",available:true,file}],reactions:[],myReaction:null,commentCount:0};
const target="/post/?postId=link-post&classId=class-green#comment-one";
function samplePdf(){
 const objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 600] /Resources << >> >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 600] /Resources << >> >>"];
 let text="%PDF-1.4\n";const offsets=[0];objects.forEach((body,i)=>{offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${body}\nendobj\n`;});const start=Buffer.byteLength(text);text+=`xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,"0")+" 00000 n \n").join("")}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return Buffer.from(text);
}
async function setup(page:Page){
 await installHttpFixture(page);
 await page.addInitScript(()=>Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async(value:string)=>{Reflect.set(window,"lastCopiedLink",value);}}}));
 await page.route("**/posts/link-post**",r=>r.fulfill({headers,json:{data:new URL(r.request().url()).pathname.endsWith("/posts/link-post")?post:{items:[],nextCursor:null}}}));
 await page.route("**/materials/link-file/content**",r=>r.request().method()==="OPTIONS"?r.fulfill({status:204,headers}):r.fulfill({headers,contentType:"application/pdf",body:samplePdf()}));
}
async function credentials(page:Page){
 await page.getByLabel("ID giảng viên").fill("GV0001");
 await page.locator('input[autocomplete="current-password"]').fill("Demo123!");
 await page.getByRole("button",{name:"Đăng nhập",exact:true}).click();
}
test("guest post deep link survives login reload and preserves its query and fragment",async({page})=>{
 await setup(page);let protectedReads=0;page.on("request",r=>{if(r.method()==="GET"&&new URL(r.url()).pathname.endsWith("/posts/link-post"))protectedReads++;});await page.goto(base+target);await expect(page).toHaveURL(/login\/\?next=/);expect(protectedReads).toBe(0);
 await page.reload();await credentials(page);await expect(page).toHaveURL(new RegExp("/post/\\?postId=link-post&classId=class-green#comment-one$"));
 await expect(page.getByRole("link",{name:post.title,exact:true})).toBeVisible();
});
test("one-time link login returns to the requested post and removes the code",async({page})=>{
 await setup(page);await page.goto(`${base}/login/link/?next=${encodeURIComponent(target)}#code=teacher-demo`);
 await expect(page).toHaveURL(new RegExp("/post/\\?postId=link-post&classId=class-green#comment-one$"));
 expect(page.url()).not.toContain("code=");await expect(page.getByTestId("lesson-post")).toBeVisible();
});
test("sharing uses the right portal and desktop interactions move alongside a full-width post",async({page})=>{
 await setup(page);await page.goto(base+target);await expect(page).toHaveURL(/login\/\?next=/);await credentials(page);
 const article=page.getByTestId("lesson-post");await expect(article).toBeVisible();await page.setViewportSize({width:1440,height:1000});
 const main=await page.locator("main").boundingBox(),card=await article.boundingBox(),body=await page.getByTestId("post-content").boundingBox(),interactions=await page.getByTestId("post-interactions").boundingBox();
 expect(Math.abs(main!.width-card!.width)).toBeLessThan(2);expect(interactions!.x).toBeGreaterThan(body!.x+body!.width);
 await article.getByRole("button",{name:"Thao tác bài đăng"}).click();await page.getByRole("menuitem",{name:"Sao chép liên kết học sinh",exact:true}).click();const student=new URL(await page.evaluate(()=>String(Reflect.get(window,"lastCopiedLink"))));expect(student.origin).toBe(new URL(process.env.NEXT_PUBLIC_STUDENT_PORTAL_URL||"https://eeslern.com").origin);expect(student.searchParams.get("postId")).toBe(post.id);
 await article.getByRole("button",{name:"Thao tác bài đăng"}).click();await page.getByRole("menuitem",{name:"Sao chép liên kết staff",exact:true}).click();const staff=new URL(await page.evaluate(()=>String(Reflect.get(window,"lastCopiedLink"))));expect(staff.pathname).toBe(base+"/post/");expect(staff.searchParams.get("classId")).toBe(post.classId);
 await page.setViewportSize({width:390,height:844});const mobileBody=await page.getByTestId("post-content").boundingBox(),mobileInteractions=await page.getByTestId("post-interactions").boundingBox();expect(mobileInteractions!.y).toBeGreaterThanOrEqual(mobileBody!.y+mobileBody!.height);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("PDF preview opens full-screen, fits width and scrolls vertically without toolbars",async({page})=>{
 await setup(page);await page.goto(base+target);await expect(page).toHaveURL(/login\/\?next=/);await credentials(page);
 await page.getByRole("button",{name:"Xem Hai trang.pdf",exact:true}).click();const preview=page.getByTestId("material-preview"),paper=preview.locator(".MuiDialog-paper");await expect(paper).toHaveClass(/MuiDialog-paperFullScreen/);
 await expect(preview.getByRole("document",{name:"Tài liệu PDF"})).toBeVisible();await expect(preview.locator("[data-pdf-page]")).toHaveCount(2);
 await expect.poll(()=>preview.locator('canvas').first().evaluate(n=>(n as HTMLCanvasElement).width)).toBeGreaterThan(0);
 expect(await preview.getByTestId("preview-content").evaluate(n=>n.scrollHeight>n.clientHeight)).toBe(true);
 const geometry=await paper.boundingBox();expect(geometry!.width).toBe(1280);expect(geometry!.height).toBe(720);
 await expect(preview.getByRole("button")).toHaveCount(2);await expect(preview.getByRole("button",{name:"Vừa khung"})).toHaveCount(0);
 await preview.getByRole("button",{name:"Đóng bản xem trước",exact:true}).click();await expect(preview).toHaveCount(0);
});

test("expired link preserves its target when falling back to password login",async({page})=>{
 await setup(page);await page.goto(`${base}/login/link/?next=${encodeURIComponent(target)}#code=expired-demo`);
 await expect(page.getByText(/Liên kết đã hết hạn/)).toBeVisible();
 await page.getByRole("link",{name:"Về đăng nhập",exact:true}).click();await expect(page).toHaveURL(/login\/\?next=/);
 await credentials(page);await expect(page.getByTestId("lesson-post")).toBeVisible();expect(new URL(page.url()).pathname).toBe(base+"/post/");expect(new URL(page.url()).hash).toBe("#comment-one");
});

test("image preview keeps aspect ratio with a fullscreen frame and closes with Escape",async({page})=>{
 await setup(page);
 const image={...file,mimeType:"image/png",displayName:"Ảnh lớp.png",thumbnailUrl:"/protected-thumbnail"};
 await page.route("**/posts/link-post",r=>r.fulfill({headers,json:{data:{...post,attachments:[{materialId:file.id,group:"LESSON",available:true,file:image}]}}}));
 await page.route("**/materials/link-file/content**",r=>r.fulfill({headers,contentType:"image/png",body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvL0AAAAASUVORK5CYII=","base64")}));
 await page.goto(base+target);await expect(page).toHaveURL(/login\/\?next=/);await credentials(page);
 await page.getByRole("button",{name:"Xem Ảnh lớp.png",exact:true}).click();const preview=page.getByTestId("material-preview");await expect(preview.locator(".MuiDialog-paper")).toHaveClass(/MuiDialog-paperFullScreen/);
 const picture=preview.getByRole("img",{name:"Ảnh lớp.png",exact:true});await expect.poll(()=>picture.evaluate(n=>(n as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);await expect(picture).toHaveCSS("object-fit","contain");await expect(preview.getByRole("button")).toHaveCount(2);
 await page.keyboard.press("Escape");await expect(preview).toHaveCount(0);
});
