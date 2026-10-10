# Lịch học và thông báo lớp

Backend companion PR: https://github.com/vqviet03/ess-edu-api/pull/32. Cần chạy migration Core 019, Materials 008, Notifications 003 trước khi dùng các màn mới. Không tự merge/deploy.

- Nghỉ học: vàng, không điểm danh; tự nối ngày theo lịch cố định để đủ tổng buổi kế hoạch.
- Học bù dự kiến: icon ghim, thay buổi cuối chưa có điểm danh. Học thêm không trừ kế hoạch.
- Ngày tương lai chỉ xếp lịch. Ngày đã có điểm danh không được hủy. Hủy lịch đã qua phải xác nhận.
- Manager và teacher được xếp lịch; manager vẫn không được sửa điểm danh.
- Cài đặt thông báo theo lớp: nhóm manager/teacher/student, default NORMAL/IMPORTANT cho từng feature. Lịch học/phê duyệt luôn quan trọng.
- Toast realtime có X và vuốt ngang; đóng toast không đồng nghĩa đọc thông báo.
- IMPORTANT chưa đọc không bị xóa tự động. Có thể vượt 15 nếu toàn bộ thông báo đều cần được giữ.
- Presence: dùng socket hiện có, tab hidden/offline đóng socket. Network keepalive ở BE không chạm DB. Không HTTP/DB polling.
- Mất mạng/tắt máy cần thời gian phát hiện; hard server kill có thể giữ trạng thái cũ tới lúc reconnect/refresh. Không cam kết phát hiện tức thì.
- Roster chỉ hiển thị public ID, tên, biệt danh, role, lần hoạt động. Không hiển thị ID kỹ thuật.
- Lượt xem chỉ gửi khi bài/bình luận thực sự trong viewport và tab hiển thị; dedupe theo tài khoản/nội dung. Danh sách người đọc phân trang, chỉ request khi mở.
- Mọi request dữ liệu qua RTK Query; không API routes/Server Actions. Giữ static export và workflow deploy hiện tại.
