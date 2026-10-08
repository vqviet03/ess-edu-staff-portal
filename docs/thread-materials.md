# Thread học tập, bình luận đính kèm và truy cập file riêng tư

Dùng hệ thống JWT, school scope, RTK Query và envelope `{data:T}` hiện có. Các endpoint dưới đây nằm dưới `/v1`; UUID chỉ là khóa kỹ thuật trong request, không dùng làm nhãn UI. Ngày ISO 8601, kích thước byte, mutations kiểm tra version. Không có dữ liệu mock trong production.

## Thread và liên hệ

| Method | Endpoint | Kết quả / body |
|---|---|---|
| GET | `/classes/{classId}/threads?cursor=&limit=10` | `{items:Post[],nextCursor}`; gộp các phiên của lớp; học sinh chỉ thấy PUBLISHED |
| GET | `/classes/{classId}/contacts` | `{items:[{id,name,email,phone}]}`; ID công khai, phân công ACTIVE và hồ sơ/tài khoản hoạt động |
| GET / POST | `/posts/{postId}/comments` | danh sách phân trang / `{body,parentId?,materialIds?:string[]}` |
| PATCH | `/comments/{commentId}` | `{body,version,materialIds?:string[]}`; chỉ tác giả sửa |
| PUT / DELETE | `/posts/{postId}/reaction` | `{reaction:"LIKE"|"LOVE"|"CELEBRATE"}` / bỏ tương tác |
| PUT | `/material-upload-routes` | manager: `{source:"comment"|"session"|"library",fileType:"all"|"image"|"audio"|"video"|"pdf"|"document"|"other",storageId,version?}` |
| GET | `/material-upload-settings` | giới hạn; manager thêm `routes`, học sinh không nhận danh sách/địa chỉ storage |
| POST | `/material-uploads/initiate` | UploadInput + `uploadSource:"comment"`, `sourcePostId`, optional `sourceSessionId` |
| POST | `/material-uploads/{uploadId}/complete` | `{version}`; xác minh MIME, byte gốc và thumbnail trước AVAILABLE |
| GET | `/materials/{materialId}/content?purpose=preview|download|thumbnail` | binary; **Bearer JWT bắt buộc**, không redirect storage |

Comment DTO thêm `attachments: MaterialFile[]`. Tối đa 20 file khác nhau; body có thể trống nếu có file. Bỏ `materialIds` khi PATCH giữ nguyên attachment; gửi `[]` gỡ liên kết. File mới phải do chính người bình luận upload vào đúng post, không cho gắn file kho/lớp khác để vượt quyền. Lỗi không xóa bản nháp. Học sinh không upload vào kho thông thường hoặc sửa post/schema/điểm.

## Routing upload và thư mục

Manager chọn ổ nhận file bình luận trong màn hình Storage, mặc định theo `comment/all`, hoặc ưu tiên từng loại. Chưa cấu hình trả 409 `UPLOAD_ROUTE_REQUIRED`; không tự chọn ổ hoặc fallback. Server bỏ qua `storageId/folderId` do client truyền với comment. Đích là `External source/{Ảnh|Âm thanh|Video|PDF|Tài liệu|Khác}` trong Materials DB; một ổ có thể nhận nhiều loại nếu category cho phép. `AUDIO`/`IMAGES` vẫn chỉ nhận đúng loại; dùng DOCUMENTS/OTHER cho route tổng hợp. Routing session/library là tùy chọn; nếu không có tiếp tục lựa chọn đích hiện hành.

Frontend nén ảnh lớn hơn 20 MiB bằng Canvas/WebP, giảm kích thước/quality theo giới hạn trước khi xin upload. Server từ chối ảnh còn lớn hơn 20 MiB. Ảnh nhỏ giữ nguyên. Ảnh động quá lớn khi nén sẽ trở thành ảnh tĩnh; HEIC không giải mã được trên trình duyệt sẽ báo lỗi, không tự upload nguyên bản. Thumbnail tối đa 512 KiB, sinh nhỏ từ ảnh/PDF trang đầu; dung lượng quota gồm cả file và thumbnail. Không tải file gốc để render danh sách thumbnail.

Signed URL chỉ còn dùng cho **PUT upload** ngắn hạn để đo tiến trình/hủy; never JWT trong URL. File ở bucket private. Backend kiểm tra quyền init/complete và kiểm tra object đã tải thật; frontend không giữ credentials. Di chuyển file giữ nguyên class/post/comment links; manager giữ quyền move, duyệt/xóa; student không được rename/move/delete file.

## Quyền đọc ở mỗi request

