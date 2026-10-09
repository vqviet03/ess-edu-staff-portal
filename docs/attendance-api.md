# Attendance / comment extensions

Contract đầy đủ: https://github.com/vqviet03/ess-edu-api/blob/feat/class-rewards-schedules/docs/attendance-threads.md

Tất cả endpoint dưới API base /v1, JWT + workspace headers theo baseQuery hiện có. Attendance tags theo classId; mutation giữ form khi 403/409/422, không tự retry. Signal ATTENDANCE invalidate Attendance/Rewards của lớp, không polling.

- GET /classes/:classId/attendance?date=&month=
- POST /classes/:classId/attendance/days {date,version,reasonKind,reason,replacesDate?}
- PUT /classes/:classId/attendance {date,version,rows:[{studentId,status}],reason}
- GET /classes/:classId/students/:studentId/attendance?month=&status=&page=&pageSize=
- PUT schedule bổ sung plannedSessions/planStartDate, chỉ quản lý đặt kế hoạch ban đầu.
- PUT /comments/:id/pin {isPinned,version}; PUT/DELETE /comments/:id/like.
- Post.pinnedComments/canPinComment; Comment.isPinned/parentAuthorName/likeCount/myLike.

Ngày Việt Nam. PRESENT/ABSENT chỉ có hiệu lực chuyên cần sau lưu buổi. UNSET không tính nghỉ. MAKEUP liên kết ngày gốc theo lịch, giữ lịch sử nhưng không đếm nghỉ hai lần. SUPPLEMENTAL không tăng plannedSessions. Tỷ lệ chính xác <10 xanh, 10..20 cam, >20 đỏ; plannedSessions=0 trả null/NO_PLAN. Backend là nguồn xác nhận quyền, version và roster cuối cùng.
