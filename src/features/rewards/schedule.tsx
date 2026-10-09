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
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Add from "@mui/icons-material/Add";
import Close from "@mui/icons-material/Close";
import EditCalendar from "@mui/icons-material/EditCalendar";
import {
  useStudyScheduleQuery,
  useSaveStudyScheduleMutation,
} from "@/api/rewards-api";
import { Feedback } from "@/shared/ui";
import { RewardIconAction as IconAction, RewardIcon } from "./controls";
import {
  rewardButton,
  rewardDialog,
  rewardSurface,
  rewardTint,
} from "./design";
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
  className,
  data,
  onClose,
  onSaved,
}: {
  classId: string;
  className?: string;
  data: StudySchedule;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [plannedSessions, setPlannedSessions] = useState(
      String(data.plannedSessions || ""),
    ),
    [planStartDate, setPlanStartDate] = useState(
      data.planStartDate ?? vietnamToday(),
    );
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
  const validation =
    validateSchedule(config) ||
    (plannedSessions &&
    (!Number.isInteger(Number(plannedSessions)) ||
      Number(plannedSessions) < 1 ||
      Number(plannedSessions) > 10000)
      ? "Số buổi kế hoạch phải từ 1 đến 10000."
      : null);
  const submit = async () => {
    if (validation) return;
    setError(undefined);
    try {
      await save({
        classId,
        version,
        effectiveFrom,
        configuration: config,
        plannedSessions: plannedSessions ? Number(plannedSessions) : undefined,
        planStartDate: plannedSessions ? planStartDate : undefined,
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
    label = "Giờ học chung",
  ) => (
    <Box
      component="fieldset"
      sx={{
        m: 0,
        px: 1.5,
        pb: 1,
        pt: 0.5,
        minWidth: 0,
        width: "100%",
        border: "1px solid",
        borderColor: "text.secondary",
        borderRadius: "4px",
      }}
    >
      <Typography component="legend" sx={{ px: 0.5, fontSize: 12 }}>
        {label}
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", minHeight: 32 }}
      >
        <Box
          component="input"
          type="time"
          aria-label="Giờ bắt đầu"
          value={start ?? ""}
          onChange={(e) => change({ startTime: e.target.value })}
          sx={(theme) => ({
            border: 0,
            bgcolor: "transparent",
            color: "text.primary",
            font: "inherit",
            width: "45%",
            maxWidth: 150,
            minWidth: 0,
            colorScheme: theme.palette.mode,
          })}
        />
        <Typography aria-hidden>–</Typography>
        <Box
          component="input"
          type="time"
          aria-label="Giờ kết thúc"
          value={end ?? ""}
          onChange={(e) => change({ endTime: e.target.value })}
          sx={(theme) => ({
            border: 0,
            bgcolor: "transparent",
            color: "text.primary",
            font: "inherit",
            width: "45%",
            maxWidth: 150,
            minWidth: 0,
            colorScheme: theme.palette.mode,
          })}
        />
      </Stack>
    </Box>
  );
  const slotLabel = (s: ScheduleSlot) =>
    config.mode === "FLEXIBLE"
      ? displayDate(s.date ?? effectiveFrom)
      : config.cycle === "WEEKLY"
        ? s.day === 7
          ? "Chủ nhật"
          : `Thứ ${(s.day ?? 1) + 1}`
        : `Ngày ${s.day}`;
  const selectStyle = {
    alignSelf: "flex-start",
    width: "auto",
    bgcolor: rewardTint,
    color: "primary.main",
    borderRadius: "12px",
    "& .MuiSelect-select": {
      py: 1.25,
      pl: 2,
      pr: "36px !important",
      fontSize: 14,
    },
    "&:before, &:after": { display: "none" },
  };
  return (
    <Dialog
      open
      onClose={close}
      fullWidth
      maxWidth={false}
      slotProps={{ paper: { sx: rewardDialog(760) } }}
    >
      <DialogTitle>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}
        >
          <Typography component="span" sx={{ fontSize: 24, fontWeight: 700 }}>
            Thiết lập lịch học
          </Typography>
          <IconAction
            label="Đóng thiết lập lịch"
            icon={<Close fontSize="small" />}
            onClick={close}
            disabled={saving.isLoading}
          />
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {className ? `${className} · ` : ""}Áp dụng từ{" "}
            {displayDate(effectiveFrom)}
          </Typography>
          <Select
            variant="standard"
            value={config.mode}
            inputProps={{ "aria-label": "Loại lịch" }}
            sx={selectStyle}
            renderValue={(v) =>
              `Loại lịch: ${v === "FIXED" ? "Cố định" : "Linh động"}`
            }
            onChange={(e) =>
              update({
                mode: e.target.value as ScheduleConfig["mode"],
                slots: [],
              })
            }
          >
            <MenuItem value="FIXED">Lịch cố định</MenuItem>
            <MenuItem value="FLEXIBLE">Lịch linh động</MenuItem>
          </Select>
          {config.mode === "FIXED" && (
            <Select
              variant="standard"
              value={config.cycle}
              inputProps={{ "aria-label": "Chu kỳ" }}
              sx={selectStyle}
              renderValue={(v) =>
                `Chu kỳ: ${v === "WEEKLY" ? "Theo tuần" : "Theo tháng"}`
              }
              onChange={(e) =>
                update({
                  cycle: e.target.value as ScheduleConfig["cycle"],
                  slots: [],
                })
              }
            >
              <MenuItem value="WEEKLY">Theo tuần</MenuItem>
              <MenuItem value="MONTHLY">Theo tháng</MenuItem>
            </Select>
          )}
          {config.mode === "FIXED" && config.cycle === "WEEKLY" ? (
            <>
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
                sx={{
                  flexWrap: "wrap",
                  gap: 1,
                  "& .MuiToggleButtonGroup-grouped": {
                    border: 0,
                    m: 0,
                    borderRadius: "12px",
                    minWidth: 49,
                    minHeight: 40,
                    bgcolor: rewardTint,
                    color: "primary.main",
                    "&.Mui-selected": {
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                    },
                  },
                }}
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
              <Typography variant="caption" color="text.secondary">
                Đã chọn:{" "}
                {config.slots.length
                  ? [...config.slots]
                      .sort((a, b) => (a.day ?? 0) - (b.day ?? 0))
                      .map(slotLabel)
                      .join(", ")
                  : "Chưa chọn ngày học"}
              </Typography>
            </>
          ) : (
            <Stack spacing={2}>
              {config.mode === "FLEXIBLE" && (
                <Typography variant="body2">
                  Thêm từng ngày học cụ thể, không tự lặp theo tuần/tháng.
                </Typography>
              )}
              {config.slots.map((s, i) => (
                <Stack
                  key={i}
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    rowGap: 1.5,
                  }}
                >
                  <TextField
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
                    sx={{
                      width:
                        config.mode === "FIXED"
                          ? 180
                          : { xs: "calc(100% - 60px)", sm: 240 },
                      "& .MuiInputBase-root": { height: 56 },
                    }}
                  />
                  {config.mode === "FLEXIBLE" &&
                    config.timeMode !== "FLEXIBLE" && (
                      <Box
                        sx={{
                          flex: { xs: "1 1 100%", sm: "1 1 240px" },
                          order: { xs: 2, sm: 0 },
                        }}
                      >
                        {times(
                          config.timeMode === "SHARED"
                            ? config.startTime
                            : s.startTime,
                          config.timeMode === "SHARED"
                            ? config.endTime
                            : s.endTime,
                          config.timeMode === "SHARED"
                            ? update
                            : (p) => changeSlot(i, p),
                          "Giờ học",
                        )}
                      </Box>
                    )}
                  <IconAction
                    label={`Xoá ngày ${i + 1}`}
                    icon={<RewardIcon name="trash" />}
                    onClick={() =>
                      update({ slots: config.slots.filter((_, n) => n !== i) })
                    }
                  />
                </Stack>
              ))}
              <Button
                sx={{ ...rewardButton, alignSelf: "flex-start" }}
                aria-label="Thêm ngày học"
                startIcon={<Add />}
                onClick={() => update({ slots: [...config.slots, newSlot()] })}
              >
                {config.mode === "FIXED" ? "Thêm ngày" : "Thêm buổi học"}
              </Button>
              {config.cycle === "MONTHLY" && config.mode === "FIXED" && (
                <Typography variant="caption" color="text.secondary">
                  Ngày hợp lệ 1–31, không trùng. Tháng không có ngày đã chọn thì
                  bỏ buổi đó; không tự chuyển sang ngày khác.
                </Typography>
              )}
            </Stack>
          )}
          <Stack
            role="radiogroup"
            aria-label="Giờ học"
            spacing={1}
            sx={{ alignItems: "flex-start" }}
          >
            {(
              [
                ["SHARED", "Giờ áp dụng toàn bộ"],
                ["PER_DAY", "Giờ áp dụng từng ngày"],
                ["FLEXIBLE", "Giờ flexible"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                role="radio"
                aria-checked={config.timeMode === value}
                sx={{
                  ...rewardButton,
                  ...(config.timeMode === value
                    ? {
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        "&:hover": { bgcolor: "primary.dark" },
                      }
                    : {}),
                }}
                onClick={() =>
                  update({
                    timeMode: value,
                    startTime: config.startTime ?? "17:00",
                    endTime: config.endTime ?? "18:30",
                  })
                }
              >
                <Box component="span" aria-hidden sx={{ mr: 0.75 }}>
                  {config.timeMode === value ? "●" : "○"}
                </Box>
                {label}
              </Button>
            ))}
          </Stack>
          {config.mode === "FIXED" &&
            config.timeMode === "SHARED" &&
            times(config.startTime, config.endTime, update)}
          {config.mode === "FIXED" &&
            config.timeMode === "PER_DAY" &&
            config.slots.map((s, i) => (
              <Box key={i}>
                {times(
                  s.startTime,
                  s.endTime,
                  (p) => changeSlot(i, p),
                  slotLabel(s),
                )}
              </Box>
            ))}
          {config.timeMode === "FLEXIBLE" && (
            <Typography
              variant="body2"
              sx={{ bgcolor: rewardTint, p: 2, borderRadius: "12px" }}
            >
              Phụ huynh theo dõi thông báo của giảng viên để biết giờ học.
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Múi giờ: Việt Nam · Buổi có tham gia nhưng không nhận thưởng được
            chốt 0. Buổi vắng không tính điểm 0. Không tự tạo giao dịch khi ngày
            học đến.
          </Typography>
          <Box
            component="details"
            sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1.5 }}
          >
            <Typography
              component="summary"
              variant="body2"
              sx={{
                cursor: "pointer",
                color: "primary.main",
                fontWeight: 600,
                minHeight: 32,
              }}
            >
              Ngày áp dụng & kế hoạch buổi học
            </Typography>
            <Stack spacing={2} sx={{ pt: 1 }}>
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
                type="number"
                label="Tổng buổi kế hoạch ban đầu"
                value={plannedSessions}
                disabled={!!data.plannedSessions}
                onChange={(e) => {
                  setPlannedSessions(e.target.value);
                  setDirty(true);
                }}
                slotProps={{ htmlInput: { min: 1, max: 10000, step: 1 } }}
                helperText="Dùng tính cảnh báo vắng học, không phải số Unit. Giữ nguyên sau lần lưu đầu; học bổ sung không tăng mẫu số."
              />
              {plannedSessions && (
                <TextField
                  size="small"
                  type="date"
                  label="Ngày bắt đầu kế hoạch"
                  value={planStartDate}
                  disabled={!!data.plannedSessions}
                  onChange={(e) => {
                    setPlanStartDate(e.target.value);
                    setDirty(true);
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              )}
            </Stack>
          </Box>
          {validation && <Alert severity="warning">{validation}</Alert>}
          <Feedback error={error} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          size="small"
          sx={rewardButton}
          onClick={close}
          disabled={saving.isLoading}
        >
          Đóng
        </Button>
        <Button
          size="small"
          variant="contained"
          sx={{ minHeight: 40, borderRadius: "12px", px: 2 }}
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
  className,
  onSaved,
}: {
  classId: string;
  className?: string;
  onSaved?: () => void;
}) {
  const permissions = useClassCapabilities(classId),
    editable = permissions.editSchedule,
    query = useStudyScheduleQuery(classId, {
      skip: !classId || !permissions.viewLearning,
    }),
    [open, setOpen] = useState(false),
    [viewing, setViewing] = useState(false);
  const data = query.currentData;
  return (
    <>
      <Paper sx={rewardSurface}>
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography variant="h6" sx={{ fontSize: 18 }}>
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
            retry={() =>
              void (permissions.error ? permissions.retry() : query.refetch())
            }
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
                  {data.occurrences.slice(0, 1).map((o) => (
                    <Typography key={o.date} variant="body2">
                      {displayDate(o.date)} ·{" "}
                      {o.startTime && o.endTime
                        ? `${o.startTime}–${o.endTime}`
                        : "Giờ sẽ được giảng viên thông báo"}
                    </Typography>
                  ))}
                </Box>
              )}
              {data.occurrences.length > 0 && (
                <Button
                  size="small"
                  sx={{ ...rewardButton, alignSelf: "flex-start" }}
                  onClick={() => setViewing(true)}
                >
                  Xem lịch học
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
          className={className}
          data={data}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            onSaved?.();
          }}
        />
      )}
      {viewing && data && (
        <Dialog
          open
          onClose={() => setViewing(false)}
          fullWidth
          maxWidth={false}
          slotProps={{ paper: { sx: rewardDialog(760) } }}
        >
          <DialogTitle>
            <Typography component="span" sx={{ fontSize: 24, fontWeight: 700 }}>
              Lịch học của lớp
            </Typography>
          </DialogTitle>
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
            <Button
              size="small"
              sx={rewardButton}
              onClick={() => setViewing(false)}
            >
              Đóng
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
