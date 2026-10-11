# Bài tập — API thật

Thiết kế: https://www.figma.com/design/t3kAHowsm0FLtomJCMQiuv. Tái sử dụng theme, auth/session, phân quyền lớp, storage, RTK Query và chart hiện có. Ứng dụng chạy API thật; không có mock mới cho bài tập. Không chứa dữ liệu học sinh mẫu trong bản public.

## Màn hình

- Lớp → Tạo bài tập → `/assignment/?classId=...&mode=create`. Thiết lập → Soạn câu hỏi → Xem trước → Đăng.
- Sửa: `assignmentId=...&mode=edit`; danh sách bài nộp: `/assignment/?classId=...&assignmentId=...`; chấm: thêm `mode=grade&submissionId=...`.
- Màn bài tập → Báo cáo bài tập của lớp: phân trang thống kê từng học sinh, mở thẳng profile để xem chi tiết.
- Profile học sinh → tab Báo cáo bài tập (từng lớp, Unit hoặc toàn bộ). Quản lý chỉ xem; giảng viên có phân công hợp lệ mới sửa/chấm.

- `/post/?postId=...` là liên kết riêng cho bài đăng; menu Sao chép liên kết dùng domain/basePath hiện tại.
- Hồ sơ cá nhân → Đổi mật khẩu (cũ, mới, xác nhận); đổi thành công đăng nhập lại.
- Mọi route tĩnh; ID nằm trong query parameters. Giữ static export, trailing slash, GitHub Pages/custom domain và workflow dev hiện có. Không có Next API route hoặc Server Action.

## Kết nối và triển khai

Giữ `NEXT_PUBLIC_API_BASE_URL` hiện có (kết thúc bằng `/v1`), basePath hiện có và thời gian chờ API. Staff runtime bắt buộc API thật; biến mock không bật dữ liệu giả trong ứng dụng. Không cần secret hoặc thêm backend vào frontend. Build lại khi đổi env. Các biến NEXT_PUBLIC là công khai.

Backend cần merge/build image, chạy migrations Core `021_assignment_upload_dispatch.sql` (`--migrate`) và Materials `010_materials.sql` (`--migrate-materials`) bằng image mới rồi deploy API trước frontend. Không tự chạy migration khi startup. Không có dữ liệu production nào bị xóa. API contract chi tiết: [ESS API — assignments](https://github.com/vqviet03/ess-edu-api/blob/feat/assignments/docs/assignments.md).

## Contract RTK Query

`src/api/assignment-api.ts` injects endpoints vào API/auth/baseQuery hiện có: form/version, create/save/publish/withdraw/soft-delete, draft/submit, submissions/grade/publish, upload/recording và report. Response `{data:T}`, lỗi `{error:{code,message}}`; xử lý 401/403/409/422 bằng cơ chế hiện có. JWT chỉ ở Authorization header. Tags tách LearningAssignments, AssignmentForm, AssignmentDraft, AssignmentSubmissions, AssignmentReport; realtime signal invalidate đúng nhóm. Không polling/refetch interval hoặc retry mutation tự động.

Bản nháp debounce 900ms chỉ khi đáp án thay đổi. Version chống ghi đè; nộp có Idempotency-Key. Mỗi form được lưu thành phiên bản bất biến; bài nộp không đổi theo schema sửa sau đó. Nội dung nhập là plain text, link http/https được rút gọn chip tên miền, `[file:...]` thành chip file tại vị trí nhập; không execute HTML.

Media qua upload ticket của API, XHR trong RTK queryFn cho tiến trình/hủy; preview/download qua application có Bearer và kiểm tra quyền hiện tại. Không lưu signed GET URL lâu dài hoặc JWT trong URL. File chỉ được tính là trả lời sau khi server xác minh AVAILABLE. Audio được ffprobe xác minh thực trên backend; không tin duration client.

## Ghi âm và tài nguyên

Mic cần HTTPS (localhost được browser cho phép). Có xin quyền, bắt đầu/dừng/tự dừng theo giới hạn, nghe lại/ghi lại và Sử dụng bản ghi. Dừng không tự nộp. Chỉ chế độ cho phép upload audio mới hiện chọn file; chế độ chỉ ghi âm cần phiên ghi âm do backend cấp. Trình duyệt không thể chứng minh tuyệt đối nguồn audio chỉ bằng metadata.

Rời màn dừng MediaRecorder/MediaStreamTrack, clear timeout/animation frame và revoke object URL. Upload tạm được backend dọn bằng một Cloud Task hữu hạn theo school/ngày, không interval scan. Không ghi âm/xử lý âm thanh khi idle.

## Kiểm tra

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` với API env thật. Tests kiểm tra câu trả lời hợp lệ, null/0, link an toàn, direct-only recording và payload schema. Kiểm thử tích hợp PostgreSQL/RBAC/đáp án ẩn/version/nộp trùng/deadline/điểm/thời lượng audio/cleanup thuộc repo API.

Thử với lớp đang có quyền: tạo đủ 5 loại câu; lưu và xem trước; đăng; tài khoản học sinh lưu nháp rồi reload, nộp; giảng viên chấm phần tự luận/file/bài nói rồi công bố. Kiểm tra báo cáo riêng, thông báo nộp bài IMPORTANT, manager chỉ xem, student không đọc bài nộp của bạn khác. Thử mic bị từ chối, vượt thời lượng, upload lỗi/hủy, mobile/sáng/tối và reload trực tiếp `/assignment/` + `/post/` dưới basePath.
