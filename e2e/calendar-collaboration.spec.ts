import {test,expect,type Page} from "@playwright/test";
import {installHttpFixture} from "./support/http-fixture";
import {seed} from "../src/mock/fixtures";
import {todayDate,dateLabel} from "../src/features/attendance/models";
const base=process.env.NEXT_PUBLIC_BASE_PATH??"";
async function login(page:Page){
 await page.goto(base+"/login/");await page.getByLabel("ID giảng viên").fill("MG0001");await page.getByLabel("Mật khẩu",{exact:true}).fill("Demo123!");
 await page.getByRole("button",{name:"Đăng nhập",exact:true}).click();await expect(page).toHaveURL(/home/);
 await page.goto(base+"/class/?classId=class-green&tab=attendance");
}
test("manager pins future bonus, cannot attend it, and cancellation retains calendar history",async({page})=>{
 await installHttpFixture(page);await login(page);
 const next=new Date(todayDate()+"T00:00:00Z");next.setUTCDate(next.getUTCDate()+1);const future=next.toISOString().slice(0,10);
 await page.getByRole("button",{name:dateLabel(future),exact:true}).click();
 await page.getByRole("button",{name:"Ghim lịch học bù / học thêm",exact:true}).last().click();
 await page.getByLabel("Ghi chú / lý do").fill("Ôn tập bổ sung");
 await page.getByRole("button",{name:"Xác nhận",exact:true}).click();
 await expect(page.getByText("Học thêm dự kiến",{exact:false})).toBeVisible();
 const futureDay=page.getByRole("button",{name:dateLabel(future),exact:true});
 await expect(futureDay.locator('svg[aria-label="Lịch dự kiến đã ghim"]')).toBeVisible();
 await expect(page.getByRole("checkbox",{name:/Có mặt:/}).last()).toBeDisabled();
 await page.getByRole("button",{name:"Hủy lịch đã xếp",exact:true}).click();
 await page.getByLabel("Ghi chú / lý do").fill("Chưa đủ học sinh đăng ký");
 await page.getByRole("button",{name:"Xác nhận",exact:true}).click();
 await expect(futureDay.locator('svg[aria-label="Lịch dự kiến đã ghim"]')).toHaveCount(0);
 await expect(page.getByText("Đã hủy lịch",{exact:true}).last()).toBeVisible();
});
test("manager notification policy is versioned and schedule priority remains important",async({page})=>{
 let value=JSON.stringify(seed());await installHttpFixture(page,{get:()=>value,set:next=>{value=next;}});
 await login(page);await page.getByRole("button",{name:"Cài đặt thông báo lớp",exact:true}).click();
 const dialog=page.getByRole("dialog");await expect(dialog.getByText("Thay đổi lịch học",{exact:true})).toBeVisible();
 await dialog.getByRole("checkbox",{name:"Điểm động viên: Học sinh",exact:true}).uncheck();
 await dialog.getByRole("button",{name:"Lưu cài đặt",exact:true}).click();await expect(dialog).not.toBeVisible();
 await page.getByRole("button",{name:"Cài đặt thông báo lớp",exact:true}).click();
 await expect(page.getByRole("checkbox",{name:"Điểm động viên: Học sinh",exact:true})).not.toBeChecked();
});
