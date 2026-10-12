# Đối chiếu giao diện bài tập với Figma

Nguồn: https://www.figma.com/design/t3kAHowsm0FLtomJCMQiuv

| Màn | Frame desktop | Frame mobile |
| --- | --- | --- |
| Thiết lập | 3:5555 | 9:1683 (luồng soạn) |
| Soạn câu hỏi | 3:5739 | 9:1683 / 28:1565 (tối) |
| Làm bài / xem trước | 4:1313 / 26:1770 | 4:1501 |
| Bài nộp / chấm | 5:741 / 5:834 | 9:1554 |
| Báo cáo | 6:1041 | 6:1495 / 6:1603 (tối) |
| Ghi âm | 40:1749 / 40:1780 | Responsive |
| Đổi mật khẩu | 7:1490 | Responsive |

Theme riêng của tính năng chỉ áp dụng cho nội dung bài tập (màu, Roboto, typography, input, bo góc và spacing). Màn bài tập và báo cáo dùng layout chung của ứng dụng: header, điều hướng, tài khoản, giao diện, zoom và footer giữ cùng vị trí và hành vi như các màn khác. Không có sidebar hoặc header riêng cho bài tập.

Icon trong `public/assignment-icons` được export SVG nguyên bản từ Figma (20×20). Light: help 26:1903, plus 26:1925, copy 26:1932, trash 26:1942, attach 26:1966, link 26:1970, back 26:2017. Dark: chevron 28:1582, plus 28:1586, attach 28:1598, link 28:1601, help 28:1604.

Dữ liệu tên trung tâm, lớp, bài, học sinh, media, điểm và thời gian lấy từ API. Không sao chép ảnh/điểm/người mẫu của Figma vào dữ liệu ứng dụng. Các trạng thái loading, lỗi, thiếu quyền và xác nhận vẫn có khi cần. Biểu đồ giữ điều khiển zoom/pan hiện có. `/assignment-report/` là route tĩnh, dùng query `classId`, staff có thêm `studentId`.

Danh sách bài nộp phân trang từ API; bốn thẻ tổng hợp dùng `summary` của endpoint submissions và tính toàn bộ bài tập, không tính từ trang đang xem. Bộ lọc trạng thái bảng ghi rõ phạm vi trang hiện tại. Báo cáo 7 kỹ năng độc lập.

Các HTTP fixtures chỉ được dùng bởi test runner; ứng dụng chạy API thật. Tệp trong câu tự luận dùng cùng endpoint upload, xác minh và quyền hiện có; backend phải nhận loại TEXT. Không cần migration mới cho chỉnh sửa giao diện này.

## Ảnh kiểm tra

Ảnh chạy qua API thật và PostgreSQL kiểm thử, không dùng dữ liệu production. Ví dụ ảnh/điểm/người trong Figma không được đưa cố định vào ứng dụng.

- [builder-desktop](assignment-review/builder-desktop.png)
- [builder-mobile-dark](assignment-review/builder-mobile-dark.png)
- [grading-desktop](assignment-review/grading-desktop.png)
- [submissions-desktop](assignment-review/submissions-desktop.png)

Trong Soạn câu hỏi, từng đáp án có nút Xóa riêng và xác nhận. Các ô kích thước media có label Chiều rộng / Chiều cao và đơn vị px; giá trị để trống dùng kích thước gốc. Kích thước mặc định được đọc từ ảnh/video đã tải qua API xác thực, hiển thị trong placeholder và dòng trợ giúp; Kích thước gốc khôi phục null/null và giữ tỷ lệ. Không lưu số pixel mặc định thành kích thước tùy chỉnh.
