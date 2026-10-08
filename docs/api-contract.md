# ESS staff API · v1

Thread/file authentication bổ sung: [thread-materials.md](thread-materials.md). Binary file access bắt buộc Bearer; không dùng public/signed GET nữa.

Base URL công khai từ NEXT_PUBLIC_API_BASE_URL, ví dụ `https://api.example.com/v1`. HTTPS. ID string (URL-encode), datetime ISO 8601 UTC; date/dateOfBirth YYYY-MM-DD hoặc null. Không có điểm là null, không thay bằng 0. JSON thành công `{ "data": T, "meta"?: {...} }`; list dùng data array. POST tạo trả 201 hoặc 200; mutations trả đối tượng đã lưu và version mới. File template trả binary XLSX, không bọc JSON.

## Models

Nguồn types: [src/types/index.ts](../src/types/index.ts).

```ts
Teacher = {id:string,name:string,teacherCode?:string,roles?:Array<"TEACHER"|"MANAGER">,permissions?:string[]}
Class = {id,code,name,schedule,status:'ACTIVE'|'COMPLETED'|'PAUSED',studentCount,totalUnits,completedUnits}
Student = {id,name,nickname,dateOfBirth:string|null,status:'ACTIVE'|'INACTIVE',version:number}
Session = {id,classId,name,unitNumber:number|null,date,note,status:'DRAFT'|'COMPLETED',version:number}
SkillCode = 'VOCABULARY'|'GRAMMAR'|'PRONUNCIATION'|'LISTENING'|'READING'|'SPEAKING'|'WRITING'
SkillSchema = {skillCode,maxQuestions:number,allowDecimal:boolean,order:number}
Assessment = {id,sessionId,name,type:'PROGRESS_TRACKING'|'FINAL_TEST',status:'DRAFT'|'COMPLETED',schemaVersion:number,version:number,skills:SkillSchema[]}
SkillResult = {skillCode,score:number|null,comment:string,advice:string}
StudentResult = {studentId,attendance:'PRESENT'|'ABSENT'|'UNSET',skillResults:SkillResult[],overallComment:string,overallAdvice:string,version:number}
```

Tên/note/nhận xét là Unicode, giữ newline. Họ tên và tên phiên/bài ≤120 ký tự, nickname ≤80, note ≤2000, nhận xét/lời khuyên ≤4000. Ngày sinh không tương lai. Schema ít nhất một kỹ năng, không trùng, maxQuestions nguyên dương ≤10000, order duy nhất theo thứ tự. Backend trả skills theo order. Điểm finite 0..maxQuestions; integer trừ khi allowDecimal=true. Result có đủ các phần schema với score null nếu chưa nhập. ABSENT và UNSET không nhận score khác null. totalScore tổng các điểm có; totalMax toàn schema; percentage không lấy trung bình. Đầy đủ chỉ khi PRESENT và mọi phần có điểm. Backend tự tính lại, không nhận điểm tổng do client quyết định.

## Auth / link

| Method | Path | Body | data |
|---|---|---|---|
| POST | /auth/login | `{teacherId,password}` | `{accessToken,tokenType:"Bearer",expiresAt,teacher}` |
| POST | /auth/link/exchange | `{code}` | Cùng login |
| GET | /auth/me | — | Teacher |
| POST | /auth/logout | — | `{loggedOut:true}`; thu hồi DB session hiện tại |

```json
{"teacherId":"GV0001","password":"Demo123!"}
```

```json
{"data":{"accessToken":"<jwt>","expiresAt":"2026-10-03T10:00:00Z","teacher":{"id":"teacher-1","name":"Nguyễn Minh Anh"}}}
```

Mọi endpoint ngoài login/exchange yêu cầu `Authorization: Bearer <accessToken>`. JWT trong sessionStorage; không lưu mật khẩu. Backend kiểm chữ ký, issuer/audience, exp, trạng thái tài khoản, vai trò TEACHER/MANAGER cùng permission tương ứng và quyền lớp qua chuỗi session/assessment/student. Logout thu hồi session server và luôn xóa phiên/cache phía browser; lỗi mạng chưa đảm bảo server nhận thu hồi, session vẫn hết hạn theo JWT. 401 xóa phiên/cache, về login; 403 hiển thị không có quyền, không logout. Không tự refresh token hoặc retry mutation.

