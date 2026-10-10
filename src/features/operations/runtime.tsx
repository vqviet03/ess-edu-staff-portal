"use client";
import {NotificationToast} from "@/features/notifications/toast";
import {SwipeDismiss} from "@/shared/swipe-dismiss";
import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Close from "@mui/icons-material/Close";
import Refresh from "@mui/icons-material/Refresh";
import Stack from "@mui/material/Stack";
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
  const [dismissed,setDismissed]=useState("");
  useEffect(() => { done.current.clear(); }, [session?.accessToken]);
  useEffect(() => {
    for (const event of Object.values(notices)) {
      if (done.current.has(event.operationId)) continue;
      if (event.actorId === session?.teacher.id && localMutations[event.operationId]) { done.current.add(event.operationId); continue; }
      done.current.add(event.operationId);
      setToast({ text: event.command.startsWith("Library.") ? "Có thông báo mới." : event.status === "DONE" ? "Tác vụ đã hoàn tất. Dữ liệu liên quan được cập nhật." : (event.error?.message ?? "Tác vụ thất bại; dữ liệu chưa được lưu."), error: event.status === "FAILED" });
    }
  }, [notices, localMutations, session?.teacher.id]);
  const pending = Object.values(jobs).filter((j) => j.status === "IN_PROGRESS");
  const pendingKey=pending.map(j=>j.operationId).sort().join(",");
  if (!session) return null;
  return <><NotificationToast key={session.teacher.id}/>
    {!!pending.length && dismissed!==pendingKey && <Box sx={{ position: "fixed", bottom: 84, right: 16, left: { xs: 16, sm: "auto" }, zIndex: 1600 }}><SwipeDismiss onDismiss={()=>setDismissed(pendingKey)}><Alert severity="info" action={<Stack direction="row"><Tooltip title="Kiểm tra trạng thái"><IconButton aria-label="Kiểm tra trạng thái" disabled={lookup.isFetching} onClick={async () => {
      for (const job of pending) {
        try {
          const next = await getOperation(job.operationId).unwrap();
          dispatch(operationReceived(next));
          receiveOperation(session.accessToken, next);
        } catch { setToast({ text: "Không kiểm tra được tác vụ. Vui lòng thử lại.", error: true }); }
      }
    }}><Refresh fontSize="small"/></IconButton></Tooltip><Tooltip title="Ẩn tác vụ"><IconButton aria-label="Ẩn tác vụ" onClick={()=>setDismissed(pendingKey)}><Close fontSize="small"/></IconButton></Tooltip></Stack>}>Đang xử lý {pending.length} tác vụ. Bạn có thể tiếp tục thao tác.</Alert></SwipeDismiss></Box>}
    <Snackbar open={!!toast} autoHideDuration={6000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}><SwipeDismiss onDismiss={()=>setToast(null)}><Alert severity={toast?.error ? "error" : "success"} onClose={() => setToast(null)}>{toast?.text}</Alert></SwipeDismiss></Snackbar>
  </>;
}
