# ESS Staff · Quản lý và phân quyền (contract v1)

Các endpoint giảng viên trong [api-contract.md](api-contract.md) tiếp tục giữ nguyên. Backend ESS triển khai contract quản lý này; frontend/mock dùng cùng URL, payload và envelope. Không tự chuyển sang mock khi real API thiếu endpoint.

Base URL `NEXT_PUBLIC_API_BASE_URL`, chuẩn hóa hậu tố `/v1`. HTTPS (HTTP chỉ localhost). Thành công `{data:T,meta?}`; lỗi `{error:{code,message,fieldErrors?,rowErrors?}}`. ID string, version integer, datetime ISO 8601; dateOfBirth `YYYY-MM-DD|null`. Không hard DELETE. Backend lấy tenant/actor từ phiên, kiểm tra quyền từng request và cả thời điểm commit.

## Auth và capabilities

Giữ `POST /auth/login {teacherId,password}`, `POST /auth/link/exchange {code}`, `GET /auth/me`, `POST /auth/logout`. Auth trả `{data:{accessToken,tokenType:"Bearer",expiresAt,teacher:StaffIdentity}}`; tên `teacher` giữ tương thích wire contract, gồm cả Staff quản lý.

```ts
StaffIdentity = {id,name,teacherCode?,roles:("TEACHER"|"MANAGER")[],
  profileStatus:"ACTIVE"|"PAUSED"|"INACTIVE",
  accountStatus:"PENDING"|"ACTIVE"|"LOCKED",permissions?:string[]}
ClassAccess = {classId,canView:boolean,assignmentStatus:"ACTIVE"|"ENDED"|"COMPLETED"|null,
  assignmentConfirmed:boolean,profileStatus,accountStatus,classStatus}
```

`GET /classes/{classId}/access` lấy quyền/lifecycle mới. Chỉ cho sửa learning khi có TEACHER + profile/account ACTIVE + chính assignment ACTIVE đã xác nhận + lớp ACTIVE. Nhãn không cấp quyền. Người có MANAGER xem mọi nội dung trong tenant; teacher chỉ xem lớp có quan hệ hiện tại/lịch sử. `/classes?workspace=teacher` lọc quan hệ của chính người gọi, kể cả historical; workspace chỉ là bộ lọc, không cấp quyền. Endpoint học sinh không nhận staff token và ngược lại.

Frontend nhớ workspace theo ID; chỉ một role không hiện switch. Không gian manager luôn chỉ xem learning, dù người dùng có cả hai role. Backend kiểm tra TEACHER/assignment/lifecycle độc lập với switch. Refresh `/auth/me` mỗi 60 giây/focus, access mỗi 30 giây/focus; backend không chờ polling để thu hồi quyền. 401 xóa session/cache; 403 giữ phiên, 409 yêu cầu tải lại/preview mới, 422 giữ form và lỗi inline.

Tương thích backend ESS cũ: login/exchange và bearer validation của backend hiện tại kiểm tra `Teacher.IsActive` trên mỗi request. Shape TEACHER thiếu hai trạng thái được chuẩn hóa ACTIVE **cho việc đọc**. Không suy ra assignment ACTIVE hay quyền sửa từ login/permissions. Access 404 cho phép màn hình đọc dựa trên endpoint protected hiện hữu, mọi action sửa bị khóa. Khi backend trả trạng thái mới, luôn dùng chính giá trị đó. ADMIN cũ không được tự nâng thành MANAGER. Backend phải migrate role trước khi bật quản lý thật.

## Models

Model đầy đủ ở `src/features/management/models.ts`. Mọi entity có `{id,version,createdAt,updatedAt}`.

| Entity | Thuộc tính |
|---|---|
| Student | fullName, nickname, dateOfBirth, parentContact, notes, status ACTIVE/PAUSED/INACTIVE |
| Staff profile | fullName, email, phone, notes, status ACTIVE/PAUSED/INACTIVE |
| Class | code, name, schedule, notes, totalUnits, status DRAFT/ACTIVE/PAUSED/COMPLETED/INACTIVE, studentCount, completedUnits |
| Account | loginId duy nhất (không phân biệt hoa/thường), profileId, kind STUDENT/STAFF, roles[], status PENDING/ACTIVE/LOCKED |
| AssignmentLabel | name, notes, status ACTIVE/INACTIVE |
| TeacherClassAssignment | classId, teacherId, labelId, status ACTIVE/ENDED/COMPLETED, startAt, endAt, requiresReconfirmation, history[] |
| AssignmentPeriod | startAt, endAt, status, labelId, reason |
| Enrollment | classId, studentId, status ACTIVE/ENDED/COMPLETED, history[{startAt,endAt,status,reason}] |
| AuditEvent | at, actorId, action, entity, ids[], reason, changes[{id,fields[]}] |

