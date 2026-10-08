import {test,expect,type Page} from '@playwright/test';
import {Workbook} from 'exceljs';
import type {Class,Session,Assessment,Student,StudentResult,AuthSession,Envelope} from '../src/types';
const url=process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/,'')??'';

test.describe('ASP.NET + PostgreSQL integration (isolated demo backend only)',()=>{
 test.skip(process.env.TEST_LIVE_API!=='true','Set TEST_LIVE_API=true with an isolated backend seeded with demo data.');
 test.setTimeout(90000);
 async function login(page:Page){await page.goto('login/');await page.getByLabel('ID giảng viên').fill('GV000001');await page.getByLabel('Mật khẩu',{exact:true}).fill('TeacherDemo123!');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Lớp học của tôi'})).toBeVisible();}
 test('real class/student/session/assessment mutations, form/batch scores, server Excel preview/commit and optimistic conflict',async({page,request})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await login(page);await page.reload();await expect(page.getByRole('heading',{name:'Lớp học của tôi'})).toBeVisible();
  const auth=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('learnleaf.staff.auth')!) as AuthSession);
  const headers={Authorization:`Bearer ${auth.accessToken}`};
  async function get<T>(path:string){const response=await request.get(url+path,{headers});expect(response.status()).toBe(200);return ((await response.json()) as Envelope<T>).data;}
  const classes=await get<Class[]>('/classes?search=ess20-a1&page=1&pageSize=20');const room=classes.find(c=>c.code==='ess20-a1');expect(room).toBeDefined();const classId=room!.id;
  const students=await get<Student[]>(`/classes/${classId}/students`);const bon=students.find(s=>s.nickname==='Bon')??students[0];
  await page.goto(`class/?classId=${classId}`);await page.getByRole('button',{name:`Sửa ${bon.name}`,exact:true}).click();await page.getByLabel('Biệt danh').fill('Bon API');await page.getByRole('button',{name:'Lưu học sinh'}).click();await expect(page.getByRole('cell',{name:'Bon API',exact:true})).toBeVisible();
  await page.getByRole('button',{name:`Sửa ${bon.name}`,exact:true}).click();await page.getByLabel('Biệt danh').fill(bon.nickname);await page.getByRole('button',{name:'Lưu học sinh'}).click();await expect(page.getByRole('cell',{name:bon.nickname,exact:true})).toBeVisible();
  const sessions=await get<Session[]>(`/classes/${classId}/sessions`);const lesson=sessions.find(s=>s.unitNumber===3 && s.name==='Unit 3')!;const assessments=await get<Assessment[]>(`/sessions/${lesson.id}/assessments`);const assessment=assessments.find(a=>a.skills.length===7)!;expect(assessment).toBeDefined();
  const context=`classId=${classId}&sessionId=${lesson.id}&assessmentId=${assessment.id}`;
  await page.goto(`student-score/?${context}&studentId=${bon.id}`);await expect(page.getByRole('heading',{name:'23.1 / 35 · 66%'})).toBeVisible();await page.getByLabel('Số câu / điểm đạt',{exact:true}).first().fill('0');await page.getByRole('button',{name:'Lưu',exact:true}).click();await expect(page.getByText('Đã lưu điểm thành công.')).toBeVisible();
  await page.getByRole('link',{name:'← Bảng điểm'}).click();await page.getByLabel(`Điểm Từ vựng ${bon.id}`,{exact:true}).fill('1');await page.getByRole('button',{name:'Lưu 1 dòng đã sửa'}).click();await expect(page.getByText('Đã lưu 1 học sinh.')).toBeVisible();
  const stale=(await get<StudentResult[]>(`/assessments/${assessment.id}/results`)).find(r=>r.studentId===bon.id)!;
  await page.goto(`import/?${context}`);const event=page.waitForEvent('download');await page.getByRole('button',{name:'Tải file mẫu .xlsx'}).click();const file=await (await event).path();expect(file).toBeTruthy();const book=new Workbook();await book.xlsx.readFile(file!);const sheet=book.getWorksheet('Scores')!;let row=2;for(let index=2;index<=sheet.rowCount;index++)if(sheet.getCell(`A${index}`).value===bon.id)row=index;
  sheet.getCell(`D${row}`).value=0;
  const buffer=Buffer.from(await book.xlsx.writeBuffer());await page.getByLabel('File Excel',{exact:true}).setInputFiles({name:'api-scores.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});await page.getByRole('button',{name:'Kiểm tra dữ liệu',exact:true}).click();await expect(page.getByText(/1 học sinh thay đổi · 0 lỗi/)).toBeVisible();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Xác nhận import',exact:true}).click();await expect(page.getByText('Import thành công: 1 học sinh.')).toBeVisible();
  const conflict=await request.put(`${url}/assessments/${assessment.id}/results/${bon.id}`,{headers,data:stale});expect(conflict.status()).toBe(409);
  await page.setViewportSize({width:390,height:844});await page.goto(`student-score/?${context}&studentId=${bon.id}`);await expect(page.getByLabel('Số câu / điểm đạt',{exact:true}).first()).toHaveValue('0');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.getByLabel('Số câu / điểm đạt',{exact:true}).first().fill('1');await page.getByRole('button',{name:'Lưu',exact:true}).click();await expect(page.getByText('Đã lưu điểm thành công.')).toBeVisible();
  const lessonName='Buổi API mới '+crypto.randomUUID().slice(0,8);
  await page.setViewportSize({width:1440,height:1000});await page.goto(`class/?classId=${classId}`);await page.getByRole('tab',{name:'Hồ sơ & quan hệ',exact:true}).click();await page.getByRole('tab',{name:'Phiên học',exact:true}).click();await page.getByRole('button',{name:'Tạo phiên học',exact:true}).click();await page.getByLabel('Tên phiên học').fill(lessonName);await page.getByLabel('Unit liên quan').click();await page.getByRole('option',{name:'Unit 3',exact:true}).click();await page.getByRole('button',{name:'Tạo phiên',exact:true}).click();await expect(page.getByText(lessonName,{exact:true})).toBeVisible();await expect(page.getByText('2/6 Unit · 33%')).toBeVisible();
  const newLesson=(await get<Session[]>(`/classes/${classId}/sessions`)).find(s=>s.name===lessonName)!;
  await page.goto(`session/?classId=${classId}&sessionId=${newLesson.id}`);await page.getByRole('button',{name:'Tạo bài đánh giá'}).click();await page.getByLabel('Tên bài đánh giá').fill('Bài API 2 kỹ năng');for(const name of ['Từ vựng','Ngữ pháp','Phát âm','Đọc','Viết'])await page.getByRole('checkbox',{name,exact:true}).uncheck();await page.getByRole('button',{name:'Lưu schema'}).click();await expect(page.getByRole('heading',{name:'Bài API 2 kỹ năng'})).toBeVisible();
  const created=(await get<Assessment[]>(`/sessions/${newLesson.id}/assessments`))[0];expect(created.skills.length).toBe(2);
  const savedSession=await request.patch(`${url}/sessions/${newLesson.id}`,{headers,data:{...newLesson,note:'Cập nhật API',version:newLesson.version}});expect(savedSession.status()).toBe(200);
  const savedAssessment=await request.patch(`${url}/assessments/${created.id}`,{headers,data:{...created,name:'Bài API đã cập nhật'}});expect(savedAssessment.status()).toBe(200);
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await expect(page).toHaveURL(/\/login\/$/);expect(await page.evaluate(()=>sessionStorage.getItem('learnleaf.staff.auth'))).toBeNull();expect((await request.get(url+'/auth/me',{headers})).status()).toBe(401);expect(errors).toEqual([]);
 });
 test('real /auth/me 401 clears browser session and expired JWT is rejected on reload',async({page,request})=>{
  await login(page);const token=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('learnleaf.staff.auth')!).accessToken as string);expect((await request.post(url+'/auth/logout',{headers:{Authorization:`Bearer ${token}`}})).status()).toBe(200);await page.reload();await expect(page).toHaveURL(/\/login\/$/);expect(await page.evaluate(()=>sessionStorage.getItem('learnleaf.staff.auth'))).toBeNull();
  await login(page);const expiring=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('learnleaf.staff.auth')!).accessToken as string);await page.evaluate(()=>{const key='learnleaf.staff.auth';const session=JSON.parse(sessionStorage.getItem(key)!);session.expiresAt='2000-01-01T00:00:00Z';sessionStorage.setItem(key,JSON.stringify(session));});await page.reload();await expect(page).toHaveURL(/\/login\/$/);expect(await page.evaluate(()=>sessionStorage.getItem('learnleaf.staff.auth'))).toBeNull();await request.post(url+'/auth/logout',{headers:{Authorization:`Bearer ${expiring}`}});
 });
 test('backend staff link consumed once, StrictMode deduplicates and expired/missing links show errors',async({page})=>{
  const code=process.env.TEST_STAFF_LINK_CODE,expiredCode=process.env.TEST_STAFF_EXPIRED_LINK_CODE;test.skip(!code||!expiredCode,'Seed one-use staff codes on the isolated backend and provide TEST_STAFF_LINK_CODE / TEST_STAFF_EXPIRED_LINK_CODE.');
  let exchanges=0;page.on('request',request=>{if(request.url().endsWith('/auth/link/exchange')&&request.method()==='POST')exchanges++;});
  await page.goto('login/link/#code='+code);await expect(page.getByRole('heading',{name:'Lớp học của tôi'})).toBeVisible();expect(new URL(page.url()).hash).toBe('');expect(exchanges).toBe(1);
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await expect(page).toHaveURL(/\/login\/$/);await page.goto('login/link/#code='+code);await expect(page.getByText('Liên kết đã được sử dụng.')).toBeVisible();expect(new URL(page.url()).hash).toBe('');
  await page.goto('login/link/#code='+expiredCode);await expect(page.getByText('Liên kết đã hết hạn.')).toBeVisible();await page.goto('login/link/');await expect(page.getByText('Liên kết thiếu mã đăng nhập.')).toBeVisible();
 });
});
