"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { api, useLoginMutation } from "@/api/api";
import { errorMessage, useMock } from "@/api/base-query";
import { loginInput } from "@/utils/scores";
import { signedIn } from "@/store/auth";
import { useAppDispatch, useAppSelector } from "@/store";
import { Card, Feedback, NavButton, Shell, Title } from "@/shared/ui";
import type { AuthSession } from "@/types";
const exchanges = new Map<string, Promise<AuthSession>>();
export function Login() {
  const router = useRouter(),
    dispatch = useAppDispatch(),
    auth = useAppSelector((s) => s.auth),
    [show, setShow] = useState(false),
    [login, { isLoading, error }] = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginInput),
    defaultValues: { teacherId: "", password: "" },
  });
  useEffect(() => {
    if (auth.status === "authenticated") router.replace("/home/");
  }, [auth.status, router]);
  return (
    <Shell>
      <Box sx={{ maxWidth: 440, mx: "auto", pt: { xs: 0, md: 4 } }}>
        <Title
          title="Đăng nhập ESS Staff"
          subtitle="Quản lý lớp học, đánh giá và theo dõi tiến bộ của học sinh."
        />
        <Card>
          <Stack
            component="form"
            spacing={2.5}
            onSubmit={handleSubmit(async (value) => {
              try {
                dispatch(signedIn(await login(value).unwrap()));
                router.replace("/home/");
              } catch {}
            })}
          >
            {auth.message && <Alert severity="info">{auth.message}</Alert>}
            {error && <Alert severity="error">{errorMessage(error)}</Alert>}
            <TextField
              label="ID giảng viên / quản lý"
              autoComplete="username"
              {...register("teacherId")}
              error={!!errors.teacherId}
              helperText={errors.teacherId?.message}
            />
            <TextField
              label="Mật khẩu"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              {...register("password")}
              error={!!errors.password}
              helperText={errors.password?.message}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        onClick={() => setShow(!show)}
                      >
                        {show ? "Ẩn" : "Hiện"}
                      </Button>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button type="submit" variant="contained" loading={isLoading}>
              Đăng nhập
            </Button>
            <Typography variant="caption" color="text.secondary">
              Tài khoản do trung tâm cấp. Khi đăng nhập, hệ thống ghi thời gian, IP kết nối và thông tin trình duyệt/thiết bị để bảo vệ tài khoản; quản lý trung tâm có thể xem. Không thu thập vị trí GPS.
            </Typography>
          </Stack>
        </Card>
        {useMock && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Demo: GV0001 (giảng viên), MG0001 (quản lý), BOTH0001 (hai vai trò).
            Mật khẩu: Demo123!
          </Alert>
        )}
      </Box>
    </Shell>
  );
}
export function LinkLogin() {
  const router = useRouter(),
    dispatch = useAppDispatch(),
    started = useRef<Promise<AuthSession> | null>(null),
    initialized = useRef(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const subscribe = (pending: Promise<AuthSession>) =>
      pending.then(
        (session) => {
          if (active && started.current === pending) {
            dispatch(signedIn(session));
            router.replace("/home/");
          }
        },
        (e) => {
          if (active && started.current === pending) setError(errorMessage(e));
        },
      );
    const read = () => {
      initialized.current = true;
      setError("");
      const code = new URLSearchParams(location.hash.slice(1)).get("code");
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search,
      );
      if (!code) {
        started.current = null;
        setError("Liên kết thiếu mã đăng nhập.");
        return;
      }
      let pending = exchanges.get(code);
      if (!pending) {
        pending = dispatch(api.endpoints.exchange.initiate({ code })).unwrap();
        exchanges.set(code, pending);
        pending.then(
          () => exchanges.delete(code),
          () => exchanges.delete(code),
        );
      }
      started.current = pending;
      void subscribe(pending);
    };
    if (!initialized.current) read();
    else if (started.current) void subscribe(started.current);
    window.addEventListener("hashchange", read);
    return () => {
      active = false;
      window.removeEventListener("hashchange", read);
    };
  }, [dispatch, router]);
  return (
    <Shell>
      <Box sx={{ maxWidth: 480, mx: "auto" }}>
        <Title title="Đăng nhập bằng liên kết" />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Hệ thống ghi thời gian, IP kết nối và thông tin trình duyệt/thiết bị để bảo vệ tài khoản; quản lý trung tâm có thể xem. Không thu thập vị trí GPS.</Typography>
        <Card>
          {error ? (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
              <NavButton href="/login/">Về đăng nhập</NavButton>
            </>
          ) : (
            <Feedback loading />
          )}
        </Card>
      </Box>
    </Shell>
  );
}
export function Entry() {
  const status = useAppSelector((s) => s.auth.status),
    router = useRouter();
  useEffect(() => {
    if (status === "authenticated" || status === "guest")
      router.replace(status === "authenticated" ? "/home/" : "/login/");
  }, [status, router]);
  return (
    <Shell>
      <Feedback loading />
    </Shell>
  );
}
