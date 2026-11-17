# Rà soát không gian mobile — 12/11/2026

Phạm vi: hai FE hiện tại từ dev; giữ Next static export, theme sáng/tối, API và phân quyền hiện có. Không sửa BE, dữ liệu hoặc hạ tầng storage. Rà soát cấu trúc các màn và xác minh trình duyệt các luồng có thay đổi; không coi việc đọc code là kiểm thử trực quan mọi màn với dữ liệu production.

## Đã điều chỉnh

- Lớp học của giảng viên: ba số liệu nằm cùng hàng trên mobile, nhãn ngắn và chú thích rõ phạm vi trang. Danh sách dùng thẻ thay bảng cuộn ngang; chạm cả thẻ mở lớp, vẫn xem lịch/trạng thái/số học sinh/Unit. Desktop mở bằng dòng hoặc liên kết tên, bỏ cột Mở lớp.
- Quản lý học sinh/giảng viên/lớp/tài khoản: dòng desktop mở hồ sơ, bỏ nút Hồ sơ ở cuối. Giữ checkbox chọn nhiều độc lập; mobile vốn đã có thẻ có avatar/liên kết nên tái sử dụng.
- Danh sách phiên học và danh sách nhập điểm từng học sinh trên mobile: cả thẻ là liên kết, bỏ nút Mở phiên/Nhập điểm cuối thẻ; thêm avatar ở danh sách điểm.
- Thống kê quản lý và thẻ nội dung dùng padding nhỏ trên mobile, giữ desktop.
- Màn xem bài tập của staff: đưa bài nộp/báo cáo lớp lên trên câu hỏi. Dùng trình xem chỉ đọc riêng, không khởi tạo state làm bài, không autosave hay tải draft. Thu gọn/mở rộng từng câu hoặc tất cả, ghi rõ điểm và loại câu. Workspace giảng viên hiển thị nhãn Đáp án đúng dựa trên isCorrect của API; không tự suy đoán đáp án hoặc lộ tiêu chí nội bộ. Không đổi trình làm bài của học sinh hoặc xem trước trong trình soạn đề.
- Danh sách bài nộp: mobile dùng thẻ tên/avatar/trạng thái/điểm/thời gian, chạm mở bài; desktop mở cả dòng. Giữ thao tác mở lại bài nộp độc lập, giữ nguyên phân quyền.
- Báo cáo bài tập của lớp: chạm thẻ học sinh mở tab bài tập, bỏ nút Xem chi tiết dư thừa, thêm avatar.
- Báo cáo bài tập cá nhân trên cả hai FE: cả hàng là liên kết, spacing mobile gọn hơn, giữ điểm/trạng thái/nhận xét.
- Danh sách phần thưởng do staff quản lý: thẻ mobile thay bảng rộng 760px; desktop mở cả dòng. Không thay bố cục kho tài liệu hay cấu hình ổ.
- Hộp thông báo hai FE: phần nội dung là liên kết thay nút mở cuối hàng. Giữ riêng thao tác đọc/ẩn và quy tắc bảo vệ thông báo quan trọng; phía học sinh vẫn đánh dấu đã đọc khi mở. Bộ lọc mobile học sinh đặt cạnh nhau.
- Báo cáo điểm danh học sinh: giảm padding banner trên mobile, giữ toàn bộ thông tin cảnh báo và cách tính.

## Những điểm bố trí vẫn nên cải thiện trong lượt riêng

1. **Kho quà — chi tiết tồn kho và ma trận hiển thị theo lớp** (`src/features/gifts/manager.tsx`): bảng nhiều cột và checkbox cần cuộn ngang. Có thể chuyển phần tồn kho sang thẻ mobile, ma trận sang chọn lớp rồi danh sách quà; phải giữ so sánh tồn đã giữ và quyền sửa.
2. **Chi tiết phiên học — các bài đánh giá** (`src/features/sessions/detail.tsx`): một thẻ có bốn đường đi nhập điểm/cá nhân/cấu hình/import. Nên giữ nhập điểm làm thao tác chính, các tác vụ ít dùng đưa vào menu. Đây là những đường đi khác nhau, không xóa như nút mở trùng.
3. **Quản lý ổ và tác vụ chuyển storage** (`src/features/materials/storage-manager.tsx`, `upload-routing.tsx`): nhiều phần cấu hình kỹ thuật cùng trang làm trang dài. Có thể thu gọn phần ít dùng và thêm mục lục; giữ nguyên thiết kế/quy tắc kho và ổ như yêu cầu trước.
4. **Trình soạn bài tập có nhiều câu/media** (`src/features/assignments/editor.tsx`, `media-editor.tsx`): form dài trên điện thoại; nên có chọn câu và thanh lưu/đăng luôn truy cập được. Không đổi trong lượt này để giữ luồng thiết lập → soạn → xem trước → đăng hiện tại.

Không giảm vùng chạm của thao tác thường dùng dưới 44px. Các thẻ/liên kết giữ điều hướng Next, lịch sử Back và bộ lọc trên URL; thao tác checkbox/nút con không kích hoạt điều hướng dòng. Không thêm polling, timer, fetch hoặc kết nối realtime mới.
