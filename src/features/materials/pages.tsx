"use client";
import { useState } from "react";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import {
  useDeletionRequestsQuery,
  useDecideDeletionMutation,
  useNotificationsQuery,
  useChangeNotificationMutation,
  useReadNotificationsMutation,
} from "@/api/library-api";
import { useAppDispatch } from "@/store";
import { libraryApi } from "@/api/library-api";
import { useWorkspace } from "@/features/access/hooks";
import { Feedback, NavButton, Title } from "@/shared/ui";
import { MaterialBrowser } from "./browser";
export function LibraryPage() {
  return (
    <>
      <Title
        title="Kho tài liệu"
        subtitle="Duyệt theo thư mục hoặc cây; chọn nhiều file xuyên thư mục."
      />
      <MaterialBrowser />
    </>
  );
}
export { StorageManagerPage as StoragePage } from "./storage-manager";
export function DeletionPage() {
  const { selected } = useWorkspace(),
    q = useDeletionRequestsQuery(),
    [decision, state] = useDecideDeletionMutation(),
    [reason, setReason] = useState<Record<string, string>>({}),
    [linkAction, setLinkAction] = useState<
      Record<string, "KEEP_UNAVAILABLE" | "DETACH">
    >({}),
    [error, setError] = useState<unknown>(),
    [success, setSuccess] = useState("");
  return (
    <Stack spacing={2}>
      <Title
        title="Yêu cầu xóa tài liệu"
        subtitle="Xem ảnh hưởng trước khi duyệt xóa file gốc và thumbnail khỏi storage; giữ hồ sơ và nhật ký."
      />
      <Feedback
        loading={q.isLoading}
        error={q.error || error}
        retry={() => void q.refetch()}
      />
      {success && <Alert severity="success">{success}</Alert>}
      {q.currentData && !q.currentData.items.length && (
        <Feedback empty="Chưa có yêu cầu xóa." />
      )}
      {q.currentData?.items.map((d) => (
        <Paper key={d.request.id} sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">{d.file.displayName}</Typography>
            <Typography>Lý do: {d.request.reason}</Typography>
            <Chip label={d.request.status} /><Typography variant="body2">Tài liệu: {d.file.status === "DELETED" ? "Đã xóa khỏi storage" : d.file.status === "DELETING" ? "Đang chờ server xóa file và thumbnail" : "Đang lưu trữ"}</Typography>
            <Typography>{d.usages.length} bài đăng đang sử dụng:</Typography>
            {d.purge?.lastError && <Alert severity="warning">Storage chưa xóa thành công ({d.purge.lastError}). Server đã thử {d.purge.attempts} lần; lần kế tiếp sau {new Date(d.purge.nextAttemptAt).toLocaleString("vi-VN")}. Dung lượng chưa được giải phóng.</Alert>}
            {d.usages.map((p) => (
              <NavButton
                key={p.id}
                href={`/session/?classId=${p.classId}&sessionId=${p.sessionId}`}
              >
                {p.title}
              </NavButton>
            ))}
            {selected === "manager" && d.request.status === "PENDING" && (
              <>
                <TextField
                  select
                  label="Xử lý liên kết khi duyệt"
                  value={linkAction[d.request.id] ?? "KEEP_UNAVAILABLE"}
                  onChange={(e) =>
                    setLinkAction((v) => ({
                      ...v,
                      [d.request.id]: e.target.value as
                        | "KEEP_UNAVAILABLE"
                        | "DETACH",
                    }))
                  }
                >
                  <MenuItem value="KEEP_UNAVAILABLE">
                    Giữ liên kết, báo file không khả dụng
                  </MenuItem>
                  <MenuItem value="DETACH">
                    Gỡ file khỏi bài, giữ nhật ký
                  </MenuItem>
                </TextField>
                <TextField
                  label="Lý do quyết định"
                  value={reason[d.request.id] ?? ""}
                  onChange={(e) =>
                    setReason((v) => ({ ...v, [d.request.id]: e.target.value }))
                  }
                />
                <Stack direction="row" spacing={1}>
                  {(["APPROVED", "REJECTED"] as const).map((value) => (
                    <Button
                      key={value}
                      variant={value === "APPROVED" ? "contained" : "outlined"}
                      disabled={
                        state.isLoading || !reason[d.request.id]?.trim()
                      }
                      onClick={async () => {
                        if (
                          !window.confirm(
                            value === "APPROVED"
                              ? `Xóa thật file gốc và thumbnail, xử lý ${d.usages.length} liên kết như đã chọn?`
                              : "Từ chối yêu cầu này?",
                          )
                        )
                          return;
                        setError(undefined);
                        try {
                          await decision({
                            id: d.request.id,
                            version: d.request.version,
                            decision: value,
                            reason: reason[d.request.id],
                            linkAction:
                              linkAction[d.request.id] ?? "KEEP_UNAVAILABLE",
                          }).unwrap();
                          setSuccess(value === "APPROVED" ? "Đã duyệt. Server sẽ xóa file và thumbnail rồi gửi thông báo." : "Đã từ chối.");
                        } catch (e) {
                          setError(e);
                        }
                      }}
                    >
                      {value === "APPROVED"
                        ? "Duyệt xóa file thật"
                        : "Từ chối"}
                    </Button>
                  ))}
                </Stack>
              </>
            )}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
export const notificationTypes: Record<string, string> = {
  MATERIAL: "Tài liệu / bài đăng",
  SOCIAL: "Bình luận / tương tác",
  REPLY: "Trả lời bình luận",
  SCORE: "Công bố điểm",
  REWARD: "Điểm động viên",
  SCHEDULE: "Lịch học",
  APPROVAL: "Yêu cầu xóa / phê duyệt",
  STORAGE: "Storage",
  SYSTEM: "Hệ thống",
};
export function NotificationsPage() {
  const dispatch = useAppDispatch(),
    [type, setType] = useState(""),
    [read, setRead] = useState(""),
    [cursor, setCursor] = useState<string>(),
    filter = { type, isRead: read === "" ? undefined : read === "true", cursor },
    filtered = !!type || !!read || !!cursor,
    subscribed = useNotificationsQuery(filter, { skip: !filtered }),
    cached = libraryApi.endpoints.notifications.useQueryState(filter),
    q = filtered ? subscribed : { ...cached, refetch: () => dispatch(libraryApi.endpoints.notifications.initiate(filter, { forceRefetch: true, subscribe: false })) },
    [change] = useChangeNotificationMutation(),
    [all] = useReadNotificationsMutation(),
    [error, setError] = useState<unknown>();
  return (
    <Stack spacing={2}>
      <Title
        title="Thông báo"
        subtitle={`${q.currentData?.unreadCount ?? 0} chưa đọc`}
        actions={<Stack direction="row" spacing={1}>
          <Button onClick={() => void q.refetch()}>Tải lại</Button>
          <Button
            onClick={async () => {
              try {
                await all().unwrap();
              } catch (e) {
                setError(e);
              }
            }}
          >
            Đọc tất cả
          </Button>
        </Stack>}
      />
      <Stack direction="row" spacing={1}>
        <TextField
          select
          label="Loại"
          value={type}
          fullWidth
          onChange={(e) => {
            setType(e.target.value);
            setCursor(undefined);
          }}
        >
          <MenuItem value="">Tất cả</MenuItem>
          {Object.entries(notificationTypes).map(([v, l]) => (
            <MenuItem key={v} value={v}>
              {l}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Trạng thái"
          value={read}
          fullWidth
          onChange={(e) => {
            setRead(e.target.value);
            setCursor(undefined);
          }}
        >
          <MenuItem value="">Tất cả</MenuItem>
          <MenuItem value="false">Chưa đọc</MenuItem>
          <MenuItem value="true">Đã đọc</MenuItem>
        </TextField>
      </Stack>
      <Feedback
        loading={q.isLoading || (!filtered && q.isUninitialized)}
        error={q.error || error}
        retry={() => void q.refetch()}
      />
      {q.currentData && !q.currentData.items.length && (
        <Feedback empty="Chưa có thông báo phù hợp." />
      )}
      {q.currentData?.items.map((n) => (
        <Paper
          key={n.id}
          sx={{
            p: 2,
            borderLeft: 4,
            borderColor: n.isRead ? "divider" : "primary.main",
          }}
        >
          <Stack spacing={1}>
            <Typography sx={{ fontWeight: n.isRead ? 400 : 700 }}>
              {n.title}
            </Typography>
            <Typography variant="caption">
              {notificationTypes[n.type]} ·{" "}
              {new Date(n.createdAt).toLocaleString("vi-VN")}
            </Typography>
            <Stack
              direction="row"
              useFlexGap
              spacing={1}
              sx={{ flexWrap: "wrap" }}
            >
              <NavButton href={n.href}>Mở nội dung</NavButton>
              <Button
                onClick={async () => {
                  try {
                    await change({
                      id: n.id,
                      version: n.version,
                      isRead: !n.isRead,
                    }).unwrap();
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                {n.isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await change({
                      id: n.id,
                      version: n.version,
                      deleted: true,
                    }).unwrap();
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                Ẩn thông báo
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
      <Stack direction="row">
        {cursor && (
          <Button onClick={() => setCursor(undefined)}>Trang đầu</Button>
        )}
        {q.currentData?.nextCursor && (
          <Button
            onClick={() => setCursor(q.currentData?.nextCursor ?? undefined)}
          >
            Tiếp theo
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
