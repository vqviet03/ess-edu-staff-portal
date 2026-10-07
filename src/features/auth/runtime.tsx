"use client";
import { useEffect, type ReactNode } from "react";
import { useStore } from "react-redux";
import { useRouter } from "next/navigation";
import { api, useMeQuery } from "@/api/api";
import { type RootState, useAppDispatch, useAppSelector } from "@/store";
import { restore, signedOut, verified } from "@/store/auth";
import { expired, expiresAt, readSession } from "./storage";
import { staffActive, workspaces } from "@/features/access/capabilities";
import { Feedback, Shell } from "@/shared/ui";
export function AuthRuntime() {
  const store = useStore<RootState>();
  const dispatch = useAppDispatch(),
    auth = useAppSelector((s) => s.auth);
  const me = useMeQuery(undefined, {
    skip: !auth.session || auth.status !== "validating",
  });
  useEffect(() => {
    if (store.getState().auth.status === "booting")
      dispatch(restore(readSession()));
  }, [dispatch, store]);
  useEffect(() => {
    if (auth.status === "validating" && me.data && auth.session)
      dispatch(verified(me.data));
  }, [me.data, auth.status, auth.session, dispatch]);
  useEffect(() => {
    if (!auth.session) return;
    const check = () => {
      if (expired(auth.session!))
        dispatch(signedOut("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."));
    };
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      check();
      if (!expired(auth.session!)) timer = setTimeout(schedule, Math.min(2147483647, Math.max(1, expiresAt(auth.session!) - Date.now())));
    };
    schedule();
    const onVisible = () => {
      if (!document.hidden) check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [auth.session, dispatch]);
  return null;
}
export function Guard({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch(),
    auth = useAppSelector((s) => s.auth),
    router = useRouter(),
    me = api.endpoints.me.useQueryState(undefined);
  useEffect(() => {
    if (auth.status === "guest") router.replace("/login/");
  }, [auth.status, router]);
  return (
    <Shell>
      {auth.status === "authenticated" ? (
        me.error && "status" in me.error && me.error.status === 403 ? (
          <Feedback error={me.error} retry={() => void dispatch(api.endpoints.me.initiate(undefined, { forceRefetch: true, subscribe: false }))} />
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
          retry={() => void dispatch(api.endpoints.me.initiate(undefined, { forceRefetch: true, subscribe: false }))}
        />
      )}
    </Shell>
  );
}
