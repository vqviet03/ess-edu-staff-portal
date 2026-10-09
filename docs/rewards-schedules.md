# Điểm động viên và lịch học

Thiết kế: https://www.figma.com/design/4HTHoXVUEgn4o3Iq0JzBRB

Điểm động viên tách khỏi điểm assessment/report. Mỗi cặp học sinh–lớp bắt đầu với quỹ 0, không tạo account/day/transaction khi đọc. Ledger bất biến: EARN 1–5 điểm/lượt; PENALTY và SPEND số nguyên dương tối đa 100000. Ghi chú nhanh dùng biệt danh (fallback họ tên). Chỉ ghi thật sau khi lưu; không seed dữ liệu reward vào production.

E = tổng thưởng, V = tổng vi phạm, S = tổng đã dùng. Bốn đường: E xanh lá, V đỏ, E−V xanh biển, E−V−S tím. V/S là độ lớn dương, lịch sử S vàng. Không clamp số dư âm do vi phạm; chỉ được tiêu ≤ max(0,E−V−S). Sửa sai bằng entry đảo âm cùng kind, `reversesId`; chỉ được đảo một lần. Entry gốc giữ nguyên. Đảo áp dụng lại ngày gốc để tính lại lịch sử, `createdAt` ghi thời điểm điều chỉnh. Điểm không thay thế đánh giá học tập; giảm số dư khi đổi quà không phản ánh giảm tích cực.

## Quyền

Read: manager toàn trường, teacher lớp từng được phân công, student chính mình trong lớp còn enrollment/profile hoạt động. Read class activities yêu cầu quyền lớp, không cho truy cập trường khác. Write điểm/điểm danh/đảo: TEACHER + profile/account ACTIVE + assignment ACTIVE, không cần reconfirm + lớp ACTIVE; X-Workspace=manager bị chặn. Manager đơn thuần chỉ xem điểm. Riêng chỉnh sửa lịch học yêu cầu MANAGER đang hoạt động, không cần phân công giảng viên; giảng viên đơn thuần và học sinh chỉ xem lịch. Frontend chỉ hiện sửa lịch trong không gian Quản lý. Staff trả tên/ID công khai tác giả; UUID chỉ là liên kết kỹ thuật, frontend không hiển thị.

## Ngày học và điểm danh

Ngày theo Asia/Ho_Chi_Minh, timestamps UTC. Lịch FIXED WEEKLY (1=thứ Hai..7=CN) hoặc MONTHLY (1..31, bỏ ngày không tồn tại), FLEXIBLE lưu ngày cụ thể không lặp. TimeMode SHARED/PER_DAY/FLEXIBLE; giờ HH:mm, kết thúc sau bắt đầu. Giờ linh động hiển thị hướng dẫn theo dõi thông báo. EffectiveFrom ≥ hôm nay, ≤10 năm; version append-only, giữ lịch cũ, không đổi ngày đã chốt và không ghi đè phiên bản tương lai bằng ngày hiệu lực sớm hơn.

Điểm danh reward là điểm danh **theo ngày lớp**, độc lập điểm danh từng assessment. Nhiều phiên cùng ngày gộp thành một ngày. Chưa ghi nhận: UNSET. Thưởng hợp lệ xác nhận PRESENT; nếu ABSENT phải đổi lại trước khi thưởng. Có thể cập nhật điểm danh ngày cũ (tối đa 10 năm), server tính lại chart từ ledger.

Chốt ngày khi mọi học sinh hiện đang học được xác nhận PRESENT/ABSENT. PRESENT+closed+không giao dịch => earned ngày 0, cumulative giữ nguyên. ABSENT hoặc UNSET không có node 0 giả, đường nối hai mốc hợp lệ qua khoảng vắng. Giao dịch vi phạm/tiêu dùng của ngày vắng vẫn giữ trong tổng và được phản ánh ở mốc hợp lệ tiếp theo. Hôm nay mặc định totals 0/activity empty khi chưa có dữ liệu; không viết DB.

