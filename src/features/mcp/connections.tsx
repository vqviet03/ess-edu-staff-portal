"use client";
import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import Refresh from "@mui/icons-material/Refresh";
import LinkOff from "@mui/icons-material/LinkOff";
import { useMcpConnectionsQuery, useRevokeMcpMutation } from "@/api/mcp-api";
import { errorMessage } from "@/api/base-query";
export function McpConnectionsPanel() {
  const query = useMcpConnectionsQuery();
  const [remove, state] = useRevokeMcpMutation();
  const [selected, setSelected] = useState<string | null>(null);
  if (!query.data?.enabled && !query.error) return null;
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Typography variant="h6">Kết nối ChatGPT</Typography>
          <Tooltip title="Làm mới kết nối">
            <IconButton
              aria-label="Làm mới kết nối ChatGPT"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Stack>
        {query.error ? (
          <Alert
            severity="error"
            action={
              <Button onClick={() => void query.refetch()}>Thử lại</Button>
            }
          >
            {errorMessage(query.error)}
          </Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              Chỉ tra cứu và báo cáo. Tạo kết nối từ ChatGPT web bằng URL MCP do
              quản lý cấu hình.
            </Typography>
            {query.data?.items.length === 0 && (
              <Typography>Chưa có kết nối.</Typography>
            )}
            {query.data?.items.map((c) => (
              <Stack
                key={c.id}
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Stack sx={{ minWidth: 0 }}>
                  <Typography>
                    {c.roles
                      .map((r) => (r === "manager" ? "Quản lý" : "Giảng viên"))
                      .join(" · ")}
                    {!c.connected ? " · Chờ kết nối" : ""}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hết hạn:{" "}
                    {new Intl.DateTimeFormat("vi-VN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(c.expiresAt))}
                  </Typography>
                </Stack>
                <Tooltip title="Thu hồi kết nối">
                  <IconButton
                    aria-label="Thu hồi kết nối ChatGPT"
                    color="error"
                    disabled={state.isLoading}
                    onClick={() => setSelected(c.id)}
                  >
                    <LinkOff />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </>
        )}
        <Dialog
          open={selected !== null}
          onClose={() => {
            if (!state.isLoading) setSelected(null);
          }}
        >
          <DialogTitle>Thu hồi kết nối ChatGPT?</DialogTitle>
          <DialogContent>
            <Typography>
              ChatGPT sẽ không thể tiếp tục dùng kết nối này. Phiên đăng nhập
              EES hiện tại vẫn được giữ.
            </Typography>
            {state.error && (
              <Alert severity="error">{errorMessage(state.error)}</Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              disabled={state.isLoading}
              onClick={() => setSelected(null)}
            >
              Hủy
            </Button>
            <Button
              color="error"
              disabled={state.isLoading}
              onClick={async () => {
                if (selected)
                  try {
                    await remove(selected).unwrap();
                    setSelected(null);
                  } catch {
                    /* Keep the error and dialog visible. */
                  }
              }}
            >
              Thu hồi
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Paper>
  );
}
