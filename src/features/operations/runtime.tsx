"use client";
import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import { apiConfiguration } from "@/api/config";
import { useLiveEventsQuery, useLazyOperationQuery } from "@/api/operations-api";
import { useAppDispatch, useAppSelector } from "@/store";
import { operationReceived } from "@/store/operations";
import { receiveOperation } from "./channel";

export function OperationsRuntime() {
  const dispatch = useAppDispatch(), auth = useAppSelector((s) => s.auth);
  const jobs = useAppSelector((s) => s.operations.items);
  const notices = useAppSelector((s) => s.operations.notifications);
  const localMutations = useAppSelector((s) => s.operations.localMutations);
  const session = auth.status === "authenticated" ? auth.session : null;
  useLiveEventsQuery(session?.teacher.id ?? "", { skip: !session || apiConfiguration.mock });
  const [getOperation, lookup] = useLazyOperationQuery();
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const done = useRef(new Set<string>());
  useEffect(() => { done.current.clear(); }, [session?.accessToken]);
  useEffect(() => {
    for (const event of Object.values(notices)) {
      if (done.current.has(event.operationId)) continue;
      if (event.actorId === session?.teacher.id && localMutations[event.operationId]) { done.current.add(event.operationId); continue; }
      done.current.add(event.operationId);
      setToast({ text: event.command.startsWith("Library.") ? "ESS: có thông báo mới." : event.status === "DONE" ? "ESS: tác vụ đã hoàn tất. Dữ liệu liên quan được cập nhật." : (event.error?.message ?? "Tác vụ thất bại; dữ liệu chưa được lưu."), error: event.status === "FAILED" });
    }
  }, [notices, localMutations, session?.teacher.id]);
  const pending = Object.values(jobs).filter((j) => j.status === "IN_PROGRESS");
  if (!session) return null;
  return <>
    {!!pending.length && <Box sx={{ position: "fixed", bottom: 84, right: 16, left: { xs: 16, sm: "auto" }, zIndex: 1600 }}><Alert severity="info" action={<Button disabled={lookup.isFetching} onClick={async () => {
      for (const job of pending) {
        try {
          const next = await getOperation(job.operationId).unwrap();
          dispatch(operationReceived(next));
          receiveOperation(session.accessToken, next);
        } catch { setToast({ text: "Không kiểm tra được tác vụ. Vui lòng thử lại.", error: true }); }
      }
    }}>Kiểm tra trạng thái</Button>}>Đang xử lý {pending.length} tác vụ. Bạn có thể tiếp tục sử dụng ESS.</Alert></Box>}
    <Snackbar open={!!toast} autoHideDuration={6000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}><Alert severity={toast?.error ? "error" : "success"} onClose={() => setToast(null)}>{toast?.text}</Alert></Snackbar>
  </>;
}
