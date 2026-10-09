"use client";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Add from "@mui/icons-material/Add";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import EditCalendar from "@mui/icons-material/EditCalendar";
import {
  useStudyScheduleQuery,
  useSaveStudyScheduleMutation,
} from "@/api/rewards-api";
import { Feedback } from "@/shared/ui";
import { IconAction } from "@/shared/icon-action";
import { useUnsaved } from "@/shared/unsaved";
import { useClassCapabilities } from "@/features/access/hooks";
import {
  displayDate,
  scheduleLabel,
  validateSchedule,
  vietnamToday,
  type ScheduleConfig,
  type ScheduleSlot,
  type StudySchedule,
} from "./models";
const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
function ScheduleEditor({
  classId,
  data,
  onClose,
  onSaved,
}: {
  classId: string;
  data: StudySchedule;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [version] = useState(data.version),
    [config, setConfig] = useState<ScheduleConfig>(
      structuredClone(data.configuration),
    ),
    [effectiveFrom, setEffectiveFrom] = useState(
      data.effectiveFrom && data.effectiveFrom > vietnamToday()
        ? data.effectiveFrom
        : vietnamToday(),
    ),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState<unknown>(),
    [save, saving] = useSaveStudyScheduleMutation();
  useUnsaved(dirty);
  const update = (p: Partial<ScheduleConfig>) => {
    setConfig((v) => ({ ...v, ...p }));
    setDirty(true);
  };
  const changeSlot = (index: number, p: Partial<ScheduleSlot>) =>
    update({
      slots: config.slots.map((s, i) => (i === index ? { ...s, ...p } : s)),
    });
  const newSlot = (): ScheduleSlot => ({
    day: config.mode === "FIXED" ? 1 : null,
    date: config.mode === "FLEXIBLE" ? effectiveFrom : null,
    startTime: "17:00",
    endTime: "18:30",
  });
  const close = () => {
    if (
      !saving.isLoading &&
      (!dirty || window.confirm("Bỏ lịch học chưa lưu?"))
    )
      onClose();
  };
  const validation = validateSchedule(config);
  const submit = async () => {
    if (validation) return;
    setError(undefined);
    try {
      await save({
        classId,
        version,
        effectiveFrom,
        configuration: config,
      }).unwrap();
      setDirty(false);
      onSaved();
    } catch (e) {
      setError(e);
    }
  };
  const times = (
    start: string | null,
    end: string | null,
    change: (p: { startTime?: string; endTime?: string }) => void,
  ) => (
    <Stack direction="row" spacing={1} sx={{ minWidth: 0 }}>
      <TextField
        size="small"
        label="Giờ bắt đầu"
        type="time"
        value={start ?? ""}
        onChange={(e) => change({ startTime: e.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        size="small"
        label="Giờ kết thúc"
        type="time"
        value={end ?? ""}
        onChange={(e) => change({ endTime: e.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
      />
    </Stack>
  );
  return (
    <Dialog open onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Thiết lập lịch học</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            size="small"
            type="date"
            label="Áp dụng từ"
            value={effectiveFrom}
            onChange={(e) => {
              setEffectiveFrom(e.target.value);
              setDirty(true);
            }}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: vietnamToday() },
            }}
            helperText="Giữ lịch và dữ liệu đã chốt; thay đổi từ ngày này trở đi."
          />
          <TextField
            size="small"
            select
            label="Loại lịch"
            value={config.mode}
            onChange={(e) =>
              update({
                mode: e.target.value as ScheduleConfig["mode"],
                slots: [],
              })
            }
          >
            <MenuItem value="FIXED">Lịch cố định</MenuItem>
            <MenuItem value="FLEXIBLE">Lịch linh động</MenuItem>
          </TextField>
          {config.mode === "FIXED" && (
            <TextField
              size="small"
              select
              label="Chu kỳ"
              value={config.cycle}
              onChange={(e) =>
                update({
                  cycle: e.target.value as ScheduleConfig["cycle"],
                  slots: [],
                })
              }
            >
              <MenuItem value="WEEKLY">Theo tuần</MenuItem>
              <MenuItem value="MONTHLY">Theo tháng</MenuItem>
            </TextField>
          )}
          {config.mode === "FIXED" && config.cycle === "WEEKLY" ? (
            <ToggleButtonGroup
              value={config.slots.map((s) => s.day)}
              onChange={(_, days: number[]) =>
                update({
                  slots: days.map(
                    (day) =>
                      config.slots.find((s) => s.day === day) ?? {
                        ...newSlot(),
                        day,
                      },
                  ),
                })
              }
              size="small"
              aria-label="Chọn ngày trong tuần"
              sx={{ flexWrap: "wrap" }}
            >
              {weekdays.map((d, i) => (
                <ToggleButton
                  key={d}
                  value={i + 1}
                  aria-label={i === 6 ? "Chủ nhật" : `Thứ ${i + 2}`}
                >
                  {d}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          ) : (
            <Stack spacing={1}>
              {config.mode === "FLEXIBLE" && (
                <Typography variant="body2">
                  Thêm từng ngày cụ thể, không tự lặp lại.
                </Typography>
              )}
              {config.slots.map((s, i) => (
                <Stack
                  key={i}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    type={config.mode === "FIXED" ? "number" : "date"}
                    label={
                      config.mode === "FIXED" ? "Ngày trong tháng" : "Ngày học"
                    }
                    value={
                      config.mode === "FIXED" ? (s.day ?? "") : (s.date ?? "")
                    }
                    onChange={(e) =>
                      changeSlot(
                        i,
                        config.mode === "FIXED"
                          ? { day: Number(e.target.value) }
                          : { date: e.target.value },
                      )
                    }
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput:
                        config.mode === "FIXED"
                          ? { min: 1, max: 31, step: 1 }
                          : { min: effectiveFrom },
                    }}
                  />
                  <IconAction
                    label={`Xoá ngày ${i + 1}`}
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      update({ slots: config.slots.filter((_, n) => n !== i) })
                    }
                  />
                </Stack>
              ))}
              <Box>
                <IconAction
                  label="Thêm ngày học"
                  icon={<Add />}
                  onClick={() =>
                    update({ slots: [...config.slots, newSlot()] })
                  }
                />
              </Box>
              {config.cycle === "MONTHLY" && config.mode === "FIXED" && (
                <Typography variant="caption">
                  Ngày 29–31 được bỏ qua trong tháng không có ngày đó.
                </Typography>
              )}
            </Stack>
          )}
          <TextField
            size="small"
            select
            label="Giờ học"
            value={config.timeMode}
            onChange={(e) =>
              update({
                timeMode: e.target.value as ScheduleConfig["timeMode"],
                startTime: config.startTime ?? "17:00",
                endTime: config.endTime ?? "18:30",
              })
            }
          >
            <MenuItem value="SHARED">Áp dụng toàn bộ ngày</MenuItem>
            <MenuItem value="PER_DAY">Áp dụng từng ngày</MenuItem>
            <MenuItem value="FLEXIBLE">Giờ linh động · thông báo sau</MenuItem>
          </TextField>
          {config.timeMode === "SHARED" &&
            times(config.startTime, config.endTime, update)}
          {config.timeMode === "PER_DAY" &&
            config.slots.map((s, i) => (
              <Stack key={i} spacing={1}>
                <Typography variant="body2">
                  {config.mode === "FLEXIBLE"
                    ? displayDate(s.date ?? effectiveFrom)
                    : config.cycle === "WEEKLY"
                      ? weekdays[(s.day ?? 1) - 1]
                      : `Ngày ${s.day}`}
                </Typography>
                {times(s.startTime, s.endTime, (p) => changeSlot(i, p))}
              </Stack>
            ))}
          {config.timeMode === "FLEXIBLE" && (
            <Alert severity="info">
              Phụ huynh theo dõi thông báo của giảng viên để biết giờ học.
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary">
            Múi giờ Việt Nam. Có tham gia + đã chốt ngày + không được thưởng = 0
            điểm ngày; vắng không tạo điểm 0. Không tự tạo giao dịch khi ngày
            học đến.
          </Typography>
          {validation && <Alert severity="warning">{validation}</Alert>}
          <Feedback error={error} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button size="small" onClick={close} disabled={saving.isLoading}>
          Đóng
        </Button>
        <Button
          size="small"
          variant="contained"
          disabled={!!validation || !effectiveFrom || saving.isLoading}
          onClick={() => void submit()}
        >
          {saving.isLoading ? "Đang lưu…" : "Lưu lịch học"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
export function StudySchedulePanel({
  classId,
  onSaved,
}: {
  classId: string;
  onSaved?: () => void;
}) {
  const permissions = useClassCapabilities(classId),
    editable = permissions.editSchedule,
    query = useStudyScheduleQuery(classId, { skip: !classId || !permissions.viewLearning }),
    [open, setOpen] = useState(false),
    [viewing, setViewing] = useState(false);
  const data = query.currentData;
  return (
    <>
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography variant="h6">
              Lịch học{data ? ` · ${scheduleLabel(data.configuration)}` : ""}
            </Typography>
            {editable && (
              <IconAction
                label="Thiết lập lịch học"
                icon={<EditCalendar />}
                disabled={query.isFetching || permissions.loading}
                onClick={() => setOpen(true)}
              />
            )}
          </Stack>
          <Feedback
            loading={permissions.loading || query.isLoading}
            error={permissions.error || query.error}
            retry={() => void (permissions.error ? permissions.retry() : query.refetch())}
          />
          {data && (
            <>
              <Typography variant="caption" color="text.secondary">
                {data.effectiveFrom
                  ? `Áp dụng từ ${displayDate(data.effectiveFrom)} · `
                  : ""}
                Múi giờ Việt Nam
              </Typography>
              {!data.occurrences.length ? (
                <Typography color="text.secondary">
                  Chưa có ngày học cụ thể trong 60 ngày tới. Theo dõi thông báo
                  của giảng viên.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)" },
                    gap: 1,
                  }}
                >
                  {data.occurrences.slice(0, 6).map((o) => (
                    <Typography key={o.date} variant="body2">
                      {displayDate(o.date)} ·{" "}
                      {o.startTime && o.endTime
                        ? `${o.startTime}–${o.endTime}`
                        : "Giờ sẽ được giảng viên thông báo"}
                    </Typography>
                  ))}
                </Box>
              )}
              {data.occurrences.length > 6 && (
                <Button size="small" onClick={() => setViewing(true)}>
                  Xem lịch đầy đủ
                </Button>
              )}
              {data.configuration.timeMode === "FLEXIBLE" && (
                <Typography variant="body2" color="text.secondary">
                  Phụ huynh theo dõi thông báo của giảng viên để biết giờ học.
                </Typography>
              )}
            </>
          )}
        </Stack>
      </Paper>
      {open && data && editable && (
        <ScheduleEditor
          classId={classId}
          data={data}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            onSaved?.();
          }}
        />
      )}
      {viewing && data && (
        <Dialog open onClose={() => setViewing(false)} fullWidth maxWidth="sm">
          <DialogTitle>Lịch học của lớp</DialogTitle>
          <DialogContent>
            <Stack spacing={1}>
              {data.occurrences.length ? (
                data.occurrences.map((o) => (
                  <Typography key={o.date}>
                    {displayDate(o.date)} ·{" "}
                    {o.startTime && o.endTime
                      ? `${o.startTime}–${o.endTime}`
                      : "Giờ thông báo sau"}
                  </Typography>
                ))
              ) : (
                <Typography>Chưa có ngày học cụ thể.</Typography>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button size="small" onClick={() => setViewing(false)}>
              Đóng
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
