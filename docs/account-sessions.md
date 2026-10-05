# Phiên tài khoản và lịch sử đăng nhập

Chỉ MANAGER đang hoạt động được truy cập các endpoint `/v1/manager/accounts/{id}`; tất cả truy vấn kiểm tra trường/school hiện tại. MANAGER (kể cả hai vai trò) được bảo vệ khỏi buộc kết thúc phiên.

## Thời hạn

`GET /session-policy` trả `{data:{accountId,sessionLifetimeMinutes,sessionDuration,effectiveLifetimeMinutes,defaultLifetimeMinutes,serverNow,previewExpiresAt,activeSessionCount,managerProtected,version}}`.

`PATCH /session-policy`:
```json
{"sessionLifetimeMinutes":null,"sessionDuration":{"years":1,"months":2,"days":3,"hours":4,"minutes":5},"version":1,"reason":"Thời hạn cho lần đăng nhập tiếp theo"}
```

Các ô là số nguyên không âm, tổng lớn hơn 0 và tối đa **10 năm theo lịch**, được kiểm tra ở backend. Cộng năm, tháng theo UTC (cuối tháng/năm nhuận được kẹp về ngày cuối hợp lệ), rồi ngày/giờ/phút. `effectiveLifetimeMinutes` là quy đổi tại `serverNow`, không phải một tháng cố định 30 ngày. UI hiển thị thời điểm dự kiến theo giờ Việt Nam; thời điểm thật được tính lại khi đăng nhập. `sessionDuration:null` và `sessionLifetimeMinutes:null` dùng mặc định `Jwt:LifetimeMinutes`. Client cũ vẫn gửi số phút nguyên, giới hạn thực tế cũng tối đa 10 năm; không gửi đồng thời hai kiểu thời hạn. Policy áp dụng chung mật khẩu/link và học sinh/Staff, không đổi hạn của JWT đã cấp. Session vẫn ở sessionStorage.

`POST /sessions/revoke {version,reason}` trả `{data:{revokedSessions,policy}}`, giữ tài khoản và dữ liệu; tài khoản vẫn đăng nhập lại được. MANAGER trả 403 `MANAGER_PROTECTED`. Phiên đã thu hồi bị từ chối ở request tiếp theo và websocket đóng trong khoảng 10 giây. Lý do 1–500 ký tự và version hiện tại bắt buộc.

PATCH policy và POST revoke hỗ trợ queue hiện có: `Prefer: respond-async` + `Idempotency-Key`, trả 202 IN_PROGRESS; GET operations lấy DONE/FAILED; websocket CHANGE báo thay đổi, RTK Query invalidate. Quyền/version được kiểm tra lại khi commit. 401/403/404/409/422 giữ contract lỗi hiện có.

## Lịch sử

`GET /login-history?page=1&pageSize=5`:
```json
{"data":{"items":[{"loggedInAt":"2026-10-05T09:00:00Z","expiresAt":"2027-10-05T09:00:00Z","revokedAt":null,"ipAddress":"192.0.2.10","device":"Điện thoại","browser":"Safari","operatingSystem":"iOS/iPadOS"}],"total":1,"page":1,"pageSize":5}}
```

Chỉ ghi đăng nhập **thành công**, cả mật khẩu và link. Sắp mới nhất trước, page 1–100000, pageSize 1–100. Giữ thông tin sau logout/thu hồi để đối chiếu bảo mật. Metadata cũ trả null, không bịa thông tin. Không trả JWT, password, mã link, session secret hay raw User-Agent. Thời gian ISO UTC.

IP lấy từ socket peer, không tin X-Forwarded-For do caller gửi; phía Cloud Run có thể là IP proxy. Không dùng IP để khẳng định vị trí vật lý. Thiết bị/OS/trình duyệt suy luận từ User-Agent (có thể bị giả mạo; iPad desktop mode có thể giống macOS). Không GPS, fingerprinting hoặc GeoIP bên thứ ba. Staff Portal nêu việc ghi nhận này trên đăng nhập; mọi frontend kết nối auth (gồm Student Portal) cần thông báo tương ứng. Chỉ quản lý cùng trường xem được thông tin, không công khai.

## Nhập bằng bảng / Excel

CREATE cho phép ID trống, tự sinh từ họ tên và thêm số tránh trùng. UPDATE cần ID ổn định, ô trống giữ dữ liệu cũ. `createAccount` chuẩn boolean, chấp nhận TRUE/FALSE/1/0 từ bảng/Excel; trống bỏ qua. `roles` chuẩn array TEACHER/MANAGER, chấp nhận chuỗi `TEACHER|MANAGER`. Giá trị sai trả lỗi đúng cột `create_account`/`roles`; không bypass xác nhận trạng thái/quyền. Bảng có xóa dòng (xác nhận khi đã nhập dữ liệu), preview trước commit, ID chỉ bắt buộc khi cập nhật.

## Rollout

Backend áp dụng migration **008_session_duration_login_metadata.sql** rõ ràng trước triển khai, sau 007. Additive, giữ account/session/report và policy phút cũ; không seed/reset DB. Mock persist cùng contract, mutations và lịch sử; không cần thêm dịch vụ/secret/thư viện. Không tin kiểm tra client thay cho backend.
