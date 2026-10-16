"use client";
import { useState } from "react";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import LockOpenOutlined from "@mui/icons-material/LockOpenOutlined";
import ReplayOutlined from "@mui/icons-material/ReplayOutlined";
import {
  useSetSubmissionWindowMutation,
  useReopenSubmissionMutation,
} from "@/api/assignment-api";
import { errorMessage } from "@/api/base-query";
import type { Assignment, Submission } from "./models";

export function SubmissionWindow({ assignment }: { assignment: Assignment }) {
  const settings = assignment.submissionWindow;
  const allowLate = settings?.allowLate ?? assignment.allowLate;
  const deadline =
    settings?.deadline === undefined ? assignment.deadline : settings.deadline;
  const [minutes, setMinutes] = useState(
    settings?.lateWindowMinutes?.toString() ?? "",
  );
  const [confirm, setConfirm] = useState(false);
  const [save, state] = useSetSubmissionWindowMutation();
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState("");
  const valid =
    minutes === "" ||
    (Number.isSafeInteger(Number(minutes)) &&
      Number(minutes) > 0 &&
      Number(minutes) <= 2147483647);
  const enabled = assignment.canEdit && assignment.status === "PUBLISHED";
  async function persist(closed: boolean) {
    setError(undefined);
    setMessage("");
    try {
      await save({
        id: assignment.id,
        version: assignment.version,
        closed,
        lateWindowMinutes:
          allowLate && deadline && minutes !== "" ? Number(minutes) : null,
      }).unwrap();
      setConfirm(false);
      setMessage("Đã cập nhật nhận bài.");
    } catch (e) {
      setError(e);
    }
  }
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>
            Nhận bài tập ·{" "}
            {settings?.closed || settings?.open === false
              ? "Đã đóng"
              : "Đang mở"}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Lưu thời gian nhận bài">
              <span>
                <IconButton
                  aria-label="Lưu thời gian nhận bài"
                  size="small"
                  disabled={
                    !enabled ||
                    state.isLoading ||
                    !valid ||
                    minutes === (settings?.lateWindowMinutes?.toString() ?? "")
                  }
                  onClick={() => void persist(settings?.closed ?? false)}
                >
                  <SaveOutlined fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip
              title={
                settings?.closed ? "Mở nhận bài" : "Đóng nhận bài thủ công"
              }
            >
              <span>
                <IconButton
                  aria-label={
                    settings?.closed ? "Mở nhận bài" : "Đóng nhận bài thủ công"
                  }
                  size="small"
                  disabled={!enabled || state.isLoading || !valid}
                  onClick={() => setConfirm(true)}
                >
                  {settings?.closed ? (
                    <LockOpenOutlined fontSize="small" />
                  ) : (
                    <LockOutlined fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
        {allowLate && (
          <TextField
            size="small"
            type="number"
            label="Đóng sau hạn (phút)"
            value={minutes}
            disabled={!enabled || !deadline || state.isLoading}
            onChange={(e) => setMinutes(e.target.value)}
            error={!valid}
            slotProps={{ htmlInput: { min: 1, step: 1 } }}
            helperText="Để trống: không giới hạn nộp muộn."
            sx={{ maxWidth: 280 }}
          />
        )}
        <Typography variant="body2" color="text.secondary">
          {settings?.closesAt
            ? `Mốc đóng: ${new Date(settings.closesAt).toLocaleString("vi-VN")}`
            : "Chưa đặt mốc tự đóng."}
        </Typography>
        {message && <Alert severity="success">{message}</Alert>}
        {error != null && <Alert severity="error">{errorMessage(error)}</Alert>}
      </Stack>
      <Dialog
        open={confirm}
        onClose={() => !state.isLoading && setConfirm(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {settings?.closed ? "Mở nhận bài?" : "Đóng nhận bài?"}
        </DialogTitle>
        <DialogContent>
          {settings?.closed
            ? "Hệ thống vẫn áp dụng mốc tự đóng nếu đã hết thời gian. Có thể tăng hoặc bỏ giới hạn nộp muộn để tiếp tục nhận bài."
            : "Các học sinh chưa được mở lại riêng sẽ không thể sửa hoặc nộp bài. Giảng viên vẫn có thể mở lại cho từng học sinh."}
        </DialogContent>
        <DialogActions>
          <Button disabled={state.isLoading} onClick={() => setConfirm(false)}>
            Hủy
          </Button>
          <Button
            disabled={state.isLoading}
            onClick={() => void persist(!settings?.closed)}
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
export function ReopenSubmissionButton({
  assignment,
  submission,
  disabled = false,
  onReopened,
}: {
  assignment: Assignment;
  submission: Submission;
  disabled?: boolean;
  onReopened?: (s: Submission) => void;
}) {
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState("Giảng viên cho phép nộp lại"),
    [reopen, state] = useReopenSubmissionMutation(),
    [error, setError] = useState<unknown>();
  if (!assignment.canEdit) return null;
  return (
    <>
      <Tooltip
        title={
          submission.submittedAt
            ? "Mở lại để học sinh chỉnh sửa và nộp lại"
            : "Bài đang mở cho học sinh chỉnh sửa"
        }
      >
        <span>
          <IconButton
            aria-label="Mở lại bài nộp"
            size="small"
            disabled={disabled || !submission.submittedAt || state.isLoading}
            onClick={() => {
              setError(undefined);
              setOpen(true);
            }}
          >
            <ReplayOutlined fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Dialog
        open={open}
        onClose={() => !state.isLoading && setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Mở lại bài nộp ·{" "}
          {submission.studentNickname || submission.studentName}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography>
              Giữ nguyên câu trả lời để học sinh sửa. Lượt nộp và điểm cũ được
              lưu trong lịch sử; điểm hiện tại sẽ chờ chấm lại. Riêng học sinh
              này được nộp lại kể cả bài tập đã đóng. Nộp lại xong bài sẽ tự
              khóa.
            </Typography>
            <TextField
              size="small"
              label="Lý do"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
            {error != null && (
              <Alert severity="error">{errorMessage(error)}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={state.isLoading} onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button
            disabled={state.isLoading || !reason.trim()}
            onClick={async () => {
              try {
                const result = await reopen({
                  id: assignment.id,
                  submissionId: submission.id,
                  version: submission.version,
                  reason: reason.trim(),
                }).unwrap();
                onReopened?.(result);
                setOpen(false);
              } catch (e) {
                setError(e);
              }
            }}
          >
            Mở lại bài nộp
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
