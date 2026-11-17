# Quản lý ID, audit, cấu hình ứng dụng và xóa tài liệu

Thành công `{data:T}`, lỗi `{error:{code,message,fieldErrors?}}`; prefix API `/v1`. Dùng phiên và phân quyền hiện tại, không polling HTTP, không retry mutation tự động. UUID nội bộ giữ nguyên khi sửa public ID.

## ID và tên lớp

`POST /manager/identifiers/check` nhận `{entity:"students"|"teachers"|"classes"|"labels",id,excludeId?}`. `excludeId` là ID hiện tại khi sửa; response `{id,isAvailable,requestedId}` (`id` là gợi ý cuối cùng). Kiểm tra này chỉ là gợi ý; commit kiểm tra trùng lại trong transaction. Quyền MANAGER bắt buộc.

Preview UPDATE một hồ sơ: `{entity:"students",mode:"UPDATE",rows:[{id:"id-cu",newId:"id-moi",version:1,fullName:"Tên mới"}]}`. `id` vẫn là khóa tìm bản ghi cũ; `newId` chỉ dùng trong form từng hồ sơ. Đổi ID không đổi UUID, điểm, phân công, enrollment hoặc lịch sử. Nếu login ID và student/teacher code đang bằng public ID cũ, chúng đổi cùng; login alias tự đặt giữ nguyên. Trùng ID trả lỗi, không tự thêm số khi đổi ID. Bulk/Excel vẫn dùng `id` để tìm và không đổi ID của bản ghi cũ.

CREATE học sinh/giảng viên giữ quy tắc viết tắt tên và hậu tố số tránh trùng. CREATE lớp: ID có thể tự nhập; nếu bỏ trống server gợi ý `<classIdPrefix><sequence>`, không reset sequence khi đổi tiền tố. `name`, `code` có thể tự đặt, không bắt buộc format. `nameSuffix` chỉ hỗ trợ autofill lúc tạo; UPDATE payload cũ chỉ có suffix vẫn được hỗ trợ. Form mới sửa trực tiếp tên/mã lớp.

## Audit

`GET /manager/audit?page=1&pageSize=20&search=` → `{items,total,page,pageSize}`; pageSize 1–100. Search gồm hành động, đối tượng, ID, lý do, tên/ID người thao tác. Event bổ sung `actorUserId` (public ID), `actorLoginId`, `actorName`; `actorId` là UUID ổn định. `changes` luôn là `[{id,fields:string[]}]`, kể cả log kho cũ lưu object. Người đã ngừng hoạt động vẫn tra được tên; log không có actor dùng tên hệ thống.

`GET /materials/:id/audit-logs?page=1&pageSize=20` có paging/total và cùng các trường actor. Manager mới xem được nhật ký tài liệu, kể cả tài liệu đã xóa. Teacher/student không nhận trường nội bộ storage hoặc log.

## Tên ứng dụng và tiền tố gợi ý

- `GET /application-settings` (public, chỉ trả branding): `{appName:"ESS",classIdPrefix:"ess",version:1}`.
- `GET /manager/settings/proposals` → `{items,nextCursor:null}` (100 đề xuất gần nhất).
- `POST /manager/settings/proposals` → `{appName,classIdPrefix,version,reason,confirmSolo:false}`.
- `POST /manager/settings/proposals/:id/decision` → `{decision:"APPROVED"|"REJECTED",version}`.

Tên 1–80 ký tự; tiền tố 2–16 chữ thường/số/gạch ngang, bắt đầu bằng chữ. Server chốt **tất cả quản lý khác đang hoạt động** khi tạo đề xuất. Mỗi người phải đồng ý; người đề xuất không tự duyệt. Một người từ chối kết thúc đề xuất. Nếu chỉ còn một quản lý, phải xác nhận `confirmSolo:true`. Đề xuất hết hạn sau 7 ngày. Thay đổi phiên bản cấu hình/danh sách quản lý giữa hai bước trả 409 và yêu cầu đề xuất mới. Các mutation hỗ trợ cơ chế HTTP 202/OPERATION hiện tại.

Đề xuất và kết quả ghi audit + durable outbox trong Core; worker chuyển thông báo riêng cho quản lý sang Notifications, chống trùng event/recipient. Socket cập nhật cache cấu hình sau thông báo thật; không polling. Cấu hình áp dụng trên header, sidebar, title, file Excel và gợi ý lớp mới; không đổi ID lớp cũ. Repo, Cloud Run service/URL, tenant code, tên DB/secret, JWT issuer/audience và browser storage keys là định danh hạ tầng, giữ nguyên để không làm mất phiên hoặc phá kết nối.

## Quota và xóa tài liệu thật

Mặc định mỗi storage **4,5 GB = 4.500.000.000 byte** (decimal). Đây là quota ứng dụng, không thay đổi gói hoặc giới hạn của Neon. Có cấu hình quota riêng thì cấu hình đó ưu tiên. `storageBytes = sizeBytes + thumbnailBytes`; reservation và server HEAD kiểm cả hai object trước AVAILABLE. DTO trả cả ba trường byte, danh sách không tải file gốc để dựng thumbnail.

Manager gọi `GET /materials/:id/deletion-impact` để xem file và các post/phiên đang dùng, rồi `DELETE /materials/:id` với `{version,reason,linkAction:"KEEP_UNAVAILABLE"|"DETACH"}`. Teacher dùng deletion-request/decision hiện tại. `KEEP_UNAVAILABLE` giữ liên kết dưới dạng không còn khả dụng; `DETACH` bỏ liên kết nhưng giữ lịch sử. UI yêu cầu xác nhận rõ thao tác không khôi phục được file.

Server đặt `DELETING`, ẩn file khỏi kho/student ngay, lưu job bền vững. Worker gọi DeleteObject trên **đúng category/project/bucket hiện tại**, xóa original và thumbnail, sau đó đặt `DELETED` và ghi audit. Không xóa row metadata/log. Quota chỉ giảm khi cả hai object đã xóa thành công. Lỗi storage giữ quota, retry idempotent có backoff, trả tình trạng purge trên danh sách duyệt và thông báo quản lý. Đợi signed PUT còn hiệu lực hết hạn (tối đa 10 phút) trước purge để upload muộn không tái tạo file. Folder/post/comment/notification vẫn soft delete. Canceled uploads giữ reservation để operator đối soát, không tự tuyên bố đã giải phóng byte.
