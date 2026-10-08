# Thread lớp và bài đăng

Thiết kế: https://www.figma.com/design/LN3m3ZToWXHZCrfjMfXZmG (desktop 1:45, mobile 1:117, dark 1:189). Card dùng MUI và thumbnail dữ liệu thật; không chứa nội dung mẫu Figma trong bản public.

## Màn hình

Staff: lớp mở **Thread** mặc định, **Hồ sơ & quan hệ** ở tab thứ hai. Các chức năng tiến độ, hồ sơ, phân công, phiên học và bài kiểm tra hiện có được giữ. Không gian Quản lý đặt chỉnh sửa hồ sơ/trạng thái trong tab thứ hai.

Học sinh: **Thread / Tài liệu / Báo cáo kết quả**. Tab Tài liệu chỉ lấy bài loại SESSION_MATERIAL, có bộ lọc phiên học tìm theo tên/ngày. Báo cáo giữ các Unit, số liệu và controls hiện tại; chỉ tải khi mở tab. `/home/?tab=report` mở trực tiếp báo cáo.

## API

Mọi response thành công theo `{data: ...}` hiện có. List post: `{data:{items:[...],nextCursor}}`.

- `GET /v1/classes/{classId}/threads?cursor=&limit=20&sessionId=&postType=`.
- `POST /v1/classes/{classId}/threads`.
- `GET /v1/classes/{classId}/thread-sessions` → `{data:{items:[{id,name,date,unitNumber,status}]}}`.
- `GET/POST /v1/sessions/{sessionId}/posts`: tương thích cũ, chỉ bài SESSION_MATERIAL của phiên đó.
- `GET/PATCH/DELETE /v1/posts/{postId}`: cập nhật/xóa gửi `version`; DELETE gửi `{reason,version}`, chỉ soft-delete post, giữ audit.

classId trên các API Thread mới nhận internal key hoặc public ID, kiểm tra trường/lớp trước khi trả dữ liệu. Internal key chỉ dùng điều hướng/request, không hiển thị trong UI.

Tạo/cập nhật:

```json
{
  "title": "Hướng dẫn bài học",
  "body": "Đọc tài liệu trước buổi học.",
  "status": "PUBLISHED",
  "postType": "SESSION_MATERIAL",
  "sessionId": "uuid-cua-phien-trong-lop",
  "attachments": [{"materialId":"uuid-cua-file","group":"LESSON"}],
  "version": 1
}
```

`postType`: SESSION_MATERIAL, ANNOUNCEMENT, DISCUSSION. SESSION_MATERIAL bắt buộc sessionId thuộc chính lớp; hai loại còn lại dùng sessionId null. Groups giữ LESSON/GUIDE/AUDIO. PATCH cũ không gửi postType giữ loại/phiên hiện tại; API POST theo phiên luôn xác định SESSION_MATERIAL.

DTO bổ sung `postType`, `sessionName`, `className`, `editedAt`, `canEdit`, `canDelete`. Chỉ edit post mới đặt editedAt; reaction/bình luận không tạo nhãn “Đã chỉnh sửa”. Payload và version conflict vẫn được backend kiểm tra (403/404/409/422).

## Quyền và dữ liệu

- Giảng viên tạo post khi tài khoản/hồ sơ hoạt động, có phân công ACTIVE với lớp ACTIVE và ở không gian Giảng viên.
- Chỉ tác giả có quyền sửa/xóa thông thường; cùng lớp không cấp quyền sửa bài của giảng viên khác.
- MANAGER đọc/xóa post trong phạm vi trường, có lý do và audit. Không gian Quản lý không tạo/sửa post, kể cả tài khoản có hai vai trò.
- Học sinh có enrollment ACTIVE chỉ xem bài PUBLISHED, tương tác/bình luận và upload file bình luận theo cấu hình/quyền hiện có. Không có quyền xuất bản/sửa/xóa post.
- File vẫn truy cập qua API với Bearer auth; không phát public URL/JWT trong URL. Quyền theo lớp được kiểm tra khi xem/tải.
- Thread lớp và feed phiên dùng chung session_posts, không sao chép dữ liệu. Thay đổi loại/phiên cập nhật bộ lọc tương ứng.
- RTK Query invalidation/optimistic rollback và realtime hiện có được tái sử dụng. Không thêm polling, timer query hoặc worker. Audio chỉ lấy file khi người dùng phát.

## Triển khai

1. Build image backend của PR này.
2. Job migration hiện có: chọn image mới, giữ command/owner secret production **ConnectionStrings__MaterialsMigration**, chạy argument **--migrate-materials**. Migration mới **006_materials.sql** cho phép post không gắn phiên, thêm post_type/edited_at; giữ mọi bài và file cũ. Job idempotent qua migration history, không seed/reset dữ liệu.
3. Sau khi job thành công, deploy backend image mới rồi merge/deploy các frontend từ dev khi đã review.

Không cần biến Cloud Run, queue Cloud Tasks, Pub/Sub, JWT hoặc storage mới. Không tự chạy migration khi HTTP API khởi động. PR không tự chạy migration trên production hoặc merge.

## Kiểm tra

Backend integration: loại/phiên, feed chung, public ID, quyền tác giả/manager/student, school isolation, version conflict, audit và file bình luận cho post không gắn phiên. Frontend: mặc định tab, chọn phiên, sửa/xóa, nhãn chỉnh sửa, rollback, giữ draft, báo cáo, static deep links, mobile và sáng/tối.

## Điều chỉnh tương tác frontend

Thanh Viết bình luận là input trực tiếp, luôn giữ cùng bản nháp khi mở/ẩn danh sách. Nút icon đính kèm nằm cạnh nút gửi; upload, trả lời, sửa/xóa, phân trang và xử lý lỗi dùng API hiện có. Bình luận hiển thị avatar và khối nội dung theo thiết kế, hỗ trợ sáng/tối và mobile.

Tương tác dùng Material Icons (Thích/Yêu thích/Tuyệt vời); nút chính đổi icon và màu theo lựa chọn, có bỏ tương tác và rollback khi lỗi. Các nút tương tác/tải là icon, giữ tooltip và aria-label. Không tải bình luận trước khi người dùng mở danh sách hoặc nhập nội dung; không thêm polling hay API backend mới.

Điều chỉnh tương tác này chỉ thay frontend, không cần migration hay cấu hình GCP mới.