Preview, download, thumbnail, access URL và file metadata cùng đi qua kiểm tra school, tài khoản/hồ sơ và class links hiện hành. Học sinh phải có enrollment ACTIVE, hồ sơ ACTIVE và tài liệu trong post PUBLISHED còn tồn tại. Enrollment ENDED/không hoạt động mất quyền ngay ở request tiếp theo, kể cả biết ID file. File comment chưa gửi chỉ tác giả đọc và phải còn quyền lớp; hết hạn signed PUT không thu hồi file đã hoàn tất; không công khai draft. Teacher được đọc lớp có assignment/lịch sử theo policy hiện có; manager đọc trong school nhưng quyền manager không cho sửa nội dung học tập.

Endpoint `/materials/access/{ticket}` công khai cũ bị ngừng: anonymous 401, authenticated 410. `/access-url` trả URL application, không trả signed GET. Legacy Core material ở private storage dùng cùng proxy; legacy external/public URLs trả 410 `FILE_UNAVAILABLE`, cần upload lại vào kho private. Không thể thu hồi byte mà người dùng đã tải trước khi mất quyền.

Binary response: `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, sandbox CSP; download có Content-Disposition attachment. Frontend RTK Query lấy Blob với Bearer, thu hồi object URL khi đóng/reset cache. PDF lazy-load, mặc định fit khung và giữ tỷ lệ, chọn lật trang/cuộn dọc, zoom và fullscreen. Audio dùng controls/tua/tốc độ; ảnh/video giữ tỷ lệ.

Giới hạn hiện tại: backend spool object vào temporary file private (tự xóa) và kiểm tra byte trước khi gửi; frontend lấy toàn bộ Blob trước preview/download. Đây chưa phải streaming Range xuyên storage; file lớn có chi phí egress/memory/temp disk, giới hạn mặc định 100 MiB. Response hỗ trợ Range trên stream đã spool, không nên tăng giới hạn tùy tiện. Không có virus scanner; MIME/size/authorization không thay thế quét nội dung.

## Realtime và idle

Giữ Cloud Tasks + Pub/Sub hiện tại; không thêm worker, interval, PostgreSQL LISTEN hoặc DB traffic định kỳ. Mutation tạo outbox thì enqueue qua dispatch flow hiện có. Thay đổi post/comment/reaction gửi notification signal sau durable delivery. Operation DONE chứa classId kỹ thuật để gửi signal cho học sinh trong đúng lớp; không lộ operation result/payload.

Student websocket xác thực bằng frame AUTH (JWT không đặt trong URL), nhận READY/CURSOR, RESOURCE_CHANGED/NOTIFICATION. Kết nối lại gửi cursor; server replay event history, lọc enrollment hiện hành và chỉ gửi class/operation ID. Snapshot notices nhận ở connection giúp phát hiện thông báo bỏ lỡ. FE invalidate resource theo lớp, deduplicate event và giữ cache khi đổi tab. Không refresh theo mount/focus/network interval; không polling operation. Socket đóng khi tab hidden/offline/logout, mở lại theo visibility/online/pageshow. Transport lỗi không tạo timer reconnect; chuyển tab trở lại/online/reload là thao tác khôi phục. Timer JWT expiry chỉ đọc clock, không gọi API. Socket còn mở có thể giữ Cloud Run active; Neon không bị LISTEN hoặc SQL polling giữ thức.

## Rollout GCP / Neon production

1. Review/merge backend PR, build image mới. **Không có migration/seeding tự động lúc API startup.**
2. Chạy job migration hiện có bằng image mới, argument `--migrate-materials`, secret `ConnectionStrings__MaterialsMigration` là owner/direct của **Materials / production**. Additive `005_materials.sql` tạo comment_attachments/upload_routes và bổ sung nguồn comment; không xóa dữ liệu. Giữ service runtime dùng `ConnectionStrings__Materials` ess_runtime/production hiện tại.
3. Deploy backend, giữ nguyên Cloud Tasks queue/service account, Pub/Sub topic và cấu hình Storage Registry/Secret Manager của lần triển khai trước. Không cần project Neon mới, secret mới, worker hoặc CPU always-on cho thay đổi này. Cloud Run min-instances=0.
4. Manager mở Storage, chọn nguồn Bình luận, loại Tất cả và ổ nhận; có thể thêm mapping từng loại. PUT cấu hình ghi audit, version conflict 409.
5. Merge/deploy hai FE từ dev sau khi backend/migration sẵn sàng; Pages workflow hiện tại giữ nguyên. Thử student active/enrollment ended, comment đính kèm, tải file anonymous phải 401, quyền chéo lớp phải 403.

PR này không tự chạy migration hay deploy production. Không có thay đổi secret/bucket ACL ngoài code; bucket vẫn phải private theo cấu hình hiện có.
