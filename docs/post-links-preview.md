# Liên kết bài đăng và bản xem trước

Đường dẫn tĩnh `/post/?postId=...&classId=...` và các trang bảo vệ giữ nguyên query/fragment khi cần đăng nhập. Login nhận `next` đã được kiểm tra để chỉ điều hướng trong ứng dụng, bỏ Pages basePath trước khi gọi Next router. Đăng nhập ID/mật khẩu và link dùng một lần cùng hỗ trợ trở lại trang đích; link lỗi giữ đích khi chuyển về đăng nhập thủ công. Token/mật khẩu/mã đăng nhập không được thêm vào URL chia sẻ.

Staff có hai thao tác sao chép bằng icon + tooltip cho học sinh và staff; portal học sinh chỉ sao chép link học sinh. Biến công khai `NEXT_PUBLIC_STUDENT_PORTAL_URL` cấu hình URL portal học sinh (staff mặc định `https://eeslern.com`, phía học sinh mặc định origin/basePath hiện tại); `NEXT_PUBLIC_STAFF_PORTAL_URL` trên staff mặc định origin/basePath hiện tại. Nếu dùng project Pages, URL cấu hình phải chứa đúng đường dẫn repo. GitHub Actions đọc repository variables khi build; không thay backend, DNS, CORS hoặc cơ chế quyền.

Post rộng theo vùng nội dung, bố cục một cột trên màn hình nhỏ; từ breakpoint lg, khu tương tác/bình luận nằm bên phải nội dung. Bản nháp soạn post giữ một cột. Không thay Shell, header hoặc sidebar.

Preview mở Dialog toàn màn hình với tên file, icon tải xuống và X đóng; không có thanh công cụ zoom/chuyển trang. Ảnh/video giữ tỷ lệ và vừa vùng xem; có thể dùng pinch của trình duyệt hoặc zoom trình duyệt. PDF mặc định cuộn dọc, trang vừa chiều rộng, chỉ render canvas khi gần vùng xem. Worker PDF, render task và observer được dọn khi đóng. Download/preview vẫn qua RTK Query `/materials/{id}/content`, backend xác minh quyền như cũ; không chuyển sang URL storage public.

Không có polling, interval hoặc request nền mới. Các HTTP fixtures chỉ thuộc test runner, ứng dụng vẫn dùng API thật.
