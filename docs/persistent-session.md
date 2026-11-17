# Phiên đăng nhập bền vững

Hai portal lưu JWT và thông tin phiên tối thiểu vào localStorage theo key riêng, ràng buộc backend. Không lưu mật khẩu. Khi mở lại web hoặc tab mới, kiểm tra expiresAt và JWT exp rồi xác minh /me một lần trước khi hiện dữ liệu bảo vệ. JWT còn hạn một năm vẫn dùng lại được; frontend không tự gia hạn hoặc bỏ kiểm tra thu hồi/401. Thời hạn thật do policy backend/quản lý thiết lập khi cấp phiên.

Phiên cũ trong sessionStorage được chuyển một lần sang localStorage sau khi kiểm tra hợp lệ. Logout, token hết hạn hoặc API 401 xóa cả hai vị trí và cache. Thay đổi tài khoản/đăng xuất giữa các tab đồng bộ bằng storage event; tài khoản mới cần xác minh lại. Không có polling hoặc request khi idle. Browser chặn storage hoặc người dùng xóa dữ liệu trình duyệt thì phiên không thể khôi phục.

Không cần migration, secret hoặc cấu hình GCP mới. Quyền và hạn phiên backend vẫn giữ nguyên.
