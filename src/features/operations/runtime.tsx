"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import { api } from "@/api/api";
import { apiConfiguration } from "@/api/config";
import { useLiveEventsQuery, useOperationsQuery, useLazyOperationQuery, useLazyOperationEventsQuery } from "@/api/operations-api";
import { useAppDispatch, useAppSelector } from "@/store";
import { operationReceived, notificationReceived } from "@/store/operations";
import { relatedTags, type ChangeNotification } from "./models";

export function OperationsRuntime() {
  const dispatch = useAppDispatch(), auth = useAppSelector((s) => s.auth), jobs = useAppSelector((s) => s.operations.items);
  const session = auth.status === "authenticated" ? auth.session : null;
  const token = session?.accessToken, userId = session?.teacher.id;
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const notifications = useAppSelector((s) => s.operations.notifications);
  const stream = useLiveEventsQuery(userId ?? "", { skip: !session || apiConfiguration.mock });
  const online = stream.currentData?.online ?? false;
  const done = useRef(new Set<string>()), cursor = useRef("0");
  const [getOperation] = useLazyOperationQuery(), [getEvents] = useLazyOperationEventsQuery();
  const list = useOperationsQuery(undefined, { skip: !session, pollingInterval: online ? 30000 : 3000, refetchOnFocus: true });
  const receive = useCallback((event: ChangeNotification) => {
    cursor.current = event.eventId;
    if (done.current.has(event.operationId)) return;
    done.current.add(event.operationId);
    setToast({ text: event.status === "DONE" ? "ESS: tác vụ đã hoàn tất. Dữ liệu liên quan được cập nhật." : (event.error?.message ?? "Tác vụ thất bại; dữ liệu chưa được lưu."), error: event.status === "FAILED" });
  }, []);
  useEffect(() => {
    if (!list.currentData || !session) return;
    for (const job of list.currentData.items) dispatch(operationReceived(job));
  }, [list.currentData, session, dispatch]);
  useEffect(() => {
    if (!session) return;
    const pending = Object.values(jobs).filter((j) => j.status === "IN_PROGRESS");
    if (!pending.length) return;
    const poll = () => { for (const job of pending.slice(0, 5)) void getOperation(job.operationId).unwrap().then((next) => dispatch(operationReceived(next))).catch(() => {}); };
    const timer = setInterval(poll, 3000); return () => clearInterval(timer);
  }, [jobs, session, getOperation, dispatch]);
  useEffect(() => {
    if (!token || !userId || online) return;
    const key = `ess.events.${userId}`;
    try { cursor.current = sessionStorage.getItem(key) ?? "0"; } catch { cursor.current = "0"; }
    let stopped = false;
    const timer = setInterval(() => {
      void getEvents(cursor.current).unwrap().then((r) => {
        if (stopped) return;
        for (const event of r.items) { dispatch(notificationReceived(event)); receive(event); }
        try { sessionStorage.setItem(key, cursor.current); } catch {}
      }).catch(() => {});
    }, apiConfiguration.mock ? 1500 : 5000);
    return () => { stopped = true; clearInterval(timer); };
  }, [token, userId, online, receive, getEvents, dispatch]);
  useEffect(() => { for (const event of Object.values(notifications)) receive(event); }, [notifications, receive]);
  // Completion polling also works when a websocket is unavailable.
  useEffect(() => {
    for (const job of Object.values(jobs)) {
      if (job.status === "IN_PROGRESS" || done.current.has(job.operationId) || !job.completedAt || Date.parse(job.completedAt) < Date.now() - 60000) continue;
      done.current.add(job.operationId);
      dispatch(api.util.invalidateTags(relatedTags(["students", "teachers", "classes", "accounts", "assignments", "enrollments", "sessions", "assessments", "results"])));
      setToast({ text: job.status === "DONE" ? "Tác vụ đã hoàn tất. Dữ liệu đã được cập nhật." : (job.error?.message ?? "Tác vụ thất bại."), error: job.status === "FAILED" });
    }
  }, [jobs, dispatch]);
  const pending = Object.values(jobs).filter((j) => j.status === "IN_PROGRESS").length;
  if (!session) return null;
  return <>
    {!!pending && <Box sx={{ position: "fixed", bottom: 84, right: 16, left: { xs: 16, sm: "auto" }, zIndex: 1600 }}><Alert severity="info">Đang xử lý {pending} tác vụ. Bạn có thể tiếp tục sử dụng ESS.</Alert></Box>}
    <Snackbar open={!!toast} autoHideDuration={6000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}><Alert severity={toast?.error ? "error" : "success"} onClose={() => setToast(null)}>{toast?.text}</Alert></Snackbar>
  </>;
}
