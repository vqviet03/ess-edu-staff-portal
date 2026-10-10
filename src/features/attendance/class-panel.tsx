"use client";
import {CalendarActions} from "./calendar-actions";
import {NotificationPrioritySelect} from "@/features/notifications/priority";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  useClassAttendanceQuery,
  useSaveAttendanceMutation,
} from "@/api/attendance-api";
import { useClassCapabilities } from "@/features/access/hooks";
import { Feedback } from "@/shared/ui";
import { confirmLeave, useUnsaved } from "@/shared/unsaved";
import {
  AttendanceBadge,
  AttendanceCalendar,
  AttendanceMetric,
  AttendanceSurface,
  WarningBadge,
} from "./shared";
import {
  dateLabel,
  reasonLabels,
  todayDate,
  type ClassAttendance,
  type AttendanceRow,
} from "./models";
function Roster({
  rows,
  checked,
  onChange,
  editable,
  draft,
  compact = false,
}: {
  rows: AttendanceRow[];
  checked: Record<string, boolean>;
  onChange: (id: string, v: boolean) => void;
  editable: boolean;
  draft: boolean;
  compact?: boolean;
}) {
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box
        sx={{
          display: { xs: "none", md: "grid" },
          gridTemplateColumns: compact
            ? "minmax(120px,1fr) 70px 130px"
            : "minmax(180px,1.6fr) 90px 140px 135px 115px",
          gap: 1,
          bgcolor: "var(--att-bg)",
          p: 1.5,
          borderRadius: "12px",
          fontSize: 12,
          color: "var(--att-muted)",
          minWidth: compact ? 0 : 740,
        }}
      >
        {(compact
          ? ["Học sinh", "Có mặt", "Trạng thái buổi"]
          : [
              "Học sinh",
              "Có mặt",
              "Trạng thái buổi",
              "Nghỉ / kế hoạch",
              "Cảnh báo",
            ]
        ).map((s) => (
          <span key={s}>{s}</span>
        ))}
      </Box>
      {rows.map((row) => (
        <Box
          key={row.studentId}
          data-testid="attendance-row"
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr 48px",
              md: compact
                ? "minmax(120px,1fr) 70px 130px"
                : "minmax(180px,1.6fr) 90px 140px 135px 115px",
            },
            gap: 1,
            alignItems: "center",
            py: 1.5,
            px: { xs: 0, md: 1.5 },
            borderBottom: "1px solid",
            borderColor: "divider",
            minWidth: { xs: 0, md: compact ? 0 : 740 },
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              {row.name}
              {row.nickname ? ` (${row.nickname})` : ""}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "var(--att-muted)" }}>
              {row.publicId}
            </Typography>
          </Box>
          <Checkbox
            size="small"
            checked={!!checked[row.studentId]}
            disabled={!editable}
            onChange={(_, v) => onChange(row.studentId, v)}
            slotProps={{ input: { "aria-label": `Có mặt: ${row.name}` } }}
            sx={{
              justifySelf: { xs: "end", md: "start" },
              color: "var(--att-muted)",
              "&.Mui-checked": { color: "var(--att-green)" },
            }}
          />
          <Box>
            <AttendanceBadge
              status={
                draft
                  ? checked[row.studentId]
                    ? "PRESENT"
                    : "UNSET"
                  : row.status
              }
            />
            {draft && !checked[row.studentId] && (
              <Typography sx={{ fontSize: 11, color: "var(--att-orange)" }}>
                Vắng khi lưu
              </Typography>
            )}
          </Box>
          {!compact && (
            <Typography
              sx={{
                fontSize: 12,
                color: "var(--att-muted)",
                gridColumn: { xs: "1 / -1", md: "auto" },
              }}
            >
              {row.stats.plannedSessions > 0
                ? `${row.stats.absent}/${row.stats.plannedSessions} · ${row.stats.absencePercentage?.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`
                : "Chưa có kế hoạch"}
            </Typography>
          )}
          {!compact && (
            <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
              <WarningBadge stats={row.stats} />
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}
function DayEditor({
  data,
  classId,
  onSaved,
  onCancel,
  compact,
}: {
  data: ClassAttendance;
  classId: string;
  onSaved: () => void;
  onCancel: () => void;
  compact?: boolean;
}) {
  const [initial] = useState(data),
    [checked, setChecked] = useState(() =>
      Object.fromEntries(
        data.items.map((r) => [r.studentId, r.status === "PRESENT"]),
      ),
    ),
    [priority,setPriority]=useState<"NORMAL"|"IMPORTANT"|undefined>(),
    [reason, setReason] = useState(""),
    [dirty, setDirty] = useState(false),
    [confirm, setConfirm] = useState(false),
    [allAbsent, setAllAbsent] = useState(false),
    [error, setError] = useState<unknown>(),
    [save, saving] = useSaveAttendanceMutation();
  useUnsaved(dirty);
  const absent = initial.items.filter((r) => !checked[r.studentId]),
    change = (id: string, value: boolean) => {
      setChecked((old) => ({ ...old, [id]: value }));
      setDirty(true);
    };
  return (
    <Stack spacing={1.5}>
      {data.version !== initial.version && (
        <Alert severity="warning">
          Dữ liệu đã thay đổi. Bản chỉnh sửa được giữ lại; hãy tải lại trước khi
          lưu.
        </Alert>
      )}
      <Typography sx={{ fontSize: 12, color: "var(--att-muted)" }}>
        Tích Có mặt cho học sinh tham gia. Ô chưa tích chỉ trở thành Vắng sau
        khi xác nhận lưu.
      </Typography>
      <Roster
        rows={initial.items}
        checked={checked}
        onChange={change}
        editable={!saving.isLoading}
        draft
        compact={compact}
      />
      {initial.saved && (
        <TextField
          size="small"
          required
          label="Lý do chỉnh sửa"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setDirty(true);
          }}
          slotProps={{ htmlInput: { maxLength: 2000 } }}
        />
      )}
      <NotificationPrioritySelect classId={classId} feature="ATTENDANCE" value={priority} onChange={setPriority}/>
      <Feedback error={error} />
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          onClick={() => {
            setChecked(
              Object.fromEntries(initial.items.map((r) => [r.studentId, true])),
            );
            setDirty(true);
          }}
          disabled={saving.isLoading}
        >
          Tất cả có mặt
        </Button>
        <Button
          size="small"
          variant="contained"
          disabled={
            saving.isLoading ||
            !initial.items.length ||
            data.version !== initial.version ||
            (initial.saved && !reason.trim())
          }
          onClick={() => {
            setAllAbsent(false);
            setConfirm(true);
          }}
        >
          Lưu điểm danh
        </Button>
        {initial.saved && (
          <Button
            size="small"
            onClick={() => {
              if (confirmLeave()) onCancel();
            }}
          >
            Hủy sửa
          </Button>
        )}
      </Stack>
      <Dialog
        open={confirm}
        onClose={() => {
          if (!saving.isLoading) setConfirm(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Xác nhận lưu điểm danh</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography>
              {dateLabel(initial.date)} · {initial.items.length - absent.length}{" "}
              có mặt · {absent.length} vắng
            </Typography>
            {absent.length > 0 && (
              <Alert severity="warning">
                Chưa tích: {absent.map((r) => r.nickname || r.name).join(", ")}.
                Những bạn này sẽ được ghi nhận Vắng.
              </Alert>
            )}
            {absent.length === initial.items.length && (
              <Stack direction="row" sx={{ alignItems: "center" }}>
                <Checkbox
                  checked={allAbsent}
                  onChange={(_, v) => setAllAbsent(v)}
                  slotProps={{
                    input: { "aria-label": "Xác nhận cả lớp vắng" },
                  }}
                />
                <Typography>Tôi xác nhận cả lớp vắng buổi này.</Typography>
              </Stack>
            )}
            <Typography variant="body2" color="text.secondary">
              Chưa ghi nhận không được suy ra Vắng. Lưu thành công cập nhật báo
              cáo và thông báo.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            size="small"
            disabled={saving.isLoading}
            onClick={() => setConfirm(false)}
          >
            Hủy
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={
              saving.isLoading ||
              (absent.length === initial.items.length && !allAbsent)
            }
            onClick={async () => {
              setError(undefined);
              try {
                await save({
                  classId,
                  date: initial.date,
                  version: initial.version,
                  reason,
                  notificationPriority:priority,
                  rows: initial.items.map((r) => ({
                    studentId: r.studentId,
                    status: checked[r.studentId] ? "PRESENT" : "ABSENT",
                  })),
                }).unwrap();
                setDirty(false);
                setConfirm(false);
                onSaved();
              } catch (e) {
                setConfirm(false);
                setError(e);
              }
            }}
          >
            {saving.isLoading ? "Đang lưu…" : "Xác nhận lưu"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
function AttendanceDay({
  data,
  classId,
  editable,
  today,
}: {
  data: ClassAttendance;
  classId: string;
  editable: boolean;
  today: boolean;
}) {
  const [edit,setEdit]=useState(false),[message,setMessage]=useState("");
  const allowed=editable && data.date<=data.today && !data.replaced && !data.isHoliday && !data.isCancelled,
    ready=data.scheduled||data.confirmed;
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={1.5}>
        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
          {today
            ? "Điểm danh hôm nay"
            : `${dateLabel(data.date)} · ${data.reasonKind ? reasonLabels[data.reasonKind] : data.scheduled ? "Theo lịch" : "Ngoài lịch"}`}
        </Typography>
        <Typography sx={{ fontSize: 14, color: "var(--att-muted)" }}>
          {dateLabel(data.date)}
          {data.startTime
            ? ` · ${data.startTime}–${data.endTime}`
            : " · Giờ linh động"}
        </Typography>
        <Box>
          <AttendanceBadge
            status={data.isHoliday?"HOLIDAY":data.isCancelled?"CANCELLED":data.isPlanned?"PLANNED":data.replaced ? "REPLACED" : data.saved ? "SAVED" : "UNSET"}
          />
          {data.scheduled && (
            <Typography
              component="span"
              sx={{ fontSize: 12, color: "var(--att-green)", ml: 1.5 }}
            >
              Ngày học theo lịch
            </Typography>
          )}
        </Box>
        {data.reasonKind && (
          <Typography sx={{ fontSize: 12, color: "var(--att-muted)" }}>
            {reasonLabels[data.reasonKind]} · {data.reason}
            {data.replacesDate
              ? ` · Thay buổi ${dateLabel(data.replacesDate)}`
              : ""}
          </Typography>
        )}
        {data.updatedBy && (
          <Typography sx={{ fontSize: 12, color: "var(--att-muted)" }}>
            {data.updatedBy} · Cập nhật{" "}
            {data.updatedAt
              ? new Date(data.updatedAt).toLocaleString("vi-VN")
              : ""}
          </Typography>
        )}
        {!editable && (
          <Alert severity="info">
            Chỉ xem. Giảng viên đang phụ trách lớp mới được thêm hoặc sửa điểm
            danh.
          </Alert>
        )}
        {data.date > data.today && (
          <Alert severity="info">
            Ngày tương lai chỉ xem, không điểm danh.
          </Alert>
        )}
        <CalendarActions data={data} classId={classId} editable={editable}/>
        {!ready&&!data.isHoliday&&<Alert severity="info">Ngày ngoài lịch. Xếp học bù hoặc học thêm trước khi điểm danh.</Alert>}
        {message && (
          <Alert severity="success" onClose={() => setMessage("")}>
            {message}
          </Alert>
        )}
        {allowed && ready && (edit || !data.saved) ? (
          <DayEditor
            data={data}
            classId={classId}
            compact={!today}
            onSaved={() => {
              setEdit(false);
              setMessage("Đã lưu điểm danh.");
            }}
            onCancel={() => setEdit(false)}
          />
        ) : (
          <>
            <Roster
              rows={data.items}
              checked={Object.fromEntries(
                data.items.map((r) => [r.studentId, r.status === "PRESENT"]),
              )}
              onChange={() => {}}
              editable={false}
              draft={false}
              compact={!today}
            />
            {data.saved && (
              <Button
                size="small"
                variant="contained"
                sx={{ alignSelf: "flex-start" }}
                disabled={!allowed}
                onClick={() => setEdit(true)}
              >
                Chỉnh sửa
              </Button>
            )}
          </>
        )}
        {!data.items.length && (
          <Feedback empty="Không có học sinh thuộc buổi học này." />
        )}
        {!!data.changes.length && (
          <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1.5 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>
              Lịch sử chỉnh sửa
            </Typography>
            {data.changes.map((h, i) => (
              <Typography
                key={`${h.createdAt}-${i}`}
                sx={{ fontSize: 12, color: "var(--att-muted)", mb: 0.5 }}
              >
                {h.authorName} ({h.authorPublicId}) ·{" "}
                {new Date(h.createdAt).toLocaleString("vi-VN")} ·{" "}
                {h.studentName}: <AttendanceBadge status={h.before} /> →{" "}
                <AttendanceBadge status={h.after} />{" "}
                {h.reason && `· ${h.reason}`}
              </Typography>
            ))}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
export function ClassAttendancePanel({ classId }: { classId: string }) {
  const permissions = useClassCapabilities(classId),
    [month, setMonth] = useState(todayDate().slice(0, 7)),
    [selected, setSelected] = useState<string | null>(null),
    today = useClassAttendanceQuery(
      { classId },
      { skip: !permissions.viewLearning },
    ),
    date =
      selected ??
      today.currentData?.calendar
        .filter(
          (d) =>
            d.status === "SAVED" &&
            d.date < (today.currentData?.today ?? todayDate()),
        )
        .at(-1)?.date ??
      today.currentData?.today ??
      todayDate(),
    history = useClassAttendanceQuery(
      { classId, date, month },
      {
        skip:
          !permissions.viewLearning ||
          !today.currentData ||
          (date === today.currentData.today && month === date.slice(0, 7)),
      },
    ),
    chosen =
      date === today.currentData?.today && month === date.slice(0, 7)
        ? today
        : history;
  if (
    permissions.loading ||
    permissions.error ||
    today.isLoading ||
    today.error ||
    !today.currentData
  )
    return (
      <Feedback
        loading={permissions.loading || today.isLoading}
        error={permissions.error || today.error}
        retry={() => {
          void permissions.retry();
          void today.refetch();
        }}
      />
    );
  const data = today.currentData;
  return (
    <AttendanceSurface>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2,minmax(0,1fr))",
            md: "repeat(4,minmax(0,1fr))",
          },
          gap: 1.5,
        }}
      >
        <AttendanceMetric
          label="Kế hoạch ban đầu"
          value={data.plannedSessions ? `${data.plannedSessions} buổi` : "—"}
          detail="Không tăng khi học bổ sung"
        />
        <AttendanceMetric
          label="Đã có điểm danh"
          value={`${data.savedSessions} buổi`}
          detail={`${data.supplementalSessions} buổi bổ sung`}
        />
        <AttendanceMetric
          label="Hôm nay"
          value={
            data.saved
              ? `${data.items.filter((r) => r.status === "PRESENT").length} bạn`
              : "—"
          }
          detail="Học sinh có mặt"
        />
        <AttendanceMetric
          label="Cần theo dõi"
          value={`${data.needsAttention} bạn`}
          detail="Nghỉ từ 10% kế hoạch"
        />
      </Box>
      <AttendanceDay
        key={`today-${data.date}`}
        data={data}
        classId={classId}
        editable={permissions.editLearning}
        today
      />
      <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
        Lịch sử & bổ sung điểm danh
      </Typography>
      <Typography sx={{ fontSize: 14, color: "var(--att-muted)" }}>
        Chọn ngày để xem, chỉnh sửa hoặc ghi nhận bù.
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0,1fr)",
            md: "316px minmax(0,1fr)",
          },
          gap: 1.5,
          alignItems: "start",
        }}
      >
        <AttendanceCalendar
          month={month}
          onMonth={(m) => {
            if (confirmLeave()) {
              setMonth(m);
              setSelected(`${m}-01`);
            }
          }}
          selected={date}
          onSelect={(d) => {
            if (confirmLeave()) {
              setSelected(d);
              setMonth(d.slice(0, 7));
            }
          }}
          items={chosen.currentData?.calendar ?? data.calendar}
          today={data.today}
        />
        <Box>
          <Feedback
            loading={
              chosen.isLoading || (chosen.isFetching && !chosen.currentData)
            }
            error={chosen.error}
            retry={() => void chosen.refetch()}
          />
          {chosen.currentData && (
            <AttendanceDay
              key={date}
              data={chosen.currentData}
              classId={classId}
              editable={permissions.editLearning}
              today={false}
            />
          )}
        </Box>
      </Box>
      <Typography sx={{ fontSize: 12, color: "var(--att-muted)" }}>
        Ngày được tính theo múi giờ của lớp · Asia/Ho_Chi_Minh
      </Typography>
    </AttendanceSurface>
  );
}
