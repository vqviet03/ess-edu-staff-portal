# Phần thưởng / đổi quà

Figma: https://www.figma.com/design/XFlgVATun4TB8GDR4cBkDi

Module dùng RTK Query và API thật `/v1/reward-gifts`, cùng API base URL/auth hiện có.
Không có fixture/mock trong runtime, không thêm secret hoặc backend vào static export.
Mọi quyền và số dư/tồn được kiểm tra ở BE; disable nút chỉ phục vụ trải nghiệm.

- Danh sách theo lớp, yêu thích, giỏ/xác nhận, lịch sử có ảnh thu nhỏ và placeholder.
- Giỏ không giữ quà hay trừ điểm. Preview hiển thị giá hiện tại/số dư trước-sau.
- Xác nhận trả workflow PENDING, hoàn tất bằng notification hiện có; không polling.
- Idempotency key giữ qua retry/remount bằng sessionStorage; không chứa token.
- Control compact tập trung tại `src/theme/compact.ts`, giữ input multiline.
- Ảnh dùng thumbnail bảo vệ bởi API auth, contain và lazy loading.
- Filter tìm kiếm áp dụng khi Enter/rời ô, không phát request theo từng ký tự.
- Không thêm interval, worker hoặc cơ chế DB/socket nền.

Staff thêm khu vực Phần thưởng, nhóm quản lý, liên kết/hiển thị lớp, copy/link,
điều chỉnh tồn, đổi hộ và xác nhận giao. Học sinh có Góc đổi quà và lịch sử của mình.
Trang kho/registry ổ tiếp tục dùng layout cũ; chỉ thêm nguồn upload Phần thưởng.
Backend cần migration và cấu hình database/drive theo PR BE trước khi bật chức năng.
Production chưa được deploy; PR chỉ để review, không tự merge.
