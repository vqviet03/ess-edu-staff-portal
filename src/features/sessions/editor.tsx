"use client";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useCreateSessionMutation, useUpdateSessionMutation } from "@/api/api";
import { errorMessage } from "@/api/base-query";
import { sessionInput } from "@/utils/scores";
import { useUnsaved } from "@/shared/unsaved";
import type { Session } from "@/types";
export function SessionEditor({
  classId,
  totalUnits,
  session,
  close,
}: {
  classId: string;
  totalUnits: number;
  session?: Session;
  close: (saved?: boolean) => void;
}) {
  const [create, creating] = useCreateSessionMutation(),
    [update, updating] = useUpdateSessionMutation(),
    busy = creating.isLoading || updating.isLoading;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(sessionInput),
    defaultValues: {
      name: session?.name ?? "",
      unitNumber: session?.unitNumber ?? null,
      date: session?.date ?? new Date().toISOString().slice(0, 10),
      note: session?.note ?? "",
      status: session?.status ?? "DRAFT",
    },
  });
  useUnsaved(isDirty);
  const cancel = () => {
    if (!isDirty || window.confirm("Bỏ thay đổi phiên học?")) close();
  };
  return (
    <Dialog open onClose={cancel} fullWidth maxWidth="sm">
      <DialogTitle>
        {session ? "Chỉnh sửa phiên học" : "Tạo phiên học"}
      </DialogTitle>
      <form
        onSubmit={handleSubmit(async (value) => {
          try {
            if (session) await update({ ...session, ...value }).unwrap();
            else await create({ classId, session: value }).unwrap();
            reset(value);
            close(true);
          } catch {}
        })}
      >
        <DialogContent>
          <Stack
            sx={{
              ...{ pt: 1 },
              gap: 2,
            }}
          >
            {(creating.error || updating.error) && (
              <Alert severity="error">
                {errorMessage(creating.error || updating.error)}
                <Button onClick={() => location.reload()}>
                  Tải lại dữ liệu
                </Button>
              </Alert>
            )}
            <TextField
              label="Tên phiên học"
              placeholder="Ví dụ: Unit 3 · Luyện nói"
              {...register("name")}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            <Controller
              name="unitNumber"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Unit liên quan"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                >
                  <MenuItem value="">Không gắn Unit</MenuItem>
                  {Array.from({ length: totalUnits }, (_, i) => (
                    <MenuItem key={i} value={i + 1}>
                      Unit {i + 1}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Ngày học"
              type="date"
              {...register("date")}
              slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.date}
              helperText={errors.date?.message}
            />
            <TextField
              label="Ghi chú"
              multiline
              minRows={3}
              {...register("note")}
              error={!!errors.note}
              helperText={errors.note?.message}
            />
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Trạng thái phiên"
                  {...field}
                  disabled={!session}
                >
                  <MenuItem value="DRAFT">Nháp</MenuItem>
                  <MenuItem value="COMPLETED">Hoàn thành</MenuItem>
                </TextField>
              )}
            />
            <Alert severity="info">
              Tạo phiên không tăng tiến độ. Chỉ Unit có phiên hoàn thành mới
              được tính, mỗi Unit tính một lần.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancel} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" variant="contained" loading={busy}>
            {session ? "Lưu phiên" : "Tạo phiên"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
