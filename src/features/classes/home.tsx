"use client";
import { MobileFilters } from "@/shared/mobile-filters";
import { useMemo } from "react";
import { useDebouncedValue } from "@/shared/debounced-value";
import { useWorkspace } from "@/features/access/hooks";
import { useRouteState } from "@/shared/route-state";
import Link from "next/link";
import ButtonBase from "@mui/material/ButtonBase";
import { NavigationRow } from "@/shared/navigation-row";
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
import { Card, Feedback, Progress, StatusChip, Title } from "@/shared/ui";
export function Home() {
  const { selected } = useWorkspace();
  const [search, setSearch] = useRouteState(`classes:${selected}:search`, ""),
    [status, setStatus] = useRouteState(`classes:${selected}:status`, ""),
    [page, setPage] = useRouteState(`classes:${selected}:page`, 0),
    [pageSize, setPageSize] = useRouteState(`classes:${selected}:pageSize`, 10);
  const request = useDebouncedValue(
    useMemo(
      () => ({
        workspace: selected ?? "teacher",
        search,
        status,
        page: page + 1,
        pageSize,
      }),
      [selected, search, status, page, pageSize],
    ),
  );
  const q = useClassesQuery(request),
    rows = q.currentData?.data ?? [];
  return (
    <>
      <Title
        title="Lớp học của tôi"
        subtitle="Theo dõi tiến độ Unit và quản lý kết quả học tập."
      />
      <Stack
        direction="row"
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
          sx={{
            flex: { xs: 1, md: "initial" },
            minWidth: 0,
            maxWidth: { sm: 500 },
          }}
        />
        <MobileFilters
          value={{ status }}
          empty={{ status: "" }}
          title="Lọc lớp học"
          onApply={(next) => {
            setStatus(next.status);
            setPage(0);
          }}
        >
          {(value, update, mobile) => (
            <TextField
              select
              slotProps={
                mobile
                  ? {
                      inputLabel: { shrink: true },
                      select: { displayEmpty: true },
                    }
                  : undefined
              }
              label="Trạng thái"
              value={value.status}
              onChange={(e) => {
                update({ status: e.target.value });
              }}
              sx={{ maxWidth: { sm: 240 } }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="ACTIVE">Đang học</MenuItem>
              <MenuItem value="COMPLETED">Hoàn thành</MenuItem>
              <MenuItem value="PAUSED">Tạm dừng</MenuItem>
            </TextField>
          )}
        </MobileFilters>
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
              gridTemplateColumns: "repeat(3,minmax(0,1fr))",
              gap: { xs: 1, sm: 2 },
              mb: 2,
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
              <Box
                key={label}
                sx={{
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  p: { xs: 1.25, sm: 2.5 },
                  minWidth: 0,
                }}
              >
                <Typography color="text.secondary" variant="body2">
                  <Box
                    component="span"
                    sx={{ display: { xs: "none", sm: "inline" } }}
                  >
                    {label}
                  </Box>
                  <Box
                    component="span"
                    sx={{ display: { xs: "inline", sm: "none" } }}
                  >
                    {label === "Lớp phù hợp bộ lọc"
                      ? "Lớp"
                      : String(label).startsWith("Học sinh")
                        ? "Học sinh"
                        : "Unit xong"}
                  </Box>
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: 22, sm: 30 },
                    color: "primary.main",
                    mt: { xs: 0.25, sm: 1 },
                  }}
                >
                  {n}
                </Typography>
              </Box>
            ))}
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: "block", sm: "none" }, mb: 1 }}
          >
            Học sinh và Unit hoàn thành tính trên trang hiện tại.
          </Typography>
          <Card>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Danh sách lớp
            </Typography>
            {rows.length ? (
              <>
                <Stack spacing={1} sx={{ display: { xs: "flex", md: "none" } }}>
                  {rows.map((c) => (
                    <ButtonBase
                      key={c.id}
                      component={Link}
                      href={"/class/?classId=" + encodeURIComponent(c.id)}
                      aria-label={`Mở lớp ${c.name}`}
                      sx={{
                        textAlign: "left",
                        justifyContent: "flex-start",
                        width: "100%",
                        p: 1.25,
                        minHeight: 44,
                        bgcolor: "action.hover",
                        borderRadius: 2,
                      }}
                    >
                      <Stack spacing={0.75} sx={{ width: "100%", minWidth: 0 }}>
                        <Stack
                          direction="row"
                          sx={{
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1,
                          }}
                        >
                          <Typography
                            sx={{ fontWeight: 700, overflowWrap: "anywhere" }}
                          >
                            {c.name}
                          </Typography>
                          <StatusChip status={c.status} />
                        </Stack>
                        {c.code !== c.name && (
                          <Typography variant="caption" color="text.secondary">
                            {c.code}
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary">
                          {c.schedule}
                        </Typography>
                        <Typography variant="caption">
                          {c.studentCount} học sinh · {c.completedUnits}/
                          {c.totalUnits} Unit hoàn thành
                        </Typography>
                      </Stack>
                    </ButtonBase>
                  ))}
                </Stack>
                <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
                  <Table aria-label="Danh sách lớp" sx={{ minWidth: 800 }}>
                    <TableHead>
                      <TableRow>
                        {[
                          "Lớp / Mã",
                          "Lịch học",
                          "Học sinh",
                          "Trạng thái",
                          "Tiến độ Unit",
                        ].map((h) => (
                          <TableCell key={h}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((c) => (
                        <NavigationRow
                          key={c.id}
                          href={"/class/?classId=" + encodeURIComponent(c.id)}
                          aria-label={`Mở lớp ${c.name}`}
                        >
                          <TableCell>
                            <Typography
                              sx={{
                                fontWeight: 600,
                              }}
                            >
                              <Link
                                href={
                                  "/class/?classId=" + encodeURIComponent(c.id)
                                }
                                style={{
                                  color: "inherit",
                                  textDecoration: "none",
                                }}
                              >
                                {c.name}
                              </Link>
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
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
                        </NavigationRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Feedback empty="Chưa có lớp phù hợp bộ lọc." />
            )}
            <TablePagination
              component="div"
              sx={{
                "& .MuiTablePagination-toolbar": { px: { xs: 0, sm: 2 } },
                "& .MuiTablePagination-selectLabel": {
                  display: { xs: "none", sm: "block" },
                },
                "& .MuiTablePagination-spacer": {
                  display: { xs: "none", sm: "block" },
                },
              }}
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
