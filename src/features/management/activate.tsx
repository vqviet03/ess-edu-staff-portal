"use client";
import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useActivateAccountMutation } from "@/api/management-api";
import { errorMessage } from "@/api/base-query";
import { Card, NavButton, Shell, Title } from "@/shared/ui";
export function ActivateAccount() {
  const initialized = useRef(false),
    [code, setCode] = useState(""),
    [ready, setReady] = useState(false),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [saved, setSaved] = useState(false),
    [activate, state] = useActivateAccountMutation();
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setCode(new URLSearchParams(location.hash.slice(1)).get("code") ?? "");
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search,
      );
      setReady(true);
    }
  }, []);
  return (
    <Shell>
      <Stack spacing={2} sx={{ maxWidth: 500, mx: "auto" }}>
        <Title title="Kích hoạt / đặt lại mật khẩu" />
        {saved ? (
          <Alert severity="success">
            Đã đặt mật khẩu. Staff có thể đăng nhập tại đây; học sinh dùng cổng
            học sinh.
          </Alert>
        ) : (
          <Card>
            {ready && !code ? (
              <Alert severity="error">
                Thiếu mã kích hoạt. Yêu cầu quản lý cấp link mới.
              </Alert>
            ) : (
              <Stack
                component="form"
                spacing={2}
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await activate({ code, password }).unwrap();
                    setCode("");
                    setPassword("");
                    setConfirm("");
                    setSaved(true);
                  } catch {}
                }}
              >
                {state.error && (
                  <Alert severity="error">{errorMessage(state.error)}</Alert>
                )}
                <TextField
                  label="Mật khẩu mới (10–128 ký tự)"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <TextField
                  label="Nhập lại mật khẩu"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  error={!!confirm && confirm !== password}
                  helperText={
                    confirm && confirm !== password ? "Mật khẩu chưa khớp" : ""
                  }
                />
                <Button
                  variant="contained"
                  type="submit"
                  loading={state.isLoading}
                  disabled={
                    !code ||
                    password.length < 10 ||
                    password.length > 128 ||
                    password !== confirm
                  }
                >
                  Xác nhận đặt mật khẩu
                </Button>
              </Stack>
            )}
          </Card>
        )}
        <NavButton href="/login/">Về đăng nhập Staff</NavButton>
        <Button component="a" href="https://vqviet03.github.io/ess-edu-portal/">
          Cổng học sinh
        </Button>
      </Stack>
    </Shell>
  );
}
