# Báo cáo học tập và hỗ trợ thao tác

Route tĩnh `/reports/?classId=...&studentId=...&unitId=...`; không cần rewrite. Mở từ học sinh trong dashboard lớp hoặc hồ sơ quản lý. Có chọn lớp, học sinh (gồm lịch sử), Unit; mặc định lớp ACTIVE đầu tiên, học sinh ACTIVE đầu tiên và Unit cao nhất. Giữ cache keys theo cả lớp/học sinh/Unit; không dùng cache lớp trước khi đổi.

Đọc cùng snapshot đã công bố của Student Portal: tổng điểm/kỹ năng, 7 đường monotone qua Unit, bảng chi tiết, 8 biểu đồ chênh lệch, nhận xét và lời khuyên. Null hiển thị chưa có dữ liệu; không coi điểm là tiến độ khóa học. Chart load động khi gần viewport. Nút kỹ năng có aria-pressed bật/tắt từng đường/biểu đồ và hiện/ẩn toàn bộ; mặc định đủ kỹ năng, không sửa dữ liệu báo cáo.

Quản lý xem; giảng viên được sửa nhận xét khi capability editLearning và API canEditComments cùng cho phép. Manager workspace luôn chỉ xem, dual-role chuyển Giảng viên để sửa lớp đang phụ trách. Form có validation 4.000 ký tự, cảnh báo chưa lưu; giữ nội dung khi 403/409/422. Chỉ PATCH bảy comments + overallComment + report/source versions, giữ score/advice. Async mutation qua cùng baseQuery; Reports/Results/Assessments invalidate sau DONE, WebSocket thông báo người khác. Báo cáo polling 30 giây lúc có focus.

API prefix cấu hình hiện có:

- GET `/classes/{classId}/students/{studentId}/units` → `{data:{items:Unit[]}}`.
- GET `/classes/{classId}/students/{studentId}/progress` → `{data:{items:ProgressEntry[]}}`.
- GET `/classes/{classId}/students/{studentId}/units/{unitId}/report` → `{data:{report,version,assessmentId,resultVersion,canEditComments}}`.
- PATCH cùng path + `/comments` → cùng data. Input `{version,assessmentId,resultVersion,skills:[{code,comment}],overallComment}`; skillCode lowercase, đủ 7 mã. Roster thêm optional publicId/studentCode; studentId trong requests vẫn là GUID.

Mock seed có báo cáo đã công bố Unit 3 của Bon, 23.1/35, kỹ năng đủ 7; dùng bài `assessment-published` độc lập khỏi bài nháp nhập thử. Nhận xét mock sửa thật, snapshot và nguồn cùng cập nhật, persist, kiểm tra version và quyền. Reset demo để lấy seed mới nếu browser còn dữ liệu demo cũ. Bản deploy giữ API thật, không fallback mock.

“Hướng dẫn” nằm trên header ở mọi màn hình, giải thích đúng route/nhóm hồ sơ, minh họa đánh dấu không phải dữ liệu thật. Desktop đẩy cột 320px bên phải; mobile là vùng cuộn phía dưới. Không backdrop, không modal, không khóa/focus trap; “Ẩn hướng dẫn” đóng vùng hỗ trợ. Nội dung bao gồm auth, lớp, phiên, schema/công bố, điểm, Excel, quản lý hồ sơ/tài khoản/thời hạn/bulk/lifecycle.

Thu/phóng: 75/85/100/115/125%, lưu localStorage `ess.staff.zoom`, mặc định 100%. Chỉ thay hiển thị, không dữ liệu hoặc browser zoom. Popup/form vẫn hoạt động theo tọa độ browser. Sidebar/bảng scroll trong vùng riêng khi không đủ không gian.