Link frontend `/<basePath>/login/link/#code=<code>`; code xóa khỏi URL ngay. Backend tạo code ngẫu nhiên đủ entropy, hạn ngắn, lưu hash, consume nguyên tử một lần, ràng buộc teacher/expiry; invalid400, expired/used410. Không log code/token/password ở frontend/backend/proxy; password/JWT không nằm URL. Thực thi rate limits chống dò credential/code. Exchange không gọi lặp bởi StrictMode. Frontend không gửi link hay tạo code.

## Lớp và học sinh

| Method | Path | Input | data |
|---|---|---|---|
| GET | /classes?search=&status=&page=1&pageSize=10 | status trống/ACTIVE/COMPLETED/PAUSED, page 1-based | Class[], meta `{page,pageSize,total}` |
| GET | /classes/:classId | — | Class |
| GET | /classes/:classId/students | — | Student[] |
| PATCH | /classes/:classId/students/:studentId | `{name,nickname,dateOfBirth,status,version}` | Student mới |

```json
{"data":[{"id":"class-1","code":"JNR03","name":"Juniors03","schedule":"Thứ 3, 5 · 18:00","status":"ACTIVE","studentCount":16,"totalUnits":12,"completedUnits":3}],"meta":{"page":1,"pageSize":10,"total":1}}
```

```json
{"name":"Hữu Văn","nickname":"Bon","dateOfBirth":"2015-08-12","status":"ACTIVE","version":1}
```

Backend giới hạn chỉ các lớp teacher được phân công. Student ID phải thuộc class. studentCount theo roster; completedUnits = COUNT DISTINCT unitNumber của session COMPLETED và unitNumber không null, totalUnits của cấu hình lớp. Không đếm số phiên hoặc tỷ lệ điểm. Request PATCH kèm version khớp dữ liệu; update atomically WHERE version=… và tăng version.

## Phiên và bài đánh giá

| Method | Path | Input | data |
|---|---|---|---|
| GET | /classes/:classId/sessions | — | Session[] |
| POST | /classes/:classId/sessions | `{name,unitNumber,date,note,status:"DRAFT"}` | Session |
| PATCH | /sessions/:sessionId | `{name,unitNumber,date,note,status,version}` | Session |
| GET | /sessions/:sessionId/assessments | — | Assessment[] |
| POST | /sessions/:sessionId/assessments | `{name,type,skills}` | Assessment nháp |
| GET | /assessments/:assessmentId | — | Assessment |
| PATCH | /assessments/:assessmentId | `{name,type,skills,status,schemaVersion,version,confirmSchemaChange?}` | Assessment |

```json
{"name":"Luyện nghe và nói","type":"PROGRESS_TRACKING","skills":[{"skillCode":"LISTENING","maxQuestions":10,"allowDecimal":false,"order":1},{"skillCode":"SPEAKING","maxQuestions":4,"allowDecimal":true,"order":2}]}
```

unitNumber null hoặc 1..totalUnits. Phiên mới nháp; hoàn thành phiên là thao tác riêng. Final test cùng điểm với progress tracking, không ép đủ 7 kỹ năng. Schema thay đổi tăng schemaVersion và version các results liên quan; thêm phần mới null; xóa phần cũ có điểm cần confirmSchemaChange=true. Nếu giảm max hoặc bỏ decimal làm điểm hiện tại sai, từ chối422, yêu cầu sửa điểm trước. Backend transaction cho schema/results; không mất dữ liệu ngầm. Bài COMPLETED khóa sửa schema/điểm/import; chuyển DRAFT trước. Hoàn thành yêu cầu mỗi result PRESENT đủ phần hoặc ABSENT, không còn UNSET. Tên/type-only update không tăng schemaVersion.

## Điểm / batch

| Method | Path | Input | data |
|---|---|---|---|
| GET | /assessments/:assessmentId/results | — | StudentResult[] |
| PUT | /assessments/:assessmentId/results/:studentId | StudentResult đầy đủ, version | StudentResult mới |
| PATCH | /assessments/:assessmentId/results/batch | `{rows:StudentResult[]}` chỉ dòng thay đổi | `{saved:StudentResult[],rowErrors:Record<studentId,string>}` |

```json
{"studentId":"HV1001","attendance":"PRESENT","skillResults":[{"skillCode":"LISTENING","score":0,"comment":"Cần luyện nghe.\nNghe lại mỗi ngày.","advice":"Nghe chậm trước."},{"skillCode":"SPEAKING","score":2.1,"comment":"","advice":""}],"overallComment":"Tiếp tục luyện tập.","overallAdvice":"","version":1}
```

