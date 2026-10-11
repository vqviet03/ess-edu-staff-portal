# Hồ sơ cá nhân và thông báo

Route tĩnh /profile/ dùng cùng JWT/sessionStorage, guard và RTK Query. Tự chỉnh họ tên, biệt danh, ngày sinh, email/số điện thoại cá nhân, tên/số điện thoại phụ huynh và avatar. Đổi ID đăng nhập cần mật khẩu hiện tại. Không chỉnh vai trò/trạng thái/phân công. ID/email/số điện thoại cá nhân đều đăng nhập được với mật khẩu; số phụ huynh không là alias. Email/SĐT chưa có quy trình OTP xác minh ở bản này.

Avatar dùng icon MUI/màu pastel hoặc upload JPG/PNG/WebP. Blob tải qua API xác thực; không public storage URL. File vào Chung/Ảnh avatar; upload trực tiếp post/session vào Chung/Bài đăng/thư mục theo MIME. Kho/bình luận giữ luồng hiện có. Không thêm thư viện, API polling hay interval.

Giảng viên chọn mặc định/có/không thông báo học sinh ở các thao tác post, bình luận, công bố điểm, điểm danh và điểm động viên. Chỉnh sửa/quá khứ mặc định không gửi. notifyStudents đi qua RTK Query và được giữ cho tác vụ async. Quản lý cấu hình 1–1000 thông báo và xóa mềm/thật trong Cấu hình ứng dụng; quan trọng chưa đọc luôn được giữ, có thể vượt giới hạn. Áp dụng khi nhận thông báo mới.

Cần backend PR33 và migrations Core020, Materials009, Notifications004 trước rollout FE. Workflow deploy hiện có giữ nguyên, chỉ sau merge dev; không tự merge. Không có thay đổi secret/GCP queue. Kiểm tra qua CI do môi trường local không khởi tạo được.
