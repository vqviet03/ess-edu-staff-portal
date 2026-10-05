# ESS — quản lý thời hạn và thu hồi phiên

Chỉ MANAGER đang hoạt động trong cùng trường được sử dụng các API dưới đây. `id` là `Account.publicId`, không phải ID hồ sơ hay ID đăng nhập. Response JSON theo `{data:...}`, lỗi theo `{error:{code,message}}`.

## API

`GET /v1/manager/accounts/{id}/session-policy`

```json
{"data":{"accountId":"account-id","sessionLifetimeMinutes":null,"effectiveLifetimeMinutes":60,"activeSessionCount":2,"managerProtected":false,"version":1}}
```

`PATCH /v1/manager/accounts/{id}/session-policy`

```json
{"sessionLifetimeMinutes":1440,"version":1,"reason":"Phiên có thời hạn một ngày"}
```

Trả policy mới với version tăng. Số nguyên 1–43200 phút (30 ngày); `null` dùng `Jwt:LifetimeMinutes`. Thời hạn áp dụng thống nhất cho đăng nhập mật khẩu và đổi mã một lần, học sinh và Staff. JWT `exp` và `auth_sessions.expires_at` có cùng thời hạn. Không thay thời hạn các phiên đã cấp. Có thể đặt thời hạn cho tài khoản MANAGER nhưng không làm hết hạn phiên hiện tại của họ.

`POST /v1/manager/accounts/{id}/sessions/revoke`

```json
{"version":2,"reason":"Yêu cầu người dùng đăng nhập lại"}
```

```json
{"data":{"revokedSessions":2,"policy":{"accountId":"account-id","sessionLifetimeMinutes":1440,"effectiveLifetimeMinutes":1440,"activeSessionCount":0,"managerProtected":false,"version":3}}}
```

Thu hồi tất cả phiên còn hiệu lực của tài khoản trong một transaction. Token cũ bị từ chối ở request tiếp theo, không cần chờ JWT hết hạn. Tài khoản vẫn đăng nhập lại được; không khóa tài khoản, đổi mật khẩu, kết thúc phân công hay xóa dữ liệu. `activeSessionCount` là số phiên phía server, không phải số thiết bị online. Mọi tài khoản có MANAGER, kể cả TEACHER+MANAGER, đều bị chặn thu hồi bằng `403 MANAGER_PROTECTED`. Vai trò được kiểm tra lại trong database dưới school lock tại lúc thực hiện.

## Async, xung đột và realtime

Hai mutations hỗ trợ cơ chế sẵn có: gửi `Prefer: respond-async` và `Idempotency-Key` để nhận HTTP 202 với operation `IN_PROGRESS`. Lấy `/v1/operations/{operationId}` đến DONE/FAILED. Kết quả DONE nằm trong `result.data`. Không retry bằng key mới khi chưa biết kết quả; key cũ trả cùng operation. Worker kiểm tra lại phiên/quyền của người thực hiện và vai trò của đích tại commit.

Thông báo `CHANGE` gửi đến các quản lý qua `/v1/events/ws`; entity `accounts` khiến RTK Query refresh cache liên quan. WebSocket của Staff bị thu hồi đóng `1008 UNAUTHORIZED` trong lần kiểm tra phiên kế tiếp (tối đa khoảng 10 giây); HTTP bị chặn ngay sau commit. Client xóa sessionStorage và API cache khi nhận 401 hoặc WebSocket hết phiên. Student client phát hiện khi gọi API/khôi phục phiên; backend luôn kiểm tra phiên trên mọi endpoint được bảo vệ.

Lỗi: 401 phiên không hợp lệ, 403 thiếu quyền/tài khoản quản lý được bảo vệ, 404 không thuộc trường/không tồn tại, 409 version conflict, 422 thời hạn/lý do không hợp lệ. Bắt buộc lý do 1–500 ký tự. Xung đột yêu cầu tải policy mới và kiểm tra trước khi gửi lại. Audit lưu actor, ID tài khoản, lý do và thay đổi; không lưu JWT, mật khẩu hay mã đăng nhập.

## Database và triển khai

Áp dụng `007_account_session_policy.sql` bằng migration runner trước khi triển khai code mới. Thêm `accounts.session_lifetime_minutes` nullable với CHECK range; không thay dữ liệu/phiên đang tồn tại, không chạy migration tự động khi web khởi động. Các index phiên chưa thu hồi hiện có tiếp tục được sử dụng. Không đưa trường chính sách vào bulk/import chung để bỏ qua validation hoặc version của API riêng.