```json
{"data":{"saved":[{"studentId":"HV1001","attendance":"ABSENT","skillResults":[{"skillCode":"LISTENING","score":null,"comment":"","advice":""},{"skillCode":"SPEAKING","score":null,"comment":"","advice":""}],"overallComment":"","overallAdvice":"","version":2}],"rowErrors":{"HV1002":"Điểm đã thay đổi. Tải lại trước khi sửa."}}}
```

GET phải trả đủ roster (hoặc frontend điền result chưa có bằng version0/null). PUT mới version0, bản có version≥1. Batch tối đa1000, không ID trùng; từng dòng độc lập, partial success200 với rowErrors. Toàn request sai body/IDtrùng422. Batch không nguyên tử; import dưới đây nguyên tử. Mỗi row kiểm tra quyền/schema/attendance/score/version; backend tính tổng. Không retry batch tự động.

## Excel / import

| Method | Path | Input | Response |
|---|---|---|---|
| GET | /assessments/:assessmentId/excel-template | — | MIME XLSX, Content-Disposition attachment |
| POST | /assessments/:assessmentId/import/preview | multipart `file` XLSX, `mode=MERGE_NON_EMPTY` hoặc `REPLACE_ALL` | ImportPreview |
| POST | /assessments/:assessmentId/import/commit | `{previewId,mode}`, header Idempotency-Key | `{updated:number}` |

File theo [workbook.ts](../src/features/excel/workbook.ts). Scores: student_id/student_name/attended, từng skill lowercase `_score`/`_comment`/`_advice`, overall_comment/overall_advice, total_score/total_max/total_percentage (công thức chỉ đọc), result_version. Schema: template_version=1, class_id/session_id/assessment_id/schema_version + skill_code/max_questions/allow_decimal/order. Instructions: tiếng Việt, hướng dẫn điểm/attendance/merge/version. Preserve newline/Unicode, richText thành text; từ chối formula trong cột nhập, tính lại tổng và không tin kết quả công thức file. Tối đa5MB/1000 học sinh, thêm giới hạn decompression/zip bomb và MIME/XLSX thực ở backend.

```json
{"data":{"previewId":"preview-uuid","expiresAt":"2026-10-03T09:10:00Z","mode":"MERGE_NON_EMPTY","changes":[{"studentId":"HV1001","before":{"studentId":"HV1001","attendance":"UNSET","skillResults":[{"skillCode":"SPEAKING","score":null,"comment":"","advice":""}],"overallComment":"","overallAdvice":"","version":0},"after":{"studentId":"HV1001","attendance":"PRESENT","skillResults":[{"skillCode":"SPEAKING","score":0,"comment":"","advice":""}],"overallComment":"","overallAdvice":"","version":0}}],"errors":[{"row":3,"column":"speaking_score","message":"Điểm phải từ 0 đến 4"}]}}
```

Preview chưa ghi results; kiểm schema/version/IDs/duplicates/quyền/điểm/decimal/attendance/types/result_version. Trả lỗi theo dòng/cột, vẫn cho xem các thay đổi nhưng không commit nếu lỗi. Bind preview với teacher/class/assessment/schema/mode, hạn10 phút; dữ liệu trước/sau và versions lưu server. MERGE_NON_EMPTY: blank không ghi đè, 0 cập nhật; REPLACE_ALL là extension có opt-in/xác nhận rõ ràng, blank xóa trong các dòng xuất hiện trong file (không xóa học sinh thiếu dòng).

Commit validate lại toàn bộ trong một DB transaction: quyền, preview không lỗi/hết hạn/sai context, schema và result versions không đổi, điểm hợp lệ, assessment nháp. Có một dòng sai thì không ghi dòng nào. Idempotency-Key UUID cho từng preview, reuse đúng body trả cùng kết quả không apply lần2; cùng key khác body409. Persist kết quả idempotency đủ lâu, bind theo teacher/endpoint. Không gọi mutation retry tự động; user retry dùng lại key của preview.

## Lỗi và CORS

```json
{"error":{"code":"VALIDATION_ERROR","message":"Điểm không hợp lệ.","fieldErrors":{"skillResults.0.score":"Điểm phải từ 0 đến 4"},"rowErrors":{"HV1001":"Version đã thay đổi"}}}
```

