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
import Rating from "@mui/material/Rating";
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
import Save from "@mui/icons-material/Save";
import EditNote from "@mui/icons-material/EditNote";
import PersonSearch from "@mui/icons-material/PersonSearch";
import Refresh from "@mui/icons-material/Refresh";
import DoneAll from "@mui/icons-material/DoneAll";
import {
  useClassRewardsQuery,
  useAddRewardMutation,
  useSaveRewardAttendanceMutation,
} from "@/api/rewards-api";
import { Feedback } from "@/shared/ui";
import { IconAction } from "@/shared/icon-action";
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
    requests = useRef<Record<string, { amount: number; key: string }>>({});
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
    if (!req || req.amount !== amount)
      req = requests.current[row.studentId] = {
        amount,
        key: crypto.randomUUID(),
      };
    setError(undefined);
    try {
      await award({
        classId,
        studentId: row.studentId,
        kind: "EARN",
        amount,
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
      <Dialog open onClose={close} fullWidth maxWidth="lg">
        <DialogTitle>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography component="span" variant="h5">
              {editable ? "Cộng điểm động viên" : "Điểm động viên của lớp"}
            </Typography>
            <IconAction
              label="Làm mới điểm"
              icon={<Refresh />}
              onClick={() => void query.refetch()}
              disabled={busy}
            />
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography color="text.secondary">
              {name} · {displayDate(date)}
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
              sx={{ maxWidth: 240 }}
            />
            <Alert severity="info" icon={false}>
              <Typography sx={{ fontWeight: 700 }}>
                {query.currentData?.closed
                  ? "Ngày học đã chốt"
                  : date === vietnamToday()
                    ? "Điểm thưởng hôm nay bắt đầu từ 0"
                    : "Điểm thưởng của ngày đang xem"}
              </Typography>
              <Typography variant="body2">
                Thanh trong ngày = điểm thưởng của bạn / điểm thưởng cao nhất
                của bạn có tham gia trong lớp. Không phải điểm học tập hay tỷ lệ
                hoàn thành khoá học.
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
                    minWidth: { xs: 0, md: editable ? 830 : 580 },
                    "& thead": {
                      display: { xs: "none", md: "table-header-group" },
                    },
                    "& tbody": {
                      display: { xs: "grid", md: "table-row-group" },
                      gap: 2,
                    },
                    "& tbody tr": {
                      display: { xs: "grid", md: "table-row" },
                      gridTemplateColumns: "1fr 1fr",
                      border: { xs: "1px solid", md: 0 },
                      borderColor: "divider",
                      borderRadius: 2,
                      p: { xs: 1, md: 0 },
                    },
                    "& tbody td": {
                      minWidth: { xs: "0 !important" },
                      borderBottom: { xs: 0 },
                      p: { xs: 1, md: 2 },
                    },
                    "& tbody td:first-of-type": { gridColumn: "1 / -1" },
                    "& tbody td:last-of-type": { gridColumn: "1 / -1" },
                    "& tbody td:nth-of-type(4)": { gridColumn: "1 / -1" },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Học sinh (biệt danh)</TableCell>
                      <TableCell>Đã nhận / Còn dùng</TableCell>
                      <TableCell>Trong ngày</TableCell>
                      {editable && (
                        <>
                          <TableCell>Điểm lần này</TableCell>
                          <TableCell>Thao tác</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {query.currentData.items.map((row) => (
                      <TableRow key={row.studentId}>
                        <TableCell sx={{ py: 2, minWidth: 200 }}>
                          <Typography sx={{ fontWeight: 700 }}>
                            {row.name}
                            {row.nickname ? ` (${row.nickname})` : ""}
                          </Typography>
                          {editable ? (
                            <TextField
                              size="small"
                              select
                              label="Tham gia"
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
                              sx={{ mt: 1, minWidth: 180 }}
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
                            sx={{ color: "#69ab85", fontWeight: 700 }}
                          >
                            {row.totals.earned} đã nhận
                          </Typography>
                          <Typography sx={{ color: "#a18aca" }}>
                            {row.totals.balance} còn dùng
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 160 }}>
                          <Typography variant="body2">
                            {row.attendance === "ABSENT"
                              ? attendanceLabels.ABSENT
                              : `${row.today.earned} điểm · ${row.todayProgress.toFixed(1)}%`}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={
                              row.attendance === "ABSENT"
                                ? 0
                                : row.todayProgress
                            }
                            sx={{ mt: 1, height: 6, borderRadius: 3 }}
                          />
                        </TableCell>
                        {editable && (
                          <>
                            <TableCell>
                              <Rating
                                name={`Cúp của ${row.nickname || row.name}`}
                                value={values[row.studentId] ?? 0}
                                max={5}
                                disabled={
                                  busy ||
                                  row.attendance === "ABSENT" ||
                                  date !== vietnamToday()
                                }
                                getLabelText={(v) => `${v} cúp`}
                                onChange={(_, v) =>
                                  setValues((old) => ({
                                    ...old,
                                    [row.studentId]: v ?? 0,
                                  }))
                                }
                                icon={<EmojiEvents fontSize="inherit" />}
                                emptyIcon={<EmojiEvents fontSize="inherit" />}
                                sx={{
                                  fontSize: 28,
                                  "& .MuiRating-iconEmpty": {
                                    color: "#c3a45a55",
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row">
                                <IconAction
                                  label="Lưu nhanh"
                                  icon={<Save />}
                                  disabled={
                                    busy ||
                                    !values[row.studentId] ||
                                    row.attendance === "ABSENT" ||
                                    date !== vietnamToday()
                                  }
                                  onClick={() => void quickSave(row)}
                                />
                                <IconAction
                                  label="Lưu kèm ghi chú"
                                  icon={<EditNote />}
                                  disabled={
                                    busy ||
                                    !values[row.studentId] ||
                                    row.attendance === "ABSENT" ||
                                    date !== vietnamToday()
                                  }
                                  onClick={() => setNoteRow(row)}
                                />
                                <IconAction
                                  label="Xem chi tiết tích thưởng"
                                  icon={<PersonSearch />}
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
                              icon={<PersonSearch />}
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
          <Button size="small" onClick={close} disabled={busy}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
      {noteRow && (
        <NoteDialog
          classId={classId}
          studentId={noteRow.studentId}
          name={noteRow.nickname || noteRow.name}
          kind="EARN"
          initialAmount={values[noteRow.studentId] ?? 1}
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
