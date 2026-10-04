"use client";
import { useEffect, type ReactNode } from "react";
import { useStore } from "react-redux";
import { useRouter } from "next/navigation";
import { useMeQuery } from "@/api/api";
import { type RootState, useAppDispatch, useAppSelector } from "@/store";
import { restore, signedOut, verified } from "@/store/auth";
import { expired, readSession } from "./storage";
import { staffActive, workspaces } from "@/features/access/capabilities";
import { Feedback, Shell } from "@/shared/ui";
export function AuthRuntime() {
  const store = useStore<RootState>();
  const dispatch = useAppDispatch(),
    auth = useAppSelector((s) => s.auth);
  const me = useMeQuery(undefined, {
    skip: !auth.session || auth.status === "guest" || auth.status === "booting",
    pollingInterval: 60000,
    refetchOnFocus: true,
  });
  useEffect(() => {
    if (store.getState().auth.status === "booting")
      dispatch(restore(readSession()));
  }, [dispatch, store]);
  useEffect(() => {
    if (me.data && auth.session && me.data !== auth.session.teacher)
      dispatch(verified(me.data));
  }, [me.data, auth.session, dispatch]);
  useEffect(() => {
    if (!auth.session) return;
    const check = () => {
      if (expired(auth.session!))
        dispatch(signedOut("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."));
    };
    check();
    const timer = setInterval(check, 10000);
    const onVisible = () => {
      if (!document.hidden) check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [auth.session, dispatch]);
  return null;
}
export function Guard({ children }: { children: ReactNode }) {
  const auth = useAppSelector((s) => s.auth),
    router = useRouter(),
    me = useMeQuery(undefined, { skip: !auth.session });
  useEffect(() => {
    if (auth.status === "guest") router.replace("/login/");
  }, [auth.status, router]);
  return (
    <Shell>
      {auth.status === "authenticated" ? (
        me.error && "status" in me.error && me.error.status === 403 ? (
          <Feedback error={me.error} retry={() => void me.refetch()} />
        ) : staffActive(auth.session?.teacher) &&
          workspaces(auth.session?.teacher).length ? (
          children
        ) : (
          <Feedback
            error={
              new Error(
                "Tài khoản Staff hoặc hồ sơ không hoạt động / không có vai trò phù hợp. Liên hệ quản lý.",
              )
            }
          />
        )
      ) : (
        <Feedback
          loading={!me.error}
          error={me.error}
          retry={() => void me.refetch()}
        />
      )}
    </Shell>
  );
}
