# Sửa ngày học thực tế
Manager mở hồ sơ lớp → Hồ sơ & quan hệ → menu học sinh → Chỉnh sửa ngày tham gia lớp, hoặc hồ sơ học sinh → Lịch sử ghi danh → Sửa ngày nhập học / nghỉ học.

Dialog đọc GET /manager/enrollments/dates?classId=&studentId=. Hiển thị đủ mọi đợt, ngày nhập hệ thống riêng; các ID đợt chỉ dùng trong payload và không hiển thị. Có thể sửa ngày đợt đã kết thúc, giữ đợt tham gia lại. Không tự thay trạng thái hoặc cấp lại quyền học sinh.

POST /manager/enrollments/dates/preview gửi classId, studentId, version, periods:[{id,joinedOn,endedOn}]. Giữ đủ đợt theo thứ tự; ngày hợp lệ trong 10 năm, không tương lai/chồng thời gian; đợt đang học chưa có endedOn. Ngày có thể trước createdAt.

Preview hiển thị trước/sau, cảnh báo và xác nhận ENROLLMENT_DATES/OUTSIDE_ENROLLMENT_HISTORY bằng tiếng Việt. Commit tiếp tục qua POST /manager/changes/commit với Idempotency-Key, reason và xác nhận backend yêu cầu. BaseQuery hiện có xử lý 202 và chờ sự kiện operation, không polling. Cache Management/Audit và dữ liệu liên quan được invalidation sau thành công.

409/410/422 giữ form, có Tải lại lịch sử để đối chiếu phiên bản mới. Backend là nguồn kiểm tra cuối cùng, revalidate quyền/version và ảnh hưởng; không tự xóa điểm danh/điểm/báo cáo.

Yêu cầu backend PR #30 trên main và Core migration 017_enrollment_actual_dates.sql. Không thêm biến môi trường hay migration frontend. Không tự sửa dữ liệu Daisy khi triển khai.

Mock/test adapter hỗ trợ đọc lịch sử, preview/commit, version và idempotency; API thật chịu trách nhiệm đối chiếu dữ liệu học tập ngoài timeline.