Một account liên kết một profile đúng loại; profile không bị đổi loại/liên kết qua edit thông thường. Student account có roles=[] và không vào Staff. Tạo account phải PENDING; profile mới có thể tạo cùng account bằng `createAccount:true`. Staff profile roles trong bảng/form được áp dụng vào account liên kết; không có account thì chọn roles lúc tạo account riêng. Không tự tạo phân công/enrollment từ profile/import.

## Endpoints quản lý

Mọi endpoint `/manager/*` yêu cầu MANAGER, tài khoản/hồ sơ ACTIVE. Frontend dùng **cùng createApi/baseQuery**, không có auth/fetch thứ hai.

| Method | URL | Input / response data |
|---|---|---|
| GET | /manager/dashboard?from=&to=&classId=&status= | DashboardStats (bên dưới) |
| GET | /manager/warnings | Impact[] lớp ACTIVE không có giảng viên hợp lệ |
| GET | /manager/{entity}?search=&status=&classId=&accountStatus=&role=&page=&pageSize= | `{items:Entity[],total,page,pageSize}`; entity students/teachers/classes/accounts/labels |
| GET | /manager/{entity}/{id} | `{record,accounts,classes,assignments,enrollments,labels,teachers,students}` |
| POST | /manager/selection/count | `{entity,selection}` → `{count}`; số chọn chính xác khi excluded IDs thay đổi |
| POST | /manager/changes/preview | PreviewRequest → BulkPreview; dùng cho create/update/bulk/status/restore |
| POST | /manager/changes/commit | CommitRequest + Idempotency-Key → `{updated}` |
| GET | /manager/assignments?classId=&teacherId= | TeacherClassAssignment[] |
| POST | /manager/assignments/preview | `{classId,teacherId,labelId,status,version?}` → BulkPreview |
| POST | /manager/enrollments/preview | `{classId,studentId,status:"ACTIVE"|"ENDED",version?}` → BulkPreview |
| POST | /manager/accounts/{id}/activation | `{code,expiresAt,kind}`; vô hiệu hóa link cũ |
| POST | /auth/activate | public `{code,password}` → `{activated:true}`; không gửi bearer cũ |
| GET | /manager/{students|teachers}/excel/template | binary .xlsx, template trống |
| POST | /manager/{students|teachers}/excel/export | `{selection}` → binary .xlsx; Schema ghi scope/số lượng |
| POST | /manager/{students|teachers}/excel/preview | multipart `file`, `mode=CREATE|UPDATE`, `clearFields` dấu phẩy → ImportPreview (= BulkPreview) |
| GET | /manager/audit?page=&search= | `{items:AuditEvent[],total}`; trang 20 items |

Tạo/sửa từng hồ sơ, đổi trạng thái, bulk và import cùng preview/commit. Không tạo PATCH status bypass. Form edit gửi version hiện tại. Quan hệ đã tồn tại yêu cầu version của quan hệ; phân công lại dùng ID ổn định và thêm history. Label inactive không gắn mới; giữ nhãn các giai đoạn lịch sử.

### Preview/commit

```json
{"entity":"teachers","selection":{"mode":"FILTER","filter":{"status":"ACTIVE","classId":"class-green"},"excludedIds":["GV0002"]},"patch":{"status":"INACTIVE","notes":"Nghỉ giảng dạy"},"mode":"UPDATE","clearFields":[]}
```

Hoặc `selection:{mode:"IDS",ids:[...]}`. Thêm/sửa từng dòng:

```json
{"entity":"students","mode":"CREATE","rows":[{"id":"HVNEW01","fullName":"Nguyễn An","nickname":"Bon","dateOfBirth":"2016-05-12","parentContact":"0900000000","status":"ACTIVE","notes":"","createAccount":true}]}
```

Preview:

