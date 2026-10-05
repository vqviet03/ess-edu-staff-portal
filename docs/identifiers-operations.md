# ESS · ID, tác vụ nền và realtime

HTTP đi qua cùng RTK Query baseQuery. WebSocket được quản lý bằng `liveEvents.onCacheEntryAdded`, đóng khi logout/cache entry bị xóa, không tạo auth/fetch song song.

## ID

- Form mới học sinh/Staff: nhập họ tên gọi `POST /manager/identifiers/suggest`, debounce 350 ms, điền ID backend trả; response cũ không ghi đè khi người dùng đã sửa ID/tên.
- Vũ Quốc Việt → `vq.viet`; Nguyễn Trung Anh → `nt.anh`. Backend bỏ dấu, viết thường chữ đầu các từ trước + dấu chấm + từ cuối. ID tùy chỉnh được giữ hoa/thường.
- Nút **Kiểm tra trùng** gọi `/manager/identifiers/check`; `isAvailable:false` kèm ID gợi ý. Kiểm tra không giữ chỗ; backend kiểm tra lại ở preview.
- CREATE bảng/Excel: ID trống sinh từ tên; ID đã nhập mà trùng thêm số 1, 2…; hiển thị ID cuối trong preview trước khi lưu. UPDATE yêu cầu ID ổn định, không đổi theo tên và không tự tạo khi thiếu ID.
- Lớp mới: ID readonly `ess21`, `ess22`…; quản lý nhập/sửa `nameSuffix` (a1 → ess21-a1). Backend cấp số theo DB, form gợi ý không tự cấp quyền hoặc số. Preview giữ chỗ số lớp nên preview bỏ dở có thể để lại khoảng số. ID cũ không đổi.

```json
POST /manager/identifiers/suggest
{"entity":"students","fullName":"Vũ Quốc Việt"}

{"data":{"id":"vq.viet1","isAvailable":false,"requestedId":"vq.viet"}}
```

## Job

Các mutation nghiệp vụ gửi `Prefer:respond-async` + `Idempotency-Key`. API trả HTTP 202 `{data:{operationId,status:"IN_PROGRESS",command,createdAt,completedAt:null}}`. BaseQuery dispatch trạng thái để UI thông báo **đang xử lý**, rồi theo dõi `GET /operations/{id}`; component vẫn nhận contract kết quả endpoint cũ khi DONE. FAILED giữ form và hiển thị lỗi 401/403/409/422 tương ứng; không tự retry mutation. 401 thu hồi phiên/cache. Auth, preview, template/export, gợi ý ID không đưa vào queue.

- `GET /operations` → `{data:{items:Operation[]}}`, khôi phục theo dõi sau reload.
- DONE → `result` là nguyên `{data,meta?}` của endpoint trước.
- FAILED → `error:{status,code,message}`; backend rollback dữ liệu.
- Polling chỉ đọc, không gửi lại commit. Khi mất theo dõi, job đã gửi còn trong DB; cần xem thông báo trước khi gửi thao tác mới.
- Soft deactivate dùng cùng preview/commit/queue; không thêm DELETE xóa thật.

## WebSocket

URL lấy từ `NEXT_PUBLIC_API_BASE_URL`, thay HTTPS→WSS và nối `/events/ws`. JWT được gửi trong frame đầu `{type:"AUTH",accessToken,cursor?}`, không trong URL. Server xác thực session/roles và origin. Cursor là chuỗi bigint lưu sessionStorage theo user; reconnect sau 3 giây và replay events. Native WebSocket không cần thêm dependency.

Manager cùng trường nhận CHANGE `{eventId,operationId,actorId,status,command,entities,completedAt,error?}`; giảng viên nhận job của mình. Redux listener khử trùng event và invalidate tags tương ứng; RTK tự refetch query đang được sử dụng. UI có thông báo thành công/thất bại, dùng polling làm dự phòng. Mock lưu job/outbox trong localStorage, thực hiện mutations, resume sau reload và đồng bộ giữa các tab.

Không đổi env kết nối hoặc GitHub Pages/static routes. Build real cần backend mới và CORS cho `Prefer`, `Idempotency-Key`, origin `https://vqviet03.github.io`. Backend Cloud Run request billing xử lý qua worker khi có request/WebSocket; nếu scale về 0 khi mọi người offline, job được giữ để tiếp tục khi truy cập lại. Xử lý liên tục khi không ai online cần cấu hình CPU/min instance hoặc dịch vụ đánh thức queue ở backend; frontend không điều khiển setting đó.
