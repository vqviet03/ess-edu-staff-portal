# Thông báo, ngày tham gia và điểm quá khứ

## Giới hạn thông báo

Mỗi lần delivery thêm thông báo, backend đếm cả thông báo vừa thêm và dọn thông báo cũ nhất để giữ tối đa 15 thông báo chưa bị ẩn cho từng người trong trường. `APPROVAL` và `CONSENT` chưa đọc được giữ, kể cả thông báo đồng ý đổi tên ứng dụng cũ có type `SYSTEM`. Nếu số thông báo được bảo vệ không cho phép về 15, tổng có thể vượt 15; lần delivery tiếp theo sẽ dọn những thông báo đã có thể xóa. Thông báo vừa thêm được giữ.

Việc dọn thực hiện trong transaction với lock theo người nhận, không polling. Bản ghi đã dọn giữ tombstone để retry Cloud Tasks không tạo lại thông báo; không hiển thị chúng trong API danh sách. Xóa thủ công thông báo quan trọng chưa đọc trả `409 NOTICE_UNREAD`; phải đọc trước. Các thông báo thường chưa đọc vẫn có thể được dọn theo tuổi.

## Ngày tham gia lớp

Manager gửi `POST /v1/manager/enrollments/preview` với:

```json
{"classId":"ess20-a1","studentId":"hv.bon","status":"ACTIVE","version":2,"joinedOn":"2026-01-01"}
```

Sau khi kiểm tra ảnh hưởng, dùng endpoint commit preview hiện có với reason và xác nhận `RELATIONSHIP_IMPACT`. DTO enrollment trả thêm `joinedOn` (`YYYY-MM-DD`, múi giờ Việt Nam). Ngày cho phép hôm nay hoặc quá khứ tối đa 10 năm. Sửa ngày chỉ cập nhật giai đoạn hiện tại, giữ ID, các giai đoạn trước và điểm/lịch sử. Version cũ trả 409; ngày chồng giai đoạn cũ hoặc bỏ qua điểm danh/điểm động viên đã lưu bị chặn. Ghi danh đã `COMPLETED` được sửa ngày nhưng không mở lại bằng thao tác này. Teacher không có quyền sửa ghi danh.

## Điểm động viên ngày cũ

Endpoint thêm điểm hiện có nhận `date` tùy chọn (mặc định hôm nay):

```json
{"kind":"EARN","amount":3,"note":"Bon vừa đạt được thành tích mới","date":"2026-01-01"}
```

Ngày quá khứ phải có điểm danh `PRESENT` hoặc `ABSENT` của đúng học sinh/lớp/ngày; không có trả `409 ATTENDANCE_REQUIRED`. Thưởng yêu cầu `PRESENT`; không tự tạo điểm danh quá khứ. Danh sách ngày cũ bao gồm học sinh thuộc giai đoạn ghi danh ngày đó, kể cả đã ngừng học hiện tại.

`POST /v1/classes/{classId}/students/{studentId}/rewards/{entryId}/correction`, header `Idempotency-Key: <UUID>`:

```json
{"amount":2,"note":"Đối chiếu lại thành tích","reason":"Nhập nhầm số cúp"}
```

Chỉ teacher còn được phép sửa lớp. Giữ nguyên ngày/kind của lượt gốc, ghi reversal và lượt thay thế trong cùng transaction; không sửa/xóa ledger gốc. Nhập 0 chỉ ghi reversal. Thưởng 0–5, vi phạm/tiêu dùng 0–100000; không vượt số dư được phép tiêu. Note/reason bắt buộc tối đa 2000 ký tự. Chỉ điều chỉnh lượt chưa đảo; lượt đã đảo trả `409 ALREADY_REVERSED`. DTO ledger thêm `isReversed` để UI ẩn thao tác sửa lượt cũ. Duplicate request cùng key/payload trả cùng kết quả, key khác payload trả `409 IDEMPOTENCY_CONFLICT`. Audit và notification theo cơ chế durable outbox hiện có, tổng và biểu đồ tính lại từ ledger.

## Triển khai

Không thêm bảng/cột hoặc thay cấu hình GCP trong cập nhật này. Backend phải có các migration điểm danh/động viên hiện có; Staff dùng API thật như cấu hình trước. Deploy backend trước Staff để endpoint correction khả dụng. Không chạy tác vụ định kỳ hoặc seed dữ liệu production.
