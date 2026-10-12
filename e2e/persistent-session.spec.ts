import {test,expect} from "@playwright/test";
import {installHttpFixture} from "./support/http-fixture";
import {seed} from "../src/mock/fixtures";
const base=process.env.NEXT_PUBLIC_BASE_PATH??"";
test("closing a tab preserves login; opening another validates once and logout clears other tabs",async({page,context})=>{
 let value=JSON.stringify(seed());const shared={get:()=>value,set:(next:string)=>{value=next;}};
 await installHttpFixture(page,shared);
 await page.goto(`${base}/login/`);await page.getByLabel("ID giảng viên").fill("GV0001");await page.locator('input[autocomplete="current-password"]').fill("Demo123!");await page.getByRole("button",{name:"Đăng nhập",exact:true}).click();await expect(page).toHaveURL(/home\//);
 expect(await page.evaluate(()=>localStorage.getItem("learnleaf.staff.auth")!==null)).toBe(true);expect(await page.evaluate(()=>sessionStorage.getItem("learnleaf.staff.auth"))).toBeNull();
 await page.close();const other=await context.newPage();await installHttpFixture(other,shared);
 let meReads=0;other.on("request",r=>{if(r.method()==="GET"&&new URL(r.url()).pathname.endsWith("/auth/me"))meReads++;});
 await other.goto(`${base}/home/`);await expect(other.getByRole("button",{name:"Giao diện",exact:true})).toBeVisible();await expect(other.locator("main")).toBeVisible();await expect.poll(()=>meReads).toBe(1);await expect(other).toHaveURL(/home\//);
 const observer=await context.newPage();await installHttpFixture(observer,shared); await observer.goto(`${base}/home/`);await expect(observer.locator("main")).toBeVisible();await expect(observer).toHaveURL(/home\//);
 await other.getByRole("button",{name:"Đăng xuất",exact:true}).click();
 await expect(other).toHaveURL(/login\//);await expect(observer).toHaveURL(/login\//);expect(await observer.evaluate(()=>localStorage.getItem("learnleaf.staff.auth"))).toBeNull();
});
