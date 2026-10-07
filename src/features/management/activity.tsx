"use client";
import {StorageNotice} from "@/features/materials/storage-notice";
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
      <StorageNotice/>
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
      <Stack component="form" direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }} onSubmit={e => { e.preventDefault(); setSearch(input.trim()); setPage(1); }}>
      <TextField
        sx={{ flex: 1 }}
        label="ID / thao tác / người thực hiện"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <Button type="submit" variant="outlined">Tìm kiếm</Button>
      <TextField select label="Số dòng" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} sx={{ minWidth: 100 }}>{[10,20,50].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}</TextField>
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
                {new Date(e.at).toLocaleString("vi-VN")} · {e.actorName ?? "Hệ thống"} ({e.actorLoginId ?? e.actorUserId ?? e.actorId})
              </Typography>
              <Typography sx={{ wordBreak: "break-word" }}>
                ID: {(e.ids ?? []).join(", ")}
              </Typography>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>
                {e.reason || "Không có ghi chú."}
              </Typography>
              {(Array.isArray(e.changes) ? e.changes : []).map((c) => (
                <Typography key={c.id} variant="caption">
                  {c.id}: {(c.fields ?? []).join(", ")}
                </Typography>
              ))}
            </Card>
          ))}
          {!q.currentData?.items.length && (
            <Feedback empty="Chưa có nhật ký phù hợp." />
          )}
          {q.currentData && <Typography variant="body2">{q.currentData.total} bản ghi · Trang {page}</Typography>}
          {!!q.currentData?.total && (
            <Pagination
              page={page}
              count={Math.ceil(q.currentData.total / (q.currentData.pageSize ?? pageSize))}
              onChange={(_, v) => setPage(v)}
            />
          )}
        </Stack>
      )}
    </>
  );
}
