"use client";
import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Rating from "@mui/material/Rating";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import EmojiEvents from "@mui/icons-material/EmojiEvents";
import {
  useAddRewardMutation,
  useReverseRewardMutation,
} from "@/api/rewards-api";
import { Feedback } from "@/shared/ui";
import { useUnsaved } from "@/shared/unsaved";
import { kindLabels, type RewardKind, type RewardEntry } from "./models";
export function RewardMutationDialog({
  classId,
  studentId,
  name,
  kind,
  reverse,
  initialAmount = 1,
  onClose,
  onSaved,
}: {
  classId: string;
  studentId: string;
  name: string;
  kind: RewardKind;
  reverse?: RewardEntry;
  initialAmount?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(initialAmount),
    [note, setNote] = useState(""),
    [changed, setChanged] = useState(false),
    [error, setError] = useState<unknown>(),
    request = useRef<{ payload: string; key: string } | null>(null);
  const [add, adding] = useAddRewardMutation(),
    [undo, undoing] = useReverseRewardMutation(),
    busy = adding.isLoading || undoing.isLoading;
  useUnsaved(changed);
  const max = kind === "EARN" ? 5 : 100000,
    valid =
      (reverse || (Number.isInteger(amount) && amount >= 1 && amount <= max)) &&
      !!note.trim() &&
      note.trim().length <= 2000;
  const close = () => {
    if (!busy && (!changed || window.confirm("Bỏ nội dung chưa lưu?")))
      onClose();
  };
  const save = async () => {
    if (!valid || busy) return;
    setError(undefined);
    const payload = JSON.stringify({
      amount,
      note: note.trim(),
      entry: reverse?.id,
      kind,
      classId,
      studentId,
    });
    if (request.current?.payload !== payload)
      request.current = { payload, key: crypto.randomUUID() };
    try {
      if (reverse)
        await undo({
          classId,
          studentId,
          entryId: reverse.id,
          note: note.trim(),
          key: request.current.key,
        }).unwrap();
      else
        await add({
          classId,
          studentId,
          kind,
          amount,
          note: note.trim(),
          key: request.current.key,
        }).unwrap();
      setChanged(false);
      onSaved();
    } catch (e) {
      setError(e);
    }
  };
  return (
    <Dialog open onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>
        {reverse
          ? "Điều chỉnh giao dịch"
          : kind === "EARN"
            ? "Ghi nhận thành tích"
            : kind === "PENALTY"
              ? "Ghi nhận vi phạm"
              : "Ghi nhận sử dụng điểm"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>{name}</Typography>
          {reverse ? (
            <Alert severity="warning">
              Đảo {reverse.amount} điểm · {kindLabels[reverse.kind]}. Giữ giao
              dịch gốc và ghi thêm lượt điều chỉnh, không xoá lịch sử.
            </Alert>
          ) : kind === "EARN" ? (
            <Rating
              name="Điểm lần này"
              value={amount}
              max={5}
              icon={<EmojiEvents fontSize="inherit" />}
              emptyIcon={<EmojiEvents fontSize="inherit" />}
              getLabelText={(v) => `${v} cúp`}
              onChange={(_, v) => {
                setAmount(v ?? 0);
                setChanged(true);
              }}
              sx={{ fontSize: 32 }}
            />
          ) : (
            <TextField
              size="small"
              type="number"
              label="Số điểm"
              value={amount}
              onChange={(e) => {
                setAmount(Number(e.target.value));
                setChanged(true);
              }}
              error={!Number.isInteger(amount) || amount < 1 || amount > max}
              helperText="Số nguyên dương, tối đa 100000"
              slotProps={{ htmlInput: { min: 1, max, step: 1 } }}
            />
          )}
          <TextField
            autoFocus
            size="small"
            label={kind === "EARN" ? "Ghi chú thành tích" : "Lý do / nội dung"}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setChanged(true);
            }}
            multiline
            minRows={3}
            required
            helperText={`${note.length}/2000`}
            error={note.length > 2000}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />
          <Feedback error={error} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button size="small" onClick={close} disabled={busy}>
          Đóng
        </Button>
        <Button
          size="small"
          variant="contained"
          disabled={!valid || busy}
          onClick={() => void save()}
        >
          {busy ? "Đang lưu…" : "Lưu"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