Ngày lịch được chiếu khi đọc, không có daily cron/worker/scan. Lưu điểm/điểm danh/chốt ngày mới tạo bản ghi. Thay lịch chỉ ảnh hưởng từ effectiveFrom, lịch cũ và ngày đã chốt được giữ. Ngày chưa chốt không tự suy đoán tham gia. Thanh ngày = thưởng của học sinh / max thưởng của học sinh hiện đang học, PRESENT trong ngày; max=0 =>0%, vắng không xếp hạng bằng 0.

Chart mặc định toàn bộ lịch sử (tối đa 10 năm), filter from/to; timestamps ngày thực, monotone đúng điểm. Tổng có baseline trước from và không reset khi đổi khoảng. Lịch sử từng lượt và hoạt động lớp phân trang 20, filter kind/date; lịch sử phục vụ drill-down sau chọn ngày, không xuất sum từ một trang thành tổng ngày.

## API

Base `/v1`, Bearer, JSON `{data:T}` / `{error:{code,message}}` như contract hiện tại. ID lớp/học sinh staff nhận public ID hoặc UUID. Student classId UUID, lấy từ `/me/classes`.

| Method | Route | Mục đích |
|---|---|---|
| GET | /classes/:classId/rewards?date=YYYY-MM-DD | Roster, totals/day, attendance, dayVersion, closed, highestToday |
| PUT | /classes/:classId/rewards/attendance | Điểm danh/chốt ngày, version |
| GET | /students/:studentId/reward-classes | Các lớp được phép xem của học sinh |
| GET | /classes/:classId/students/:studentId/rewards?from=&to= | Tổng/today, chart, 20 hoạt động lớp gần nhất |
| GET | /classes/:classId/students/:studentId/rewards/history?kind=&date=&page=1&pageSize=20 | Lịch sử học sinh |
| GET | /classes/:classId/rewards/activities?date=&page=1&pageSize=20 | Hoạt động ngày lớp |
| POST | /classes/:classId/students/:studentId/rewards | Cộng/trừ/tiêu dùng |
| POST | /classes/:classId/students/:studentId/rewards/:entryId/reverse | Điều chỉnh, giữ entry gốc |
| GET/PUT | /classes/:classId/schedule | Xem/lưu lịch |
| GET | /me/reward-classes | Lớp reward của chính học sinh |
| GET | /me/classes/:classId/rewards | Chi tiết quỹ chính học sinh |
| GET | /me/classes/:classId/rewards/history | Lịch sử chính học sinh |
| GET | /me/classes/:classId/rewards/activities | Hoạt động lớp mình |
| GET | /me/classes/:classId/schedule | Lịch lớp mình |

GET schedule có from/to, mặc định hôm nay→60 ngày tới. GET rewards mặc định từ lịch/giao dịch/điểm danh đầu tiên đến hôm nay, không nhận to tương lai. PageSize 1..100; date ranges tối đa 10 năm. Không có DELETE ledger hoặc migration trong startup.

Ví dụ POST (bắt buộc `Idempotency-Key: <UUID>`, dùng lại cùng key khi thử lại cùng dữ liệu):
```json
{"kind":"EARN","amount":3}
```
```json
{"kind":"PENALTY","amount":1,"note":"Chưa tuân thủ hướng dẫn"}
```
```json
{"kind":"SPEND","amount":10,"note":"Đổi bộ sticker"}
```
Reverse body `{ "note":"Ghi nhầm, điều chỉnh" }`, cũng cần Idempotency-Key. Key unique theo school/actor; dùng cùng key cho dữ liệu khác =>409, callback/retry không ghi hai lần. Transactions dùng cùng school write lock với lifecycle để revoke assignment/profile không tranh chấp quyền tại commit. Unique reversesId ngăn đảo trùng.

