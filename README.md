# LearnLeaf · Cổng giảng viên

Next.js App Router, TypeScript strict, MUI, Redux Toolkit/RTK Query, React Hook Form/Zod. Giao diện tiếng Việt, sáng/tối/theo hệ thống; bảng desktop và form mobile. Theo [Figma](https://www.figma.com/design/lijTH4LOpagJqMJHv6gv7w): Roboto tự host, nền #f3f7f4, xanh #287751, card bo góc. Không có API Routes, Server Actions, middleware hoặc backend trong repository.

## Chạy và thử

Node.js 24 LTS, npm. Lockfile được giữ trong Git.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

- Demo: **GV0001 / Demo123!**.
- Link demo: `http://localhost:3000/login/link/#code=teacher-demo` (dùng một lần). Thử `expired-demo` để xem lỗi hết hạn. URL đã đọc sẽ xóa fragment ngay.
- Nút **Reset demo** khôi phục fixtures và đăng xuất, cho phép dùng lại link demo. Chỉ có trong chế độ mock.
- Mock có delay, đăng nhập sai, token hết hạn, code đã dùng, dữ liệu rỗng, kiểm tra quyền, version conflict. Dữ liệu giả lập lưu ở localStorage của thiết bị; JWT truy cập của phiên lưu sessionStorage. Không dùng thông tin cá nhân/credential thật.
- Seed: 3 lớp, 19 học sinh, phiên cùng Unit để kiểm tra không đếm trùng; bài 7 kỹ năng và bài 2 kỹ năng. Bon có 23.1/35 = 66%.
- Thử: đăng nhập → Juniors03 → sửa học sinh / tab Phiên học → Unit 3 → cấu hình / bảng / form từng học sinh / Excel.
- Đánh dấu phiên hoàn thành để tăng tiến độ; tạo phiên nháp không tăng. Bài đánh giá hoàn thành khóa điểm, cần về nháp để sửa. Hoàn thành bài yêu cầu từng học sinh có đủ điểm hoặc xác nhận vắng.

## API thật

| Biến công khai | Mặc định / ý nghĩa |
|---|---|
| NEXT_PUBLIC_USE_MOCK | `true`; `false` gọi API thật |
| NEXT_PUBLIC_API_BASE_URL | Ví dụ `https://api.example.com/v1` |
| NEXT_PUBLIC_API_TIMEOUT_MS | `15000`, thời gian chờ request |
| NEXT_PUBLIC_BASE_PATH | Trống local/root; `/ess-edu-staff-portal` cho project Pages |

Đổi `.env.local`, build lại; không sửa component. Real mode thiếu URL trả lỗi cấu hình, không fallback mock. Backend cần triển khai [contract](docs/api-contract.md), CORS cho origin Pages và quyền lớp trên mọi endpoint. Backend ESS hiện hữu chưa có đầy đủ các endpoint ghi/import trong contract này; real mode chỉ hoạt động đầy đủ sau khi backend hỗ trợ contract. Không đưa JWT signing key, mật khẩu DB hoặc secret vào NEXT_PUBLIC_*.

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

PR vào `dev`: lint, typecheck, 16 test logic/API/Excel, production build và Playwright static deep links; **không deploy PR**. Merge/push vào `dev` mới chạy workflow Deploy dev to GitHub Pages, chỉ deploy sau checks thành công. Nhánh tính năng không deploy, không tự merge.

1. Repository → **Settings → Pages → Source: GitHub Actions**.
2. Settings → Actions → General: cho phép Actions; environment `github-pages` cho phép nhánh `dev` (nếu có quy tắc deployment).
3. Mặc định URL `https://vqviet03.github.io/ess-edu-staff-portal/`. Repository private cần gói GitHub có hỗ trợ Pages; nếu không, chủ repo quyết định nâng gói hoặc đổi visibility.
4. Variables (Settings → Secrets and variables → Actions → Variables): `NEXT_PUBLIC_USE_MOCK`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_TIMEOUT_MS`. Đây là biến công khai. `PAGES_BASE_PATH` mặc định `/ess-edu-staff-portal`; root/custom domain đặt `/` và thêm CNAME đúng domain trong public nếu dùng custom domain.
5. Review và merge PR vào dev. Workflow kiểm tra mock trước, build lại cấu hình thật nếu `NEXT_PUBLIC_USE_MOCK=false`, upload Pages artifact, deploy bằng OIDC. Chỉ job deploy có pages:write/id-token:write.

Quyền tích hợp hiện tại đọc/cấu hình Pages trả `403 Resource not accessible by integration`; workflow đã chuẩn bị, cần chủ repository bật Source như trên. Chưa khẳng định site đã publish.

## Cấu trúc

`src/features/{auth,classes,students,sessions,assessments,scores,excel}`, `types`, `api`, `store`, `mock`, `theme`, `shared`, `utils`. Model, fixtures, adapter, endpoints và UI tách riêng. `tests/` kiểm tra công thức/null/0/schema/version/mode/import nguyên tử; `e2e/` kiểm tra thao tác trình duyệt/static/mobile. [API contract](docs/api-contract.md) là đầu vào xây backend, không giả định backend cũ đã hỗ trợ toàn bộ.