```json
{"data":{"previewId":"opaque-id","version":1,"count":1,"scope":"Toàn bộ kết quả bộ lọc (server chốt tại preview)","changes":[{"entity":"teachers","id":"GV0001","before":{"id":"GV0001","status":"ACTIVE","version":1},"after":{"id":"GV0001","status":"INACTIVE","version":2},"row":2}],"impacts":[{"classId":"class-single","className":"Starters 02","remainingTeachers":[],"afterUnstaffed":true,"message":"Giữ nội dung học tập và lịch sử."}],"errors":[],"warnings":[],"requiredConfirmations":["STATUS_IMPACT","ASSIGNMENT_IMPACT"],"expiresAt":"2026-10-04T10:10:00Z"}}
```

`before/after` trên là ví dụ rút gọn; response thật chứa đầy đủ model. Commit:

```http
POST /v1/manager/changes/commit
Authorization: Bearer <JWT>
Idempotency-Key: <random-stable-key-per-preview>
Content-Type: application/json

{"previewId":"opaque-id","version":1,"confirmations":["STATUS_IMPACT","ASSIGNMENT_IMPACT"],"reason":"Giảng viên nghỉ công tác"}
```

Backend lưu selection/IDs/versions/ảnh hưởng tại preview, thuộc actor/tenant; hạn 10 phút. Commit không tin diff/ảnh hưởng do client gửi. Backend kiểm lại actor, version, business rules và confirmations trong cùng transaction. Khóa idempotency gắn actor + preview + request digest; replay cùng request không ghi hai lần, khác request trả 409. Snapshot selection FILTER chốt tất cả kết quả, không chỉ trang đang xem. Mock dùng revision toàn dataset, chủ động trả 409 nếu bất kỳ dữ liệu nghiệp vụ đổi sau preview; backend có thể dùng snapshot/versions chi tiết hơn nhưng phải phát hiện thay đổi liên quan và membership của filter.

Confirmations: STATUS_IMPACT, ASSIGNMENT_IMPACT, INCOMPLETE_CLASS, RELATIONSHIP_IMPACT. Có ảnh hưởng phải có reason. Profile PAUSED/INACTIVE kết thúc phân công/enrollment ACTIVE bị ảnh hưởng. Bỏ TEACHER/khóa account cũng kết thúc phân công hiện tại. Backend bảo vệ quản lý cuối cùng **sau toàn bộ transaction**, kể cả import nhiều dòng. Không cho ID trùng, đổi kind/profile của account hay kích hoạt account không có profile hợp lệ.

### Lifecycle lớp và khôi phục

* completedUnits = distinct unitNumber của phiên COMPLETED theo lớp; totalUnits >= Unit cao nhất của mọi phiên đã dùng (kể cả DRAFT). Giảm mẫu số có preview tiến độ trước/sau.
* COMPLETED chuyển assignment ACTIVE → COMPLETED; lịch sử ENDED/COMPLETED khác giữ nguyên. Hoàn thành chưa đủ Unit cần INCOMPLETE_CLASS + lý do. Enrollment ACTIVE của lớp chuyển COMPLETED.
* PAUSED khóa sửa và đánh dấu assignment đang ACTIVE cần xác nhận lại. Mở lại ACTIVE không tự khôi phục quyền: `assignmentConfirmed=false` đến khi quản lý xác nhận phân công riêng.
* INACTIVE là thao tác mềm, kết thúc assignment ACTIVE; giữ hồ sơ/lịch sử/điểm. COMPLETED/INACTIVE mở lại cũng cần phân công riêng.
* Restore profile ACTIVE không tự khôi phục assignment/enrollment. Ghi danh lại giữ ID quan hệ và thêm giai đoạn; điểm/báo cáo cũ không mất. Cảnh báo ACTIVE chưa có người chỉ hết khi có assignment ACTIVE, confirmed, profile/account ACTIVE và TEACHER hoặc lớp ra khỏi ACTIVE.
* `GET /classes/{id}/students?includeHistory=true` phục vụ bảng/form đọc điểm lịch sử (cả học sinh đã ngừng/ghi danh đã kết thúc); danh sách lớp hiện tại mặc định chỉ ACTIVE. Dòng lịch sử chỉ xem. Backend cũng chặn ghi điểm cho enrollment/profile không còn hoạt động.

## Dashboard/statistics

Response: `{asOf,activeStudents,activeTeachers,pendingAccounts,dualRoleStaff,byStatus:{DRAFT,ACTIVE,PAUSED,COMPLETED,INACTIVE},completedUnits,totalUnits,classes,warnings,interval:{from,to,completedSessions,newlyCompletedUnits,denominator}}`.

