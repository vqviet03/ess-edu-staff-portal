# Trang giới thiệu và bản nháp bài tập

Quản lý mở **Trang giới thiệu** trong sidebar. Mặc định là xem trước, bật icon chỉnh sửa để sửa text tại chỗ hoặc chọn ảnh/PDF bằng kho/upload hiện có. Phần Nội dung & cấu hình cho phép sửa cả SEO, thông điệp thành công, quyền sử dụng thông tin, gợi ý nhập và các lớp trong dropdown. Lưu nháp độc lập với công bố; chỉ thao tác công bố mới đưa nội dung ra trang học sinh. Gỡ công bố giữ nguyên nháp và danh sách đăng ký tư vấn. File chọn để công bố phải là file đã hoàn tất trong kho chung; không dùng bài nộp hoặc file riêng tư.

Thiết kế Figma `iZebknoIUHNK3AbmeYCb0R`: view/model/CSS/font alias được đồng bộ với Student; editor dùng MUI và API thật. Các quyền đọc/sửa/công bố/danh sách đăng ký đều kiểm tra ở BE, không chỉ ẩn sidebar. Không thay đổi layout kho/ổ hoặc quy trình upload đang có. Không thêm polling/socket cho trang giới thiệu. Font và CSS chỉ áp dụng trong module mới.

Bài làm: giảng viên xem được bản nháp đã lưu lần đầu hoặc sau khi mở lại. Khi mở lại, giữ cùng ID, answers, version form và archive attempt trước; trạng thái là DRAFT. Màn nháp chỉ render một player chỉ đọc, không cho sửa đáp án, ghi âm/tải/xóa file, chấm hay công bố. Bài đã nộp vẫn theo luồng chấm hiện có. Audio của câu trả lời dùng màu vàng và nhãn Bản ghi bài nộp; audio đề vẫn dùng màu cũ. Chưa thêm bình luận gắn vào bài làm.

Triển khai sau review: BE PR vào main và migration Core 026 trước; FE vào dev. Không tự merge/deploy hoặc migrate production. Không có secret/resource Neon mới; mọi cấu hình live vẫn dùng branch production. Student PR có hướng dẫn cập nhật route root của Cloudflare worker hiện có cho HTML SEO; cache nội dung công khai tối đa 30 giây.
