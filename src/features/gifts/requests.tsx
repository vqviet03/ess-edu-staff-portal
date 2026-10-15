"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  useGiftOptionsQuery,
  useGiftRecipientsQuery,
  useDeliverGiftMutation,
} from "@/api/gifts-api";
import { useWorkspace } from "@/features/access/hooks";
import { Feedback } from "@/shared/ui";
import { GiftCatalogView } from "./catalog";
import { GiftHistory, GiftImage } from "./shared";
import { giftStyles, type Redemption } from "./models";
export function GiftRequests() {
  const params = useSearchParams();
  const options = useGiftOptionsQuery(),
    [classId, setClass] = useState(params.get("classId") ?? ""),
    [selected, setSelected] = useState<Redemption | null>(null),
    [deliver, state] = useDeliverGiftMutation();
  return (
    <Stack spacing={2.5}>
      <div>
        <Typography component="h1" sx={giftStyles.title}>
          Yêu cầu giao quà
        </Typography>
        <Typography color="text.secondary">
          Theo dõi và xác nhận quà đã giao cho học sinh.
        </Typography>
      </div>
      <TextField
        select
        label="Lớp học"
        value={classId}
        onChange={(e) => setClass(e.target.value)}
        sx={{ maxWidth: 320 }}
      >
        <MenuItem value="">Tất cả lớp</MenuItem>
        {options.data?.classes.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>
      <Feedback error={state.error} />
      <GiftHistory
        key={classId}
        classId={classId || undefined}
        staff
        onDeliver={setSelected}
      />
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Xác nhận giao đủ quà?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography
              sx={{
                fontWeight: 700,
              }}
            >
              {selected?.nickname || selected?.studentName} ·{" "}
              {selected?.studentCode}
            </Typography>
            {selected?.items.map((i) => (
              <Stack
                key={i.giftId}
                direction="row"
                sx={{
                  gap: 1.5,
                  alignItems: "center",
                }}
              >
                <GiftImage id={i.fileId} deleted={i.deleted} />
                <Typography>
                  {i.name} × {i.quantity}
                </Typography>
              </Stack>
            ))}
            <Alert severity="info">
              Không trừ điểm thêm khi xác nhận giao.
            </Alert>
            <Feedback error={state.error} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Hủy</Button>
          <Button
            variant="contained"
            disabled={state.isLoading}
            onClick={() => {
              if (selected)
                void deliver(selected)
                  .unwrap()
                  .then(() => setSelected(null))
                  .catch(() => {});
            }}
          >
            Đã giao đủ
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
export function GiftProxy() {
  const params = useSearchParams();
  const workspace = useWorkspace(),
    options = useGiftOptionsQuery(),
    [selectedClass, setClass] = useState(""),
    classId =
      selectedClass ||
      options.data?.classes.find(
        (c) =>
          c.id === params.get("classKey") ||
          c.publicId === params.get("classKey"),
      )?.id ||
      "",
    [student, setStudent] = useState(""),
    recipients = useGiftRecipientsQuery(classId, {
      skip: !classId || workspace.selected !== "teacher",
    });
  return (
    <Stack spacing={2.5}>
      <div>
        <Typography component="h1" sx={giftStyles.title}>
          Đổi quà hộ học sinh
        </Typography>
        <Typography color="text.secondary">
          Chọn lớp đang phụ trách và đúng người nhận trước khi thêm quà.
        </Typography>
      </div>
      {workspace.selected !== "teacher" ? (
        <Alert severity="info">
          Chuyển sang vai trò Giảng viên để đổi hộ trong lớp đang phụ trách.
        </Alert>
      ) : (
        <>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            sx={{
              gap: 2,
            }}
          >
            <TextField
              select
              label="Lớp học"
              value={classId}
              onChange={(e) => {
                setClass(e.target.value);
                setStudent("");
              }}
              sx={{ maxWidth: 320, width: "100%" }}
            >
              {options.data?.classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Học sinh nhận quà"
              value={student}
              onChange={(e) => setStudent(e.target.value)}
              disabled={!classId}
              sx={{ maxWidth: 400, width: "100%" }}
            >
              {recipients.data?.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                  {s.nickname ? ` (${s.nickname})` : ""} · {s.code}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Feedback loading={recipients.isLoading} error={recipients.error} />
          {classId && student && (
            <GiftCatalogView
              key={`${classId}:${student}`}
              classId={classId}
              studentId={student}
              student={false}
            />
          )}
        </>
      )}
    </Stack>
  );
}
