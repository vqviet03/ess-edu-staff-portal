# Sửa ngày nhập học thực tế

Quản lý mở Hồ sơ lớp → menu học sinh → Chỉnh sửa ngày tham gia lớp, hoặc Hồ sơ học sinh → Ghi danh/lịch sử → Sửa ngày nhập học / nghỉ học. Form đọc đầy đủ các đợt theo thứ tự tạo bản ghi, không đoán đợt dựa trên ngày đã sửa.

Ngày tham gia có thể trước ngày nhập hệ thống, hơn 10 năm trước, ở tương lai, chồng đợt trước hoặc sau ngày nghỉ. Input không có min/max; client chỉ kiểm tra định dạng ngày có thật và đúng các đợt hiện có. Mock áp dụng cùng quy tắc. Ngày ghi nhận hệ thống, trạng thái, điểm và điểm danh gốc được giữ nguyên.

- GET /manager/enrollments/dates?classId=...&studentId=...
- POST /manager/enrollments/dates/preview: classId, studentId, version, periods gồm id/joinedOn/endedOn.
- POST /manager/changes/commit: previewId/version, confirmations, reason và Idempotency-Key như các thao tác quản lý hiện có.
- Đổi trạng thái ghi danh vẫn dùng endpoint lifecycle riêng. Không đóng đợt ACTIVE qua form sửa ngày.
- Backend giữ kiểm tra quyền quản lý, school, ID đợt, phiên bản và idempotency. Dữ liệu ngoài khoảng ngày chỉ được đưa vào preview để đối chiếu, không yêu cầu xác nhận thêm OUTSIDE_ENROLLMENT_HISTORY.
- Backend vẫn tính phạm vi ngày cho thống kê theo timeline đã xác nhận; không xóa các bản ghi điểm danh/điểm/báo cáo gốc.

## Backend cần triển khai cùng

Dùng bản API có sửa endpoint dates và compatibility enrollment, chạy migration Core 018_unrestricted_enrollment_dates.sql để bỏ CHECK so sánh ngày bắt đầu/kết thúc. Nếu chỉ deploy frontend thì backend cũ vẫn có thể từ chối ngày.

Không thêm request polling; mutations và refresh giữ RTK Query và signal socket hiện có. Không tự sửa dữ liệu học sinh production.
