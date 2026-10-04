"use client";
import { useEffect, type ReactNode } from "react";
import { useStore } from "react-redux";
import { useRouter } from "next/navigation";
import { useMeQuery } from "@/api/api";
import { type RootState, useAppDispatch, useAppSelector } from "@/store";
import { restore, signedOut, verified } from "@/store/auth";
import { expired, readSession } from "./storage";
import { Feedback, Shell } from "@/shared/ui";
export function AuthRuntime() {
  const store = useStore<RootState>();
  const dispatch = useAppDispatch(),
    auth = useAppSelector((s) => s.auth);
  const me = useMeQuery(undefined, { skip: auth.status !== "validating" });
  useEffect(() => {
    if (store.getState().auth.status === "booting") dispatch(restore(readSession()));
  }, [dispatch, store]);
  useEffect(() => {
    if (me.data && auth.status === "validating") dispatch(verified(me.data));
  }, [me.data, auth.status, dispatch]);
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
    me = useMeQuery(undefined, { skip: auth.status !== "validating" });
  useEffect(() => {
    if (auth.status === "guest") router.replace("/login/");
  }, [auth.status, router]);
  return (
    <Shell>
      {auth.status === "authenticated" ? (
        children
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
