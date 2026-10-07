"use client";
import { publicId } from "@/shared/public-id";
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
import { useUpdateStudentMutation } from "@/api/api";
import { errorMessage } from "@/api/base-query";
import { studentInput } from "@/utils/scores";
import { useUnsaved } from "@/shared/unsaved";
import type { Student } from "@/types";
export function StudentEditor({
  student,
  classId,
  close,
}: {
  student: Student;
  classId: string;
  close: (saved?: boolean) => void;
}) {
  const [save, { isLoading, error }] = useUpdateStudentMutation();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(studentInput),
    defaultValues: {
      name: student.name,
      nickname: student.nickname,
      dateOfBirth: student.dateOfBirth ?? "",
      status: student.status,
    },
  });
  useUnsaved(isDirty);
  const cancel = () => {
    if (!isDirty || window.confirm("Bỏ thay đổi thông tin học sinh?")) close();
  };
  return (
    <Dialog open onClose={cancel} fullWidth maxWidth="sm">
      <DialogTitle>Chỉnh sửa học sinh · {publicId(student.publicId, student.studentCode, student.id)}</DialogTitle>
      <form
        onSubmit={handleSubmit(async (values) => {
          try {
            await save({
              classId,
              student: {
                ...student,
                ...values,
                dateOfBirth: values.dateOfBirth || null,
              },
            }).unwrap();
            reset(values);
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
            {error && (
              <Alert severity="error">
                {errorMessage(error)}
                <Button onClick={() => location.reload()}>
                  Tải lại dữ liệu
                </Button>
              </Alert>
            )}
            <TextField
              label="Họ và tên"
              {...register("name")}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            <TextField
              label="Biệt danh"
              {...register("nickname")}
              error={!!errors.nickname}
              helperText={errors.nickname?.message}
            />
            <TextField
              label="Ngày sinh"
              type="date"
              {...register("dateOfBirth")}
              slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.dateOfBirth}
              helperText={errors.dateOfBirth?.message}
            />
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField disabled select label="Trạng thái" helperText="Thay đổi trạng thái tại Quản lý với preview ảnh hưởng" {...field}>
                  <MenuItem value="ACTIVE">Đang học</MenuItem>
                  <MenuItem value="INACTIVE">Ngừng học</MenuItem>
                </TextField>
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancel} disabled={isLoading}>
            Hủy
          </Button>
          <Button type="submit" variant="contained" loading={isLoading}>
            Lưu học sinh
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