Điểm danh:
```json
{"date":"2026-10-09","version":0,"close":true,"rows":[{"studentId":"<UUID>","status":"PRESENT"}]}
```
Lịch:
```json
{"version":0,"effectiveFrom":"2026-10-09","configuration":{"mode":"FIXED","cycle":"WEEKLY","timeMode":"SHARED","startTime":"17:00","endTime":"18:30","slots":[{"day":1,"date":null,"startTime":null,"endTime":null},{"day":5,"date":null,"startTime":null,"endTime":null}]}}
```

Errors: 400 filter/range/key; 401 auth; 403 quyền/lớp chỉ xem; 404 hồ sơ/entry; 409 VERSION_CONFLICT/IDEMPOTENCY_CONFLICT/STUDENT_ABSENT/ALREADY_REVERSED/DAY_CLOSED/SCHEDULE_ORDER; 422 validation/INSUFFICIENT_POINTS/ATTENDANCE_PENDING. Form giữ nội dung khi lỗi, không tự retry mutation.

## Realtime và vận hành GCP

Ledger, audit và SystemNotice cùng transaction. Audit/notice tạo durable Cloud Tasks receipt bằng interceptor hiện có. Delivery notice idempotent `(event_id,user_id)`, Pub/Sub/socket như deployment hiện tại; event REWARD/SCHEDULE class-scoped chỉ invalidate Rewards/Schedule (auditChanged gửi riêng cho manager sau khi archive xong, chỉ invalidate Audit). Audit reward không phát thêm resourceChanged toàn hệ thống. Không thêm polling, LISTEN, hosted worker hay timer DB. Hết request/task/client: ứng dụng không tạo DB traffic.

**Migration mới chỉ ở Core**: `015_class_rewards_schedule.sql`. Không sửa DB materials/security/notifications/storage. Không thêm biến môi trường, queue hay service account.

Rollout: merge/deploy backend image mới trước → Cloud Run Jobs `ess-prod-migrate`, Edit image lấy từ revision backend mới, giữ command mặc định và argument `--migrate`. Giữ secret owner/direct production Core ở `ConnectionStrings__Migration` và `ConnectionStrings__Postgres`. Execute và kiểm tra log `Applied 015_class_rewards_schedule.sql`, task thành công. Query Neon Core production nếu cần:
```sql
SELECT name, applied_at FROM schema_migrations WHERE name='015_class_rewards_schedule.sql';
```
Sau đó merge FE PRs vào dev để Pages deploy. Migration không tạo/sửa điểm cũ và không cần đụng các secrets Cloud Tasks/PubSub đã cấu hình.

## Đối chiếu giao diện Figma

Phần điểm động viên/lịch học dùng frame của file thiết kế trên: popup 3:2497, ghi chú 3:3108, hồ sơ 3:3148, lịch 3:4786/3:4895/3:5124/3:5477 và mobile 3:5725/3:5890. Card metric có nền pastel riêng, bán kính 12px; panel/dialog 16px, tiêu đề 18/24px. Popup dùng cúp emoji và action 44px cùng SVG gốc (lưu tại `public/rewards/`, không gọi Figma khi chạy ứng dụng). Style chỉ áp dụng trong feature rewards.

Lịch có dropdown loại/chu kỳ, các nút chọn thứ và ba lựa chọn giờ hiển thị đồng thời. Ngày hiệu lực và kế hoạch buổi ban đầu nằm trong **Ngày áp dụng & kế hoạch buổi học**; giữ nguyên validation, version và quyền quản lý. Form giờ dùng native time input, định dạng hiển thị theo trình duyệt; API luôn HH:mm. Biểu đồ vẫn là Recharts lazy-load với dữ liệu thật, chú thích tương tác ẩn/hiện và bộ lọc thời gian mở bằng **Khoảng ngày hiển thị**. Không sửa công thức, endpoint, cache/realtime, migration hoặc deployment cho lần chỉnh UI này.
