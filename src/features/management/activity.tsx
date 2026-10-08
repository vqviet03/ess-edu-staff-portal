"use client";
import { publicId } from "@/shared/public-id";
import { StorageNotice } from "@/features/materials/storage-notice";
import Search from "@mui/icons-material/Search";
import RestartAlt from "@mui/icons-material/RestartAlt";
import { useState } from "react";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useAuditQuery, useWarningsQuery } from "@/api/management-api";
import { Card, Feedback, NavButton, Title } from "@/shared/ui";
import { ManagerOnly } from "./shared";
export function WarningsPage() {
  return (
    <ManagerOnly>
      <Warnings />
    </ManagerOnly>
  );
}
function Warnings() {
  const q = useWarningsQuery();
  return (
    <>
      <StorageNotice />
      <Title
        title="Lớp trống giảng viên"
        subtitle="Lớp ACTIVE chưa có phân công hợp lệ. Cảnh báo được tính từ tài khoản, hồ sơ và phân công hiện tại."
      />
      {q.isLoading || q.error ? (
        <Feedback
          loading={q.isLoading}
          error={q.error}
          retry={() => void q.refetch()}
        />
      ) : (
        <Stack spacing={2}>
          {q.data?.map((w) => (
            <Card key={w.classId}>
              <Typography variant="h5">{w.className}</Typography>
              <Typography sx={{ my: 2 }}>{w.message}</Typography>
              <NavButton
                href={`/manage/profile/?entity=classes&id=${encodeURIComponent(w.classId)}`}
                primary
              >
                Hồ sơ & phân công
              </NavButton>
            </Card>
          ))}
          {!q.data?.length && (
            <Feedback empty="Không còn lớp đang học thiếu giảng viên." />
          )}
        </Stack>
      )}
    </>
  );
}
export function AuditPage() {
  return (
    <ManagerOnly>
      <Audit />
    </ManagerOnly>
  );
}
function Audit() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [input, setInput] = useState(""),
    [pageSize, setPageSize] = useState(20),
    q = useAuditQuery({ page, search, pageSize });
  return (
    <>
      <Title
        title="Nhật ký thay đổi"
        subtitle="Người thực hiện, thời gian, phạm vi và lý do; không chứa mật khẩu hoặc mã kích hoạt."
      />
      <Stack
        component="form"
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{
          mb: 2,
          alignItems: { md: "center" },
          p: 2,
          bgcolor: "background.paper",
          borderRadius: 2,
        }}
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(input.trim());
          setPage(1);
        }}
      >
        <TextField
          sx={{ flex: 1 }}
          label="Tìm nhật ký"
          helperText="Tên, ID công khai, thao tác hoặc lý do"
          slotProps={{ htmlInput: { maxLength: 120 } }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" variant="contained" startIcon={<Search />}>
          Tìm kiếm
        </Button>
        <Button
          startIcon={<RestartAlt />}
          onClick={() => {
            setInput("");
            setSearch("");
            setPage(1);
          }}
        >
          Xóa bộ lọc
        </Button>
        <TextField
          select
          label="Số dòng"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          sx={{ minWidth: 100 }}
        >
          {[10, 20, 50].map((n) => (
            <MenuItem key={n} value={n}>
              {n}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {q.isLoading || (q.isFetching && !q.currentData) || q.error ? (
        <Feedback
          loading={q.isLoading || (q.isFetching && !q.currentData)}
          error={q.error}
          retry={() => void q.refetch()}
        />
      ) : (
        <Stack spacing={2}>
          {q.currentData?.items.map((e) => (
            <Card key={e.id}>
              <Typography sx={{ fontWeight: 600 }}>
                {e.action} · {e.entity}
              </Typography>
              <Typography>
                {new Date(e.at).toLocaleString("vi-VN")} ·{" "}
                {e.actorName ?? "Hệ thống"} (
                {publicId(e.actorLoginId, e.actorUserId)})
              </Typography>
              <Typography sx={{ wordBreak: "break-word" }}>
                ID:{" "}
                {(e.ids ?? [])
                  .map((id) => publicId(id))
                  .filter((id) => id !== "—")
                  .join(", ") || "—"}
              </Typography>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>
                {e.reason || "Không có ghi chú."}
              </Typography>
              {(Array.isArray(e.changes) ? e.changes : []).map((c) => (
                <Typography key={c.id} variant="caption">
                  {publicId(c.id)}: {(c.fields ?? []).join(", ")}
                </Typography>
              ))}
            </Card>
          ))}
          {!q.currentData?.items.length && (
            <Feedback empty="Chưa có nhật ký phù hợp." />
          )}
          {q.currentData && (
            <Typography variant="body2">
              {q.currentData.total} bản ghi · Trang {page}
            </Typography>
          )}
          {!!q.currentData?.total && (
            <Pagination
              page={page}
              count={Math.ceil(
                q.currentData.total / (q.currentData.pageSize ?? pageSize),
              )}
              onChange={(_, v) => setPage(v)}
            />
          )}
        </Stack>
      )}
    </>
  );
}
