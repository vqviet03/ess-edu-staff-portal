# ESS Staff Portal

Next.js App Router, TypeScript strict, MUI, Redux Toolkit/RTK Query, React Hook Form/Zod. Giao diện tiếng Việt, sáng/tối/theo hệ thống; bảng desktop và form mobile. Theo [Figma](https://www.figma.com/design/lijTH4LOpagJqMJHv6gv7w): Roboto tự host, nền #f4f8f5, xanh #317b58, card bo góc. Không có API Routes, Server Actions, middleware hoặc backend trong repository.

## Chạy và thử

Node.js 24 LTS, npm. Lockfile được giữ trong Git.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

- Mặc định gọi API thật tại `https://ess-edu-portal-api-246816830212.asia-southeast1.run.app/v1`. Auth và endpoint giảng viên đã hoạt động; các endpoint/quyền quản lý mới cần triển khai theo contract quản lý.
- Tài khoản backend demo: **GV000001 / TeacherDemo123!** (email `teacher@ess.local` cũng được), lớp **ess20-a1**. Chỉ dùng trong môi trường thử nghiệm đã seed; không dùng mật khẩu demo cho tài khoản thật.
- Để chạy offline: đặt `NEXT_PUBLIC_USE_MOCK=true`. Các hướng dẫn mock bên dưới chỉ áp dụng khi bật rõ ràng chế độ này. Mock demo: **GV0001 / Demo123!**.
- Link demo: `http://localhost:3000/login/link/#code=teacher-demo` (dùng một lần). Thử `expired-demo` để xem lỗi hết hạn. URL đã đọc sẽ xóa fragment ngay.
- Nút **Reset demo** khôi phục fixtures và đăng xuất, cho phép dùng lại link demo. Chỉ có trong chế độ mock.
- Mock có delay, đăng nhập sai, token hết hạn, code đã dùng, dữ liệu rỗng, kiểm tra quyền, version conflict. Dữ liệu giả lập lưu ở localStorage của thiết bị; JWT truy cập của phiên lưu sessionStorage. Không dùng thông tin cá nhân/credential thật.
- Seed: 6 lớp, 34 học sinh, 17 hồ sơ Staff, phiên cùng Unit để kiểm tra không đếm trùng; bài 7 kỹ năng và bài 2 kỹ năng. Bon có 23.1/35 = 66%.
- Thử: đăng nhập → Juniors03 → sửa học sinh / tab Phiên học → Unit 3 → cấu hình / bảng / form từng học sinh / Excel.
- Đánh dấu phiên hoàn thành để tăng tiến độ; tạo phiên nháp không tăng. Bài đánh giá hoàn thành khóa điểm, cần về nháp để sửa. Hoàn thành bài yêu cầu từng học sinh có đủ điểm hoặc xác nhận vắng.

## API thật

| Biến công khai | Mặc định / ý nghĩa |
|---|---|
| NEXT_PUBLIC_USE_MOCK | `false` mặc định; `true` bật mock offline |
| NEXT_PUBLIC_API_BASE_URL | URL Cloud Run đã có trong `.env.example`; root tự thêm `/v1` |
| NEXT_PUBLIC_API_TIMEOUT_MS | `15000`, thời gian chờ request |
| NEXT_PUBLIC_BASE_PATH | Trống local/root; `/ess-edu-staff-portal` cho project Pages |

Đổi `.env.local`, build lại; không sửa component. Production build thiếu/sai URL, mode hoặc timeout bị từ chối; không fallback mock. HTTP chỉ dùng localhost khi phát triển. Backend ESS đã hỗ trợ auth, giảng viên, quản lý và access theo lớp; mọi request vẫn cần kiểm tra quyền ở backend. Không đưa JWT signing key, mật khẩu DB hoặc secret vào NEXT_PUBLIC_*.

Đăng nhập mới xóa RTK Query cache để không giữ dữ liệu phiên trước. JWT cũ từ mock hoặc backend khác bị xóa khi khôi phục phiên; reload xác minh `/auth/me`. Logout gọi `POST /auth/logout` thu hồi session trên backend rồi xóa session và RTK Query cache; mạng lỗi vẫn đăng xuất tại browser. Login/link không gửi JWT cũ; phản hồi 401 đến muộn không xóa phiên mới. Models lưu thêm `teacherCode`, `roles`, `permissions` do backend trả, sẵn sàng cho tài khoản MANAGER/TEACHER cùng dùng portal.

Mọi request, kể cả tải mẫu/file import, đi qua RTK Query. Mutations không tự retry. Tags và cache keys theo lớp/phiên/bài; version chống ghi đè. Guard client chỉ phục vụ UX; backend là nguồn xác nhận quyền và điểm cuối cùng.

## Điểm và Excel

Điểm kỹ năng / maxQuestions × 100; tổng đạt / tổng maxQuestions × 100, không trung bình tỷ lệ. Trống = null, 0 vẫn là điểm. Tổng chưa đủ có nhãn tạm tính và số phần đã nhập. Chỉ làm tròn khi hiển thị. Vắng không tự nhận 0; chuyển sang vắng khi có điểm cần xác nhận xóa. Bảng chỉ gửi dòng sửa, có lỗi riêng dòng; form và bảng dùng cùng validation/tính điểm.

ExcelJS chỉ tải khi cần. Mẫu .xlsx có Scores, Schema, Instructions; đúng lớp/bài/schema, danh sách và dữ liệu hiện tại, validation Excel, cột tổng công thức khóa chỉnh sửa, result_version ẩn. Preview kiểm tra lại dữ liệu, bỏ qua công thức tổng; lỗi dòng/cột và tải .xlsx lỗi. Ô trống giữ dữ liệu cũ mặc định, 0 cập nhật. Chế độ thay thế có xác nhận riêng, xóa giá trị trống trong dòng nhập. Commit nguyên tử và Idempotency-Key. Backend thật phải thực thi lại mọi kiểm tra; sheet protection không phải cơ chế bảo mật. Giới hạn 5 MB, 1000 dòng; cần giới hạn kích thước giải nén XLSX trên backend.

## Routes và static hosting

`/` điều hướng theo phiên; `/login/`, `/login/link/`, `/home/`, `/class/?classId=…`, `/session/?classId=…&sessionId=…`, `/assessment/`, `/scores/`, `/student-score/`, `/import/`. Ba route sau dùng classId/sessionId/assessmentId; student-score thêm studentId (mặc định học sinh đầu). Route đều tĩnh, query không cần SPA rewrite.

```bash
npm run lint
npm run typecheck
npm test
NEXT_PUBLIC_BASE_PATH=/ess-edu-staff-portal npm run build
NEXT_PUBLIC_BASE_PATH=/ess-edu-staff-portal npm run preview
# http://localhost:4173/ess-edu-staff-portal/login/
npx playwright install chromium
NEXT_PUBLIC_BASE_PATH=/ess-edu-staff-portal npm run test:e2e
```

`output: export`, `trailingSlash: true`; deploy thư mục `out/`, không dùng next start. Mỗi route có index.html nên reload trực tiếp hoạt động. basePath do Next quản lý cho links/assets; mock và API thật độc lập với basePath. Thay env cần build lại. Không có service worker/offline hoặc Next server. Phiên giới hạn theo expiresAt/JWT exp, kiểm tra khi reload, focus và mỗi 10 giây; 401 xóa phiên/cache. sessionStorage bị chặn: phiên không thể khôi phục khi reload; localStorage bị chặn: mock trả lỗi lưu, dùng trình duyệt cho phép storage.

## GitHub Pages

PR vào `dev`: lint, typecheck, tests logic/HTTP/Excel, production build **real** và Playwright static deep links; **không deploy PR**. Merge/push vào `dev` mới chạy workflow Deploy dev to GitHub Pages, chỉ deploy sau checks thành công. Nhánh tính năng không deploy, không tự merge.

1. Repository → **Settings → Pages → Source: GitHub Actions**.
2. Settings → Actions → General: cho phép Actions; environment `github-pages` cho phép nhánh `dev` (nếu có quy tắc deployment).
3. Mặc định URL `https://vqviet03.github.io/ess-edu-staff-portal/`. Repository private cần gói GitHub có hỗ trợ Pages; nếu không, chủ repo quyết định nâng gói hoặc đổi visibility.
4. Workflow đã có URL backend mặc định và luôn build `NEXT_PUBLIC_USE_MOCK=false`; không cần quyền sửa Variables để deploy. Variables tùy chọn (Settings → Secrets and variables → Actions → Variables): `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_TIMEOUT_MS`, dùng để ghi đè cấu hình công khai. `PAGES_BASE_PATH` mặc định `/ess-edu-staff-portal`; root/custom domain đặt `/` và thêm CNAME đúng domain trong public nếu dùng custom domain.
5. Review và merge PR vào dev. Workflow kiểm tra bản build real bằng HTTP fixtures chỉ ở tests, sau đó build riêng với URL Cloud Run, upload Pages artifact và deploy bằng OIDC. Không xuất bản artifact dùng URL test/demo. Chỉ job deploy có pages:write/id-token:write.

Quyền tích hợp hiện tại đọc/cấu hình Pages trả `403 Resource not accessible by integration`; workflow đã chuẩn bị, cần chủ repository bật Source như trên. Chưa khẳng định site đã publish.

## Kiểm thử API thật

`npm test`: regression mock, công thức, Excel và HTTP thật qua typed RTK endpoints, Bearer, version, XLSX/multipart/Idempotency-Key, 401/403 và phản hồi 401 cũ. Playwright mặc định chạy build real, intercept HTTP **chỉ trong tests**; xuất bản không có adapter test. Build và browser tests cần cùng env:

```bash
NEXT_PUBLIC_USE_MOCK=false NEXT_PUBLIC_API_BASE_URL=https://api.example.com/v1 NEXT_PUBLIC_BASE_PATH=/ess-edu-staff-portal npm run build
NEXT_PUBLIC_USE_MOCK=false NEXT_PUBLIC_API_BASE_URL=https://api.example.com/v1 NEXT_PUBLIC_BASE_PATH=/ess-edu-staff-portal npm run test:e2e
```

Kiểm thử tích hợp ASP.NET + PostgreSQL thật đã seed, chỉ dùng backend/DB test riêng vì có sửa học sinh/điểm và tạo phiên/bài mới:

```bash
NEXT_PUBLIC_USE_MOCK=false NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8092/v1 NEXT_PUBLIC_BASE_PATH=/ess-edu-staff-portal npm run build
TEST_LIVE_API=true NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8092/v1 NEXT_PUBLIC_BASE_PATH=/ess-edu-staff-portal npx playwright test e2e/live-api.spec.ts
```

Backend test phải cho phép CORS `http://127.0.0.1:4173`, có seed `GV000001 / TeacherDemo123!` và lớp `ess20-a1`; dùng `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` nếu đã có Chromium. Link real chỉ dùng mã ngắn hạn do backend cấp; `teacher-demo` không dùng được trong real mode. Kiểm thử link với backend thật nhận `TEST_STAFF_LINK_CODE` và `TEST_STAFF_EXPIRED_LINK_CODE` từ môi trường test đã tạo code; nếu chưa cấp, chỉ test link này được skip. Không dùng mã/DB production trong bộ test.

## Cấu trúc

`src/features/{auth,classes,students,sessions,assessments,scores,excel}`, `types`, `api`, `store`, `mock`, `theme`, `shared`, `utils`. Model, fixtures, adapter, endpoints và UI tách riêng. `tests/` kiểm tra công thức/null/0/schema/version/mode/import nguyên tử; `e2e/` kiểm tra thao tác trình duyệt/static/mobile. [API contract](docs/api-contract.md) mô tả nghiệp vụ giảng viên; [contract quản lý](docs/management-api-contract.md) mô tả API quản lý của backend ESS.


## Quản lý trong cùng ESS Staff Portal

Không tạo app/auth/deployment riêng. Thiết kế [Figma](https://www.figma.com/design/FbROYl4kQMTW4XbvvShuWV?node-id=2-3004); sidebar xanh pastel, dashboard, bảng desktop/card mobile, sáng/tối/theo hệ thống. Chỉ tài khoản có cả TEACHER và MANAGER thấy switch; lựa chọn hợp lệ nhớ theo ID. Quản lý chỉ xem learning; sửa phiên/schema/điểm phải ở không gian Giảng viên và có phân công hợp lệ trong chính lớp ACTIVE.

Chạy bản duyệt quản lý: `NEXT_PUBLIC_USE_MOCK=true npm run dev`. Tài khoản demo (tất cả mật khẩu `Demo123!`):

| ID | Vai trò | Link đăng nhập demo dùng một lần |
|---|---|---|
| GV0001 | TEACHER | `/login/link/#code=teacher-demo` |
| MG0001 | MANAGER | `/login/link/#code=manager-demo` |
| BOTH0001 | TEACHER + MANAGER | `/login/link/#code=dual-demo` |
| GV0002 | TEACHER (người phụ trách thứ hai) | Đăng nhập ID/password |

Thêm basePath repo trước route khi chạy Pages. Reset demo giữ cơ chế cũ, xóa dữ liệu demo và đăng xuất; dữ liệu mock mutations lưu localStorage. Đây là dữ liệu công khai giả lập. Account tạo mới PENDING không nhận mật khẩu demo; cấp link kích hoạt tại profile rồi đặt mật khẩu. Mock chỉ lưu hash demo cho mật khẩu mới, không mật khẩu rõ. Backend thật phải hash bằng cơ chế phù hợp và lưu code dạng digest.

Các route tĩnh mới: `/manage/list/?entity=students|teachers|classes|accounts|labels`, `/manage/profile/?entity=...&id=...`, `/manage/warnings/`, `/manage/audit/`, `/manage/grid/?entity=students|teachers`, `/manage/excel/?entity=students|teachers`, `/activate/#code=...`. Không dynamic routes hoặc rewrite.

Hỗ trợ form tạo/sửa, tài khoản liên kết, lớp/enrollment/assignment và lịch sử; soft-deactivate/restore, hoàn thành lớp ngoại lệ, nhãn ngừng dùng, bulk toàn filter qua nhiều trang (server chốt preview), bảng nhập/dán nhiều dòng, template/export/import .xlsx và tải lỗi. Tất cả đi qua preview/commit có version, confirmations, reason, idempotency và audit. Ngừng/khôi phục không tự khôi phục quan hệ. Khi pause/reopen lớp phải xác nhận lại phân công. Bảng/form dùng chung validation với mock/Excel.

Seed gồm lớp nhiều/ít/không có giảng viên, phân công ACTIVE/ENDED/COMPLETED, Staff một/hai vai trò, >1 trang học sinh/Staff, hai schema 7/2 kỹ năng. `seedEmptyStudents()` trong fixtures phục vụ kiểm thử nhóm rỗng; template luôn trống và ví dụ chỉ trong Instructions. Tests mô phỏng conflict, thu hồi quyền, import lỗi/atomic và replay idempotency.

**Nối API quản lý thật:** đổi `NEXT_PUBLIC_USE_MOCK=false`, đặt URL và build lại. [Contract quản lý](docs/management-api-contract.md) dùng cùng backend ESS, bao gồm MANAGER/TEACHER, activation, access, history roster và preview/commit. Không fallback mock hoặc tự map ADMIN thành MANAGER; thiếu quyền/endpoint thì hiển thị lỗi và khóa thao tác.

Workflow Pages **giữ nguyên**: PR dev kiểm tra, không deploy; push dev sau merge mới build/deploy. Workflow build real mặc định. Backend cần rollout migration 006 và API ID/operations trước khi merge frontend mới; không chuyển workflow sang mock để che API thiếu.

Kiểm tra: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; browser tests qua `npm run test:e2e` với API URL/mode/basePath giống build. CI intercept HTTP ở test process, production dùng fetchBaseQuery thật. Regression giảng viên cũ, ma trận quyền, lifecycle, bulk, version, Excel và auth có tests. Screenshots dashboard light/dark/mobile được browser test lưu trong test-results (không commit ảnh/trace).

## ID và thông báo realtime

[Contract ID/tác vụ nền](docs/identifiers-operations.md): nhập tên gọi backend sinh ID, ID tùy chỉnh có nút kiểm tra trùng; CREATE bảng/Excel cho phép ID trống/trùng và xem ID đã cấp ở preview. Lớp tự cấp `ess21…`, hậu tố tên sửa riêng. Các ID hiện có giữ nguyên.

Mutation gửi `Prefer: respond-async` và idempotency key, UI báo đang xử lý sau HTTP 202. WebSocket trong RTK Query nhận completion, Redux invalidate dữ liệu liên quan; polling là dự phòng và phục hồi sau reload. JWT gửi ở frame AUTH, không trên URL. Mock cũng có queue, events và lưu dữ liệu khi reload. Khi Cloud Run scale về 0/mọi client offline, job tiếp tục lúc truy cập lại; xử lý liên tục cần cấu hình backend riêng. Không cần thêm biến NEXT_PUBLIC hoặc thư viện.

## Công bố báo cáo sang trang học sinh

Trong Giảng viên → lớp đang phụ trách → phiên → bài đánh giá: nhập đủ điểm hoặc xác nhận vắng cho từng học sinh, **Đánh dấu hoàn thành**, sau đó **Công bố báo cáo cho học sinh**. Hoàn thành chỉ khóa điểm, chưa công bố. Học sinh chọn đúng lớp và tải lại trang để xem Unit đã công bố. Một Unit dùng một bài làm nguồn; UI xác nhận trước khi thay nguồn. Gỡ công bố trước khi chuyển bài về nháp/sửa; lịch sử và điểm được giữ. Quản lý chỉ xem trạng thái, không công bố nếu không có quyền giảng viên của lớp.

`GET /assessments/:id/publication` và POST publish/unpublish dùng RTK Query, Prefer/queue/idempotency hiện tại. Backend cần có endpoint trạng thái trước khi merge frontend. Mock thực hiện snapshot, version, quyền, gỡ công bố và persist khi reload.

## Thời hạn và kết thúc phiên tài khoản

Quản lý → hồ sơ Học sinh/Giảng viên/Tài khoản → **Phiên đăng nhập**: đặt năm/tháng/ngày/giờ/phút (tổng lớn hơn 0, tối đa 10 năm), hoặc mặc định hệ thống. Chính sách áp dụng cho đăng nhập mới bằng mật khẩu và link. **Buộc kết thúc tất cả phiên** cần lý do/xác nhận; tài khoản vẫn đăng nhập lại được. MANAGER và tài khoản hai vai trò được bảo vệ khỏi thao tác này. Form giữ dữ liệu khi lỗi/version conflict, có cảnh báo chưa lưu; HTTP 202 và realtime dùng RTK Query/queue sẵn có.

Xem [contract phiên tài khoản](docs/account-sessions.md). Mock thực hiện thu hồi mọi token đích, thời hạn riêng, audit/version/idempotency và persist khi reload; tài khoản demo hiện tại dùng mặc định 60 phút. Không cần biến môi trường hay thư viện mới. Backend cần áp dụng migration 007 và deploy API trước khi merge frontend.

Lịch sử đăng nhập trong hồ sơ tài khoản hiển thị thời gian Việt Nam, thiết bị/trình duyệt/OS và IP kết nối (có thể là proxy; chưa xác định vị trí). Chỉ MANAGER xem được. Bảng nhập hỗ trợ Tạo mới/Cập nhật, ID tự sinh ở CREATE, ô trống giữ dữ liệu ở UPDATE, xóa dòng và kiểm tra boolean/vai trò trước preview. Xem [contract chi tiết](docs/account-sessions.md).

## Báo cáo học sinh, hướng dẫn và thu/phóng

Xem [hướng dẫn tính năng và API](docs/student-reports.md). Mở “Báo cáo học tập” từ học sinh của lớp/hồ sơ quản lý; quản lý chỉ xem, giảng viên đang phụ trách có thể sửa nhận xét. Header có “Hướng dẫn” theo màn hình (vừa đọc vừa thao tác), nút −/100%/+ lưu kích thước 75–125%. Biểu đồ báo cáo cho bật/tắt từng kỹ năng hoặc tất cả. Route `/reports/` được static export như các route hiện có; Pages từ dev sau merge, cấu hình API thật và workflow giữ nguyên.