| HTTP | Mã ví dụ | Ý nghĩa |
|---|---|---|
| 400 | INVALID_CODE / INVALID_BODY | Mã/link hoặc request sai |
| 401 | INVALID_CREDENTIALS / UNAUTHORIZED | Đăng nhập sai, JWT sai/hết hạn; xóa phiên khi đang đăng nhập |
| 403 | FORBIDDEN / ASSESSMENT_LOCKED | Không được phân công lớp hoặc bài khóa |
| 404 | NOT_FOUND / PREVIEW_NOT_FOUND | Đối tượng không tồn tại |
| 409 | VERSION_CONFLICT / SCHEMA_CONFLICT / IDEMPOTENCY_CONFLICT | Dữ liệu đã thay đổi, tải lại/preview lại |
| 410 | CODE_EXPIRED / CODE_USED / PREVIEW_EXPIRED | Mã dùng rồi hoặc hết hạn |
| 422 | VALIDATION_ERROR / INVALID_TEMPLATE / SCHEMA_SCORE_CONFLICT | Lỗi field/schema/file |
| 429 | RATE_LIMITED | Quá giới hạn, Retry-After |
| 500 | INTERNAL_ERROR | Lỗi server; không lộ stack/secret |

Timeout NEXT_PUBLIC_API_TIMEOUT_MS mặc định15s, hợp lệ 1–120000ms, không tự retry mutation. API thật mặc định; mode mock cần bật rõ ràng, không fallback. Root API URL tự thêm /v1. Production build thiếu/sai cấu hình bị từ chối. CORS allow origin chính xác `https://vqviet03.github.io` (origin không gồm /repo), custom domain nếu có, local development `http://localhost:3000`. Methods GET,POST,PATCH,PUT,OPTIONS; allowed headers Authorization,Content-Type,Idempotency-Key; expose Content-Disposition,Retry-After. Bearer không cần cookie credentials. JWT signing secret chỉ backend; dùng TLS DB, không dùng role admin cho runtime. Frontend guard, protected Excel sheets, fixture access checks không thay backend authorization. /demo/reset chỉ mock, không triển khai public backend thật.


## Mở rộng Quản lý

Xem [management-api-contract.md](management-api-contract.md) cho endpoint/models mới, MANAGER/TEACHER, access theo lớp, lifecycle, preview/commit, selection FILTER, Excel hồ sơ, activation và audit. `teacher` trong auth response là StaffIdentity để giữ tương thích tên field; profile/account có trạng thái riêng. Backend ESS cũ thiếu access mới chỉ cho frontend đọc; không tự nâng role ADMIN hoặc suy ra quyền sửa từ JWT.

## ID và tác vụ nền

Xem [identifiers-operations.md](identifiers-operations.md). Mutation nghiệp vụ từ portal gửi Prefer/respond-async và Idempotency-Key; baseQuery nhận 202, theo dõi operation rồi trả data cuối cho hooks. RTK Query WebSocket và Redux listener cập nhật cache ở các phiên quản lý khác. Auth/preview/đọc dữ liệu giữ contract hiện tại.

## Công bố báo cáo

GET `/assessments/:assessmentId/publication` → `{data:{unitId:string|null,unitNumber:number|null,isPublished:boolean,sourceAssessmentId:string|null,publishedAt:string|null}}`. POST `/assessments/:id/publish` hoặc `/unpublish` body `{version}` → `{data:{published:boolean}}` (hoặc operation 202 khi có Prefer). Hoàn thành không tự công bố; publish yêu cầu quyền giảng viên của lớp, bài COMPLETED, Unit hợp lệ và roster đầy đủ. Snapshot là nguồn của API học sinh. SourceAssessmentId cho biết bài đang làm nguồn trong Unit; công bố bài khác thay nguồn sau xác nhận UI. Gỡ công bố trước khi sửa/mở lại nháp; dữ liệu nhập không bị xóa. Cache assessment/publication/results/classes và các phiên quản lý được làm mới.

## Socket khi ứng dụng ở nền

RTK Query chỉ giữ WebSocket khi ứng dụng hiển thị và có mạng. visibilitychange ẩn trang, offline, pagehide hoặc logout đóng socket và hủy reconnect. Foreground khôi phục đúng một kết nối, gửi AUTH cùng cursor cũ, nhận snapshot NOTIFICATIONS và replay CHANGE/OPERATION. Không gửi token trong URL; không tự GET me/operations/notifications theo timer hoặc khi focus. Mở lại có thể làm mới dữ liệu liên quan nếu server trả thay đổi đã bỏ lỡ. API kiểm tra quyền mọi request; socket kiểm tra trước khi đẩy dữ liệu. Backend Cloud Tasks có thể tiếp tục xử lý lúc mọi client offline; việc tạo queue/IAM thuộc rollout backend.