Các chỉ số trên là **snapshot hiện tại**, scope theo classId/status; không biến số học sinh hiện tại thành số học sinh lịch sử. interval dùng ngày học phiên trong [from,to], bao gồm hai đầu. newlyCompletedUnits là distinct `(classId,unitNumber)` lần đầu có phiên COMPLETED trong khoảng, bỏ Unit đã hoàn thành trước from; denominator = tổng Unit các lớp hiện tại trong scope và được ghi rõ. Một Unit có nhiều phiên chỉ đếm một lần. Xuất thống kê từ snapshot query đang hiển thị và ghi filter/asOf/cách tính, không gồm token.

## Excel

Workbook Data + Schema + Instructions. Template version 1. Exact headers:

```
students: student_id, full_name, nickname, date_of_birth, parent_contact, status, notes, create_account
teachers: teacher_id, full_name, email, phone, roles, status, notes, create_account
```

Roles TEACHER / MANAGER / TEACHER|MANAGER. create_account TRUE/FALSE hoặc ô trống. Date dạng Text YYYY-MM-DD. Giữ liên hệ/ID kiểu Text và số 0 đầu. Không nhận công thức/hyperlink/rich text; giữ Unicode và xuống dòng text. Tối đa 5 MB / 5000 dòng; bỏ dòng hoàn toàn trống. Schema chứa template_version, entity, scope, generated_at. Sai group/version/header/order, ID trùng, kiểu dữ liệu, date/role/status sai đều có lỗi dòng/cột; export lỗi thành .xlsx. Không trộn ví dụ vào Data, ví dụ chỉ ở Instructions.

CREATE không chấp nhận ID đã có; UPDATE yêu cầu ID đã có. Ô trống giữ dữ liệu cũ; `clearFields` chỉ từ lựa chọn xóa rõ của người dùng, preview diff trước khi commit. Không xóa trường bắt buộc; profile student/staff và account tách trạng thái. Cập nhật status/roles sử dụng cùng lifecycle, không bỏ qua bằng Excel. Preview/import không ghi dữ liệu; commit nguyên tử, có audit và idempotency, backend validation lại. Export được chọn IDs hoặc tất cả FILTER, scope ghi trong Schema; tuyệt đối không có password/password hash/token/activation code.

## Lỗi và vận hành

| HTTP | Code ví dụ | Xử lý |
|---|---|---|
| 400 | INVALID_BODY / INVALID_CODE | Request/mã sai |
| 401 | UNAUTHORIZED / TOKEN_EXPIRED / ACCOUNT_LOCKED | Xóa browser session + toàn RTK cache, login |
| 403 | FORBIDDEN / STAFF_REQUIRED | Không có quyền, giữ session |
| 404 | NOT_FOUND / PREVIEW_NOT_FOUND | Không tồn tại hoặc ngoài tenant; không lộ thông tin |
| 409 | VERSION_CONFLICT / IDEMPOTENCY_CONFLICT | Tải lại/preview mới; không tự ghi đè |
| 410 | PREVIEW_EXPIRED / CODE_USED / ACTIVATION_EXPIRED | Cấp link / tạo preview mới |
| 422 | VALIDATION_ERROR / CONFIRM_REQUIRED / REASON_REQUIRED / INVALID_TEMPLATE | Giữ form, chỉ lỗi rõ |
| 429 | RATE_LIMITED | Hiển thị thử lại, backend Retry-After |
| 500 | INTERNAL_ERROR | Lỗi chung, không lộ DB/secrets |

CORS allow origin `https://vqviet03.github.io` (không có path repo), headers Authorization, Content-Type, Idempotency-Key; methods GET/POST/PATCH/PUT/OPTIONS. Expose Content-Disposition cho tải .xlsx, Retry-After. JWT issuer/audience/signature/exp kiểm phía backend. Activation/exchange code ngẫu nhiên crypto, chỉ lưu digest, TTL ngắn, consume một lần trong transaction; không log code/password/token. Đặt lại mật khẩu thu hồi phiên cũ. Backend cần index/unique tenant+ID/loginId, unique teacherId+classId/enrollment studentId+classId, history append-only và audit.

## ID và queue

Xem [identifiers-operations.md](identifiers-operations.md) cho suggest/check, ID CREATE/UPDATE, nameSuffix, operation 202 và WebSocket. Preview đồng bộ trả ID cuối; commit với Prefer bất đồng bộ trả operation, DONE giữ nguyên envelope commit.
