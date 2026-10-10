import {test,expect} from "@playwright/test";
import {installHttpFixture} from "./support/http-fixture";
import type {PersonalProfile} from "../src/features/profile/models";
test("hồ sơ cá nhân: avatar, đổi ID có mật khẩu, lưu và reload",async({page})=>{
 await installHttpFixture(page);
 let profile:PersonalProfile={loginId:"GV0001",fullName:"Tên demo",nickname:"Bạn",dateOfBirth:null,email:"",phone:"",parentName:"",parentPhone:"",avatar:{fileId:null,icon:"person",color:"#CDEBD7"},version:1};
 const writes:Record<string,unknown>[]=[];
 await page.route("**/v1/profile",async route=>{
  if(route.request().method()==="PATCH"){
   const body=route.request().postDataJSON() as PersonalProfile&{currentPassword?:string};writes.push(body);
   profile={...body,version:profile.version+1};
  }
  await route.fulfill({json:{data:profile}});
 });
 await page.goto("login/");
 await page.getByLabel("ID giảng viên").fill("GV0001");
 await page.locator('input[autocomplete="current-password"]').fill("Demo123!");
 await page.getByRole("button",{name:"Đăng nhập",exact:true}).click();
 await expect(page).toHaveURL(/\/home\//);
 await page.goto("profile/");
 await expect(page.getByRole("heading",{name:"Hồ sơ cá nhân",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"pets",exact:true}).click();
 await page.getByLabel("Họ tên",{exact:true}).fill("Tên cá nhân đã sửa");
 await page.getByLabel("ID đăng nhập",{exact:true}).fill("ten.moi");
 const save=page.getByRole("button",{name:"Lưu hồ sơ",exact:true});
 await expect(save).toBeDisabled();expect(writes).toHaveLength(0);
 await page.getByLabel("Mật khẩu hiện tại",{exact:true}).fill("Demo123!");
 await page.getByLabel("Email cá nhân",{exact:true}).fill("ban@example.com");
 await page.getByLabel("Số điện thoại cá nhân",{exact:true}).fill("0912345678");
 await save.click();
 await expect(page.getByText("Đã lưu hồ sơ.",{exact:true})).toBeVisible();
 expect(writes).toHaveLength(1);expect(writes[0].currentPassword).toBe("Demo123!");
 expect(profile.avatar.icon).toBe("pets");
 await expect(page.getByLabel("Mật khẩu hiện tại",{exact:true})).toHaveCount(0);
 await page.reload();
 await expect(page.getByLabel("Họ tên",{exact:true})).toHaveValue("Tên cá nhân đã sửa");
 await expect(page.getByLabel("ID đăng nhập",{exact:true})).toHaveValue("ten.moi");
});
