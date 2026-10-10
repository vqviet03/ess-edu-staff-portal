import {test, expect} from "@playwright/test";
import {installHttpFixture} from "./support/http-fixture";
import {seed} from "../src/mock/fixtures";
import {managementSeed} from "../src/mock/management-fixtures";
const base=process.env.NEXT_PUBLIC_BASE_PATH ?? "";
for (const example of [
  {name:"ended phase",old:"2026-09-18",current:"2026-10-09"},
  {name:"old and future dates",old:"1990-01-01",current:"2035-05-01"},
  {name:"overlap and admission after departure",old:"2035-05-01",current:"2026-09-18"},
]) test(`manager saves ${example.name} without business date limits`, async ({page}) => {
  const db=seed(); db.management=managementSeed(db);
  const enrollment=db.management.enrollments.find(e=>e.classId==="class-green" && e.studentId===db.students["class-green"][0].id)!;
  enrollment.history=[
    {startAt:"2026-10-01T00:00:00Z",endAt:"2026-10-06T16:59:59Z",status:"ENDED",reason:"Đợt trước"},
    {startAt:"2026-10-08T17:00:00Z",endAt:null,status:"ACTIVE",reason:"Tham gia lại"},
  ];
  let persisted=JSON.stringify(db);
  await installHttpFixture(page,{get:()=>persisted,set:v=>{persisted=v;}});
  await page.goto(`${base}/login/`);
  await page.getByLabel("ID giảng viên").fill("MG0001");
  await page.getByLabel("Mật khẩu",{exact:true}).fill("Demo123!");
  await page.getByRole("button",{name:"Đăng nhập",exact:true}).click();
  await expect(page).toHaveURL(/\/home\//);
  await page.goto(`${base}/manage/profile/?entity=classes&id=class-green&tab=profile`);
  await page.getByRole("button",{name:"Thao tác học sinh Hữu Văn",exact:true}).click();
  await page.getByRole("menuitem",{name:"Chỉnh sửa ngày tham gia lớp",exact:true}).click();
  const dialog=page.getByRole("dialog");
  for (const label of ["Ngày tham gia · đợt 1","Ngày tham gia · đợt 2"]) {
    await expect(dialog.getByLabel(label,{exact:true})).not.toHaveAttribute("min");
    await expect(dialog.getByLabel(label,{exact:true})).not.toHaveAttribute("max");
  }
  await dialog.getByLabel("Ngày tham gia · đợt 1",{exact:true}).fill(example.old);
  await expect(dialog.getByLabel("Ngày tham gia · đợt 2",{exact:true})).toHaveValue("2026-10-09");
  await expect(dialog.getByLabel("Ngày nghỉ học · đợt 2",{exact:true})).toBeDisabled();
  await dialog.getByLabel("Ngày tham gia · đợt 2",{exact:true}).fill(example.current);
  await dialog.getByRole("button",{name:"Kiểm tra ảnh hưởng",exact:true}).click();
  await dialog.getByRole("checkbox",{name:/Tôi xác nhận ngày nhập học/}).check();
  await dialog.getByLabel("Lý do thay đổi (bắt buộc)").fill("Đối chiếu ngày nhập học thực tế");
  await dialog.getByRole("button",{name:/Xác nhận cập nhật 1 bản ghi/}).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await page.getByRole("button",{name:"Thao tác học sinh Hữu Văn",exact:true}).click();
  await page.getByRole("menuitem",{name:"Chỉnh sửa ngày tham gia lớp",exact:true}).click();
  await expect(page.getByRole("dialog").getByLabel("Ngày tham gia · đợt 1",{exact:true})).toHaveValue(example.old);
  await expect(page.getByRole("dialog").getByLabel("Ngày tham gia · đợt 2",{exact:true})).toHaveValue(example.current);
});
