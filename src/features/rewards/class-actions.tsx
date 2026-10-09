"use client";
import { useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import EmojiEvents from "@mui/icons-material/EmojiEvents";
import Close from "@mui/icons-material/Close";
import Refresh from "@mui/icons-material/Refresh";
import DoneAll from "@mui/icons-material/DoneAll";
import {
  useClassRewardsQuery,
  useAddRewardMutation,
  useSaveRewardAttendanceMutation,
} from "@/api/rewards-api";
import { Feedback } from "@/shared/ui";
import {
  RewardIconAction as IconAction,
  RewardIcon,
  TrophyRating,
} from "./controls";
import { rewardButton, rewardDialog, rewardTint } from "./design";
import { useUnsaved } from "@/shared/unsaved";
import {
  attendanceLabels,
  displayDate,
  vietnamToday,
  type Attendance,
  type RewardRow,
} from "./models";
import { StudySchedulePanel } from "./schedule";
const NoteDialog = dynamic(() =>
  import("./mutation-dialog").then((m) => m.RewardMutationDialog),
);
function AwardDialog({
  classId,
  name,
  editable,
  onClose,
}: {
  classId: string;
  name: string;
  editable: boolean;
  onClose: () => void;
}) {
  const router = useRouter(),
    [date, setDate] = useState(vietnamToday()),
    query = useClassRewardsQuery({ classId, date }),
    [values, setValues] = useState<Record<string, number>>({}),
    [noteRow, setNoteRow] = useState<RewardRow | null>(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState<unknown>();
  const [award, awarding] = useAddRewardMutation(),
    [attendance, attending] = useSaveRewardAttendanceMutation(),
    requests = useRef<
      Record<string, { amount: number; date: string; key: string }>
    >({});
  const dirty = Object.values(values).some((v) => v > 0),
    busy = awarding.isLoading || attending.isLoading;
  useUnsaved(dirty);
  const close = () => {
    if (!busy && (!dirty || window.confirm("Bỏ các ô cúp chưa lưu?")))
      onClose();
  };
  const quickSave = async (row: RewardRow) => {
    const amount = values[row.studentId] ?? 0;
    if (!amount || busy) return;
    let req = requests.current[row.studentId];
    if (!req || req.amount !== amount || req.date !== date)
      req = requests.current[row.studentId] = {
        amount,
        date,
        key: crypto.randomUUID(),
      };
    setError(undefined);
    try {
      await award({
        classId,
        studentId: row.studentId,
        kind: "EARN",
        amount,
        date,
        key: req.key,
      }).unwrap();
      delete requests.current[row.studentId];
      setValues((v) => ({ ...v, [row.studentId]: 0 }));
      setMessage("Đã ghi nhận thành tích.");
    } catch (e) {
      setError(e);
    }
  };
  const saveAttendance = async (
    rows: { studentId: string; status: Attendance }[],
    close = false,
  ) => {
    if (!query.currentData || busy) return;
    setError(undefined);
    try {
      await attendance({
        classId,
        date,
        version: query.currentData.dayVersion,
        close,
        rows,
      }).unwrap();
      setMessage(close ? "Đã chốt ngày học." : "Đã cập nhật điểm danh.");
    } catch (e) {
      setError(e);
    }
  };
  return (
    <>
      <Dialog
        open
        onClose={close}
        fullWidth
        maxWidth={false}
        slotProps={{ paper: { sx: rewardDialog(1180) } }}
      >
        <DialogTitle>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography component="span" variant="h5" sx={{ fontSize: 24 }}>
              {editable ? "Cộng điểm động viên" : "Điểm động viên của lớp"}
            </Typography>
            <Stack direction="row" spacing={1}>
              <IconAction
                label="Làm mới điểm"
                icon={<Refresh />}
                onClick={() => void query.refetch()}
                disabled={busy}
              />
              <IconAction
                label="Đóng điểm động viên"
                icon={<Close fontSize="small" />}
                onClick={close}
                disabled={busy}
              />
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{
                alignItems: { sm: "center" },
                justifyContent: "space-between",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {name} · {date === vietnamToday() ? "Hôm nay, " : ""}
                {displayDate(date)}
              </Typography>
              <TextField
                size="small"
                label="Ngày học"
                type="date"
                value={date}
                onChange={(e) => {
                  if (!dirty || window.confirm("Bỏ các ô cúp chưa lưu?")) {
                    setValues({});
                    setDate(e.target.value);
                  }
                }}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: vietnamToday() },
                }}
                sx={{ maxWidth: 200 }}
              />
            </Stack>
            <Alert
              severity="success"
              icon={false}
              sx={{
                bgcolor: rewardTint,
                color: "text.primary",
                border: "1px solid",
                borderColor: "divider",
                p: 2,
                borderRadius: "16px",
                "& .MuiAlert-message": { p: 0 },
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>
                {query.currentData?.closed
                  ? "Ngày học đã chốt"
                  : date === vietnamToday()
                    ? (query.currentData?.highestToday ?? 0) === 0
                      ? "Ngày mới · Tất cả điểm hôm nay bắt đầu từ 0"
                      : "Điểm động viên hôm nay"
                    : "Điểm thưởng của ngày đang xem"}
              </Typography>
              <Typography variant="body2">
                Thanh hôm nay so với bạn nhận nhiều điểm nhất lớp trong ngày.
                Không phải điểm số học tập hay tiến độ khoá học.
              </Typography>
            </Alert>
            <Feedback
              loading={
                query.isLoading || (query.isFetching && !query.currentData)
              }
              error={query.error || error}
              retry={() => void query.refetch()}
            />
            {query.currentData && (
              <TableContainer>
                <Table
                  size="small"
                  sx={{
                    minWidth: { xs: 0, md: editable ? 990 : 680 },
                    "& thead": {
                      display: { xs: "none", md: "table-header-group" },
                    },
                    "& th": {
                      bgcolor: "transparent",
                      fontSize: 13,
                      border: 0,
                      px: 1.5,
                      py: 1,
                      color: "text.secondary",
                    },
                    "& tbody": {
                      display: { xs: "grid", md: "table-row-group" },
                      gap: 3,
                    },
                    "& tbody tr": {
                      display: { xs: "grid", md: "table-row" },
                      gridTemplateColumns: "1fr",
                      border: { xs: "1px solid", md: 0 },
                      borderColor: { xs: "divider", md: "divider" },
                      borderRadius: "16px",
                      p: { xs: 2, md: 0 },
                      gap: 1,
                    },
                    "& tbody td": {
                      minWidth: { xs: "0 !important" },
                      border: 0,
                      p: { xs: 0, md: 1.5 },
                    },
                    "& tbody td:first-of-type": { gridColumn: "1 / -1" },
                    "& tbody td:nth-of-type(2)": {
                      display: { xs: "none", md: "table-cell" },
                    },
                    "& tbody td:nth-of-type(3)": { gridColumn: "1 / -1" },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Học sinh (biệt danh)</TableCell>
                      <TableCell>Đã nhận / Còn dùng</TableCell>
                      <TableCell>Hôm nay</TableCell>
                      {editable && (
                        <>
                          <TableCell>Điểm lần này</TableCell>
                        </>
                      )}
                      <TableCell>Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {query.currentData.items.map((row) => (
                      <TableRow key={row.studentId}>
                        <TableCell sx={{ py: 2, minWidth: 200 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                            {row.name}
                            {row.nickname ? ` (${row.nickname})` : ""}
                          </Typography>
                          <Typography
                            sx={{
                              display: { xs: "block", md: "none" },
                              fontWeight: 700,
                              fontSize: 15,
                              color: "#69ab85",
                              mt: 0.5,
                            }}
                          >
                            {row.totals.earned} đã nhận ·{" "}
                            <Box
                              component="span"
                              sx={{ color: "#a18aca", fontSize: 12 }}
                            >
                              {row.totals.balance} còn dùng
                            </Box>
                          </Typography>
                          {editable ? (
                            <TextField
                              size="small"
                              select
                              label="Tham gia"
                              variant="standard"
                              value={row.attendance}
                              disabled={busy}
                              onChange={(e) => {
                                const status = e.target.value as Attendance;
                                if (
                                  status === "ABSENT" &&
                                  row.today.earned > 0 &&
                                  !window.confirm(
                                    "Bạn đã có điểm trong ngày. Báo vắng sẽ bỏ mốc biểu đồ ngày này; lịch sử điểm được giữ. Tiếp tục?",
                                  )
                                )
                                  return;
                                void saveAttendance([
                                  { studentId: row.studentId, status },
                                ]);
                              }}
                              sx={{
                                mt: 0.5,
                                minWidth: 120,
                                width: "auto",
                                "& .MuiInputLabel-root": { display: "none" },
                                "& .MuiInput-root": {
                                  mt: "0 !important",
                                  fontSize: 12,
                                  color: "text.secondary",
                                  "&:before, &:after": { display: "none" },
                                },
                                "& .MuiSelect-select": { py: 0.5 },
                              }}
                            >
                              {Object.entries(attendanceLabels).map(
                                ([value, label]) => (
                                  <MenuItem key={value} value={value}>
                                    {label}
                                  </MenuItem>
                                ),
                              )}
                            </TextField>
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {attendanceLabels[row.attendance]}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography
                            sx={{
                              color: "#69ab85",
                              fontWeight: 700,
                              fontSize: 16,
                            }}
                          >
                            {row.totals.earned} đã nhận
                          </Typography>
                          <Typography sx={{ color: "#a18aca", fontSize: 12 }}>
                            {row.totals.balance} còn dùng
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 160 }}>
                          <Typography variant="body2">
                            {row.attendance === "ABSENT"
                              ? attendanceLabels.ABSENT
                              : `${row.today.earned} điểm hôm nay`}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={
                              row.attendance === "ABSENT"
                                ? 0
                                : row.todayProgress
                            }
                            sx={{
                              mt: 1,
                              height: 8,
                              borderRadius: "4px",
                              bgcolor: "divider",
                              "& .MuiLinearProgress-bar": {
                                bgcolor: "#69ab85",
                                borderRadius: "4px",
                              },
                            }}
                          />
                        </TableCell>
                        {editable && (
                          <>
                            <TableCell>
                              <TrophyRating
                                name={`Cúp của ${row.nickname || row.name}`}
                                value={values[row.studentId] ?? 0}
                                max={5}
                                disabled={
                                  busy ||
                                  row.attendance === "ABSENT" ||
                                  (date < vietnamToday() &&
                                    row.attendance !== "PRESENT")
                                }
                                getLabelText={(v) => `${v} cúp`}
                                onChange={(_, v) =>
                                  setValues((old) => ({
                                    ...old,
                                    [row.studentId]: v ?? 0,
                                  }))
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1}>
                                <IconAction
                                  label="Lưu nhanh"
                                  icon={<RewardIcon name="save" />}
                                  disabled={
                                    busy ||
                                    !values[row.studentId] ||
                                    row.attendance === "ABSENT" ||
                                    (date < vietnamToday() &&
                                      row.attendance !== "PRESENT")
                                  }
                                  onClick={() => void quickSave(row)}
                                />
                                <IconAction
                                  label="Lưu kèm ghi chú"
                                  icon={<RewardIcon name="note" />}
                                  disabled={
                                    busy ||
                                    !values[row.studentId] ||
                                    row.attendance === "ABSENT" ||
                                    (date < vietnamToday() &&
                                      row.attendance !== "PRESENT")
                                  }
                                  onClick={() => setNoteRow(row)}
                                />
                                <IconAction
                                  label="Xem chi tiết tích thưởng"
                                  icon={<RewardIcon name="detail" />}
                                  onClick={() => {
                                    if (
                                      !dirty ||
                                      window.confirm("Bỏ các ô cúp chưa lưu?")
                                    ) {
                                      setValues({});
                                      onClose();
                                      router.push(
                                        `/student/?classId=${encodeURIComponent(classId)}&studentId=${encodeURIComponent(row.studentId)}&tab=rewards`,
                                      );
                                    }
                                  }}
                                />
                              </Stack>
                            </TableCell>
                          </>
                        )}
                        {!editable && (
                          <TableCell>
                            <IconAction
                              label="Xem chi tiết tích thưởng"
                              icon={<RewardIcon name="detail" />}
                              onClick={() =>
                                router.push(
                                  `/student/?classId=${encodeURIComponent(classId)}&studentId=${encodeURIComponent(row.studentId)}&tab=rewards`,
                                )
                              }
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {query.currentData && !query.currentData.items.length && (
              <Feedback empty="Lớp chưa có học sinh đang học." />
            )}
            <Typography variant="caption" color="text.secondary">
              Mỗi lần chọn 1–5 cúp = 1–5 điểm. Lưu xong ô cúp về 0; không giới
              hạn số lần hợp lệ trong ngày. Chốt ngày sau khi xác nhận tham
              gia/vắng của tất cả học sinh: có tham gia không nhận thưởng được
              tính 0; vắng/chưa xác nhận không tạo mốc 0.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            size="small"
            sx={rewardButton}
            onClick={close}
            disabled={busy}
          >
            Đóng
          </Button>
          {editable && (
            <Button
              size="small"
              startIcon={<DoneAll />}
              disabled={busy || !query.currentData?.items.length}
              onClick={() => void saveAttendance([], true)}
            >
              Chốt ngày
            </Button>
          )}
        </DialogActions>
      </Dialog>
      {noteRow && (
        <NoteDialog
          classId={classId}
          studentId={noteRow.studentId}
          name={`${noteRow.name}${noteRow.nickname ? ` (${noteRow.nickname})` : ""}`}
          className={name}
          kind="EARN"
          initialAmount={values[noteRow.studentId] ?? 1}
          initialDate={date}
          onClose={() => setNoteRow(null)}
          onSaved={() => {
            setValues((v) => ({ ...v, [noteRow.studentId]: 0 }));
            setNoteRow(null);
            setMessage("Đã lưu thành tích và ghi chú.");
          }}
        />
      )}
      <Snackbar
        open={!!message}
        message={message}
        autoHideDuration={3500}
        onClose={() => setMessage("")}
      />
    </>
  );
}
export function ClassRewardActions({
  classId,
  name,
  editable = false,
}: {
  classId: string;
  name: string;
  editable?: boolean;
}) {
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get("tab") === "rewards"),
    [message, setMessage] = useState("");
  return (
    <Box sx={{ mb: 2.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <IconAction
          label={editable ? "Cộng điểm động viên" : "Xem điểm động viên"}
          icon={<EmojiEvents />}
          onClick={() => setOpen(true)}
        />
        <Typography variant="body2">Điểm động viên theo lớp</Typography>
      </Stack>
      <StudySchedulePanel
        classId={classId}
        className={name}
        onSaved={() => setMessage("Đã lưu lịch học.")}
      />
      {open && (
        <AwardDialog
          classId={classId}
          name={name}
          editable={editable}
          onClose={() => setOpen(false)}
        />
      )}
      <Snackbar
        open={!!message}
        message={message}
        autoHideDuration={3500}
        onClose={() => setMessage("")}
      />
    </Box>
  );
}
