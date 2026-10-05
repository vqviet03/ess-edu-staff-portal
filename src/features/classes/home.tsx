"use client";
import { useWorkspace } from "@/features/access/hooks";
import { useState } from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useClassesQuery } from "@/api/api";
import {
  Card,
  Feedback,
  NavButton,
  Progress,
  StatusChip,
  Title,
} from "@/shared/ui";
export function Home() {
  const { selected } = useWorkspace();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(0),
    [pageSize, setPageSize] = useState(10);
  const q = useClassesQuery({
      workspace: selected ?? "teacher",
      search,
      status,
      page: page + 1,
      pageSize,
    }),
    rows = q.currentData?.data ?? [];
  return (
    <>
      <Title
        title="Lớp học của tôi"
        subtitle="Theo dõi tiến độ Unit và quản lý kết quả học tập."
      />
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{
          ...{ mb: 2.5 },
          gap: 2,
        }}
      >
        <TextField
          label="Tìm kiếm lớp"
          placeholder="Tên hoặc mã lớp…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ maxWidth: { sm: 500 } }}
        />
        <TextField
          select
          label="Trạng thái"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          sx={{ maxWidth: { sm: 240 } }}
        >
          <MenuItem value="">Tất cả</MenuItem>
          <MenuItem value="ACTIVE">Đang học</MenuItem>
          <MenuItem value="COMPLETED">Hoàn thành</MenuItem>
          <MenuItem value="PAUSED">Tạm dừng</MenuItem>
        </TextField>
      </Stack>
      <Feedback
        loading={q.isFetching}
        error={q.error}
        retry={() => void q.refetch()}
      />
      {!q.isFetching && !q.error && (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3,1fr)" },
              gap: 2,
              mb: 2.5,
            }}
          >
            {[
              ["Lớp phù hợp bộ lọc", q.currentData?.meta?.total ?? rows.length],
              [
                "Học sinh · trang hiện tại",
                rows.reduce((n, c) => n + c.studentCount, 0),
              ],
              [
                "Unit hoàn thành · trang hiện tại",
                rows.reduce((n, c) => n + c.completedUnits, 0),
              ],
            ].map(([label, n]) => (
              <Card key={label}>
                <Typography color="text.secondary" variant="body2">
                  {label}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: 30,
                    color: "primary.main",
                    mt: 1,
                  }}
                >
                  {n}
                </Typography>
              </Card>
            ))}
          </Box>
          <Card>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Danh sách lớp
            </Typography>
            {rows.length ? (
              <TableContainer>
                <Table aria-label="Danh sách lớp" sx={{ minWidth: 800 }}>
                  <TableHead>
                    <TableRow>
                      {[
                        "Lớp / Mã",
                        "Lịch học",
                        "Học sinh",
                        "Trạng thái",
                        "Tiến độ Unit",
                        "Thao tác",
                      ].map((h) => (
                        <TableCell key={h}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((c) => (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Typography
                            sx={{
                              fontWeight: 600,
                            }}
                          >
                            {c.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c.code}
                          </Typography>
                        </TableCell>
                        <TableCell>{c.schedule}</TableCell>
                        <TableCell>{c.studentCount}</TableCell>
                        <TableCell>
                          <StatusChip status={c.status} />
                        </TableCell>
                        <TableCell>
                          <Progress
                            completed={c.completedUnits}
                            total={c.totalUnits}
                          />
                        </TableCell>
                        <TableCell>
                          <NavButton
                            href={"/class/?classId=" + encodeURIComponent(c.id)}
                          >
                            Mở lớp
                          </NavButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Feedback empty="Chưa có lớp phù hợp bộ lọc." />
            )}
            <TablePagination
              component="div"
              count={q.currentData?.meta?.total ?? rows.length}
              page={page}
              rowsPerPage={pageSize}
              rowsPerPageOptions={[5, 10, 25]}
              onPageChange={(_, value) => setPage(value)}
              onRowsPerPageChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              labelRowsPerPage="Số dòng:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} / ${count}`
              }
              getItemAriaLabel={(type) =>
                type === "next" ? "Trang tiếp theo" : "Trang trước"
              }
            />
          </Card>
        </>
      )}
    </>
  );
}
