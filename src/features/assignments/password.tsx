"use client";
import { AssignmentSurface } from "./surface";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useChangePasswordMutation } from "@/api/assignment-api";
import { useAppDispatch } from "@/store";
import { signedOut } from "@/store/auth";
import { api } from "@/api/api";
import { errorMessage } from "@/api/base-query";
import { useUnsaved } from "@/shared/unsaved";
export function ChangePassword() {
  const [values, setValues] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }),
    [visible, setVisible] = useState<Record<string, boolean>>({}),
    [error, setError] = useState<unknown>(),
    [saved, setSaved] = useState(false),
    [change, state] = useChangePasswordMutation(),
    dispatch = useAppDispatch(),
    router = useRouter();
  const dirty = Object.values(values).some(Boolean);
  useUnsaved(dirty && !saved);
  const mismatch =
    !!values.confirmPassword && values.confirmPassword !== values.newPassword;
  return (
    <AssignmentSurface>
      <Paper
        variant="outlined"
        component="form"
        sx={{ p: { xs: 2, md: 3 }, borderRadius: "16px" }}
        onSubmit={async (e) => {
          e.preventDefault();
          setError(undefined);
          try {
            await change(values).unwrap();
            setSaved(true);
            setValues({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
            dispatch(signedOut());
            dispatch(api.util.resetApiState());
            router.replace("/login/?passwordChanged=true");
          } catch (err) {
            setError(err);
          }
        }}
      >
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Đổi mật khẩu
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Dùng mật khẩu hiện tại để xác nhận. Sau khi đổi thành công, đăng
            nhập lại bằng mật khẩu mới.
          </Typography>
          {(["currentPassword", "newPassword", "confirmPassword"] as const).map(
            (key, i) => (
              <TextField
                key={key}
                size="small"
                required
                fullWidth
                type={visible[key] ? "text" : "password"}
                autoComplete={i ? "new-password" : "current-password"}
                label={
                  ["Mật khẩu cũ", "Mật khẩu mới", "Xác nhận mật khẩu mới"][i]
                }
                value={values[key]}
                error={i === 2 && mismatch}
                helperText={
                  i === 1
                    ? "Ít nhất 10 ký tự, tối đa 72 byte."
                    : i === 2 && mismatch
                      ? "Mật khẩu xác nhận chưa khớp."
                      : undefined
                }
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value }))
                }
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={`${visible[key] ? "Ẩn" : "Hiện"} ${["mật khẩu cũ", "mật khẩu mới", "mật khẩu xác nhận"][i]}`}
                          onClick={() =>
                            setVisible((v) => ({ ...v, [key]: !v[key] }))
                          }
                          edge="end"
                        >
                          {visible[key] ? (
                            <VisibilityOff fontSize="small" />
                          ) : (
                            <Visibility fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            ),
          )}
          {error != null && (
            <Alert severity="error">{errorMessage(error)}</Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            Đổi mật khẩu sẽ đăng xuất các phiên khác để bảo vệ tài khoản.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              disabled={state.isLoading}
              onClick={() =>
                setValues({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                })
              }
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                state.isLoading ||
                mismatch ||
                !values.currentPassword ||
                values.newPassword.length < 10 ||
                !values.confirmPassword
              }
            >
              {state.isLoading ? "Đang cập nhật…" : "Đổi mật khẩu"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </AssignmentSurface>
  );
}
