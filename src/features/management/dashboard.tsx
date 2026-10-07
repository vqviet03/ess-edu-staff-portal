"use client";
import { exportPrefix } from "@/features/settings/branding";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  useDashboardQuery,
  useManagementListQuery,
} from "@/api/management-api";
import { errorMessage } from "@/api/base-query";
import { Card, Feedback, NavButton, Progress, Title } from "@/shared/ui";
import { ManagerOnly, showValue } from "./shared";
import { recordName, type StatsFilter } from "./models";
export function ManagementDashboard() {
  return (
    <ManagerOnly>
      <Dashboard />
    </ManagerOnly>
  );
}
function Dashboard() {
  const [filter, setFilter] = useState<StatsFilter>({
      from: "",
      to: "",
      classId: "",
      status: "",
    }),
    [error, setError] = useState(""),
    [exporting, setExporting] = useState(false);
  const q = useDashboardQuery(filter),
    classes = useManagementListQuery({
      entity: "classes",
      filter: {},
      page: 1,
      pageSize: 100,
    });
  const stats = q.currentData,
    set = (k: string, v: string) => setFilter((old) => ({ ...old, [k]: v }));
  return (
    <>
      <Title title="Tổng quan" subtitle="Theo dõi vận hành và lớp cần xử lý" />
      <Stack
        direction={{ xs: "column", sm: "row" }}
        useFlexGap
        sx={{ gap: 1.5, flexWrap: "wrap", mb: 2.5 }}
      >
        <TextField
          label="Từ ngày"
          type="date"
          value={filter.from}
          onChange={(e) => set("from", e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { sm: 175 } }}
        />
        <TextField
          label="Đến ngày"
          type="date"
          value={filter.to}
          onChange={(e) => set("to", e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { sm: 175 } }}
        />
        <TextField
          select
          label="Lớp"
          value={filter.classId}
          onChange={(e) => set("classId", e.target.value)}
          sx={{ width: { sm: 190 } }}
        >
          <MenuItem value="">Tất cả lớp</MenuItem>
          {classes.currentData?.items.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {recordName(c)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Trạng thái lớp"
          value={filter.status}
          onChange={(e) => set("status", e.target.value)}
          sx={{ width: { sm: 170 } }}
        >
          <MenuItem value="">Tất cả</MenuItem>
          {["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "INACTIVE"].map((s) => (
            <MenuItem key={s} value={s}>
              {showValue(s)}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="outlined"
          loading={exporting}
          disabled={!stats}
          onClick={async () => {
            if (!stats) return;
            try {
              setExporting(true);
              const { statsWorkbook } = await import("./excel-workbook"),
                { download } = await import("@/features/excel/workbook");
              download(await statsWorkbook(stats, filter), `${exportPrefix()}_thong_ke.xlsx`);
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setExporting(false);
            }
          }}
        >
          Xuất thống kê
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {q.isLoading || (q.isFetching && !stats) || q.error ? (
        <Feedback
          loading={q.isLoading || (q.isFetching && !stats)}
          error={q.error}
          retry={() => void q.refetch()}
        />
      ) : stats ? (
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2,minmax(0,1fr))",
                lg: "repeat(4,minmax(0,1fr))",
              },
              gap: 1.5,
            }}
          >
            {[
              [
                stats.activeStudents,
                "Học sinh hoạt động",
                `${stats.pendingAccounts} tài khoản chờ kích hoạt`,
              ],
              [
                stats.activeTeachers,
                "Giảng viên hoạt động",
                `${stats.dualRoleStaff} Staff có cả hai vai trò`,
              ],
              [
                stats.byStatus.ACTIVE,
                "Lớp đang học",
                `${stats.warnings.length} lớp chưa có người phụ trách`,
              ],
              [
                `${stats.totalUnits ? ((stats.completedUnits / stats.totalUnits) * 100).toFixed(1) : "0"}%`,
                "Unit hoàn thành",
                `${stats.completedUnits} / ${stats.totalUnits} Unit`,
              ],
            ].map(([n, label, detail]) => (
              <Card key={label}>
                <Stack spacing={2}>
                  <Typography
                    sx={{ fontSize: 30, fontWeight: 700 }}
                    color="primary"
                  >
                    {n}
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>{label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {detail}
                  </Typography>
                </Stack>
              </Card>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">
            Chỉ số hiện tại lúc {new Date(stats.asOf).toLocaleString("vi-VN")};
            phạm vi lớp/trạng thái đang chọn. Tiến độ = tổng Unit riêng biệt
            hoàn thành trong từng lớp / tổng Unit các lớp.
          </Typography>
          {stats.warnings.length > 0 && (
            <Alert severity="warning" icon={false} sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700 }}>
                {stats.warnings.length} lớp đang học không có giảng viên phụ
                trách
              </Typography>
              <Typography sx={{ my: 1 }}>
                {stats.warnings.map((w) => w.className).join(", ")} cần phân
                công. Cảnh báo giữ nguyên đến khi có giảng viên hoạt động đang
                phụ trách.
              </Typography>
              <NavButton href="/manage/warnings/" primary>
                Xử lý danh sách
              </NavButton>
            </Alert>
          )}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 1.5,
            }}
          >
            <Card>
              <Typography variant="h5" sx={{ mb: 1 }}>
                Tiến độ các lớp
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                Unit đã hoàn thành / tổng Unit
              </Typography>
              <Stack spacing={2}>
                {stats.classes.map((c) => (
                  <Box key={c.id}>
                    <Typography sx={{ fontWeight: 600, mb: 1 }}>
                      {c.name}
                    </Typography>
                    <Progress
                      completed={c.completedUnits}
                      total={c.totalUnits}
                    />
                  </Box>
                ))}
              </Stack>
              {!stats.classes.length && (
                <Feedback empty="Không có lớp trong phạm vi." />
              )}
            </Card>
            <Card>
              <Typography variant="h5" sx={{ mb: 1 }}>
                Trạng thái lớp
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                Biểu đồ thanh · Số lớp hiện tại
              </Typography>
              <Stack spacing={2}>
                {Object.entries(stats.byStatus).map(([status, n]) => (
                  <Box
                    key={status}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "130px 1fr",
                      gap: 1.5,
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="body2">{showValue(status)}</Typography>
                    <Box
                      role="img"
                      aria-label={`${showValue(status)}: ${n} lớp`}
                      sx={{
                        p: 0.5,
                        minWidth: 28,
                        width: `${Math.max(8, (n / Math.max(1, ...Object.values(stats.byStatus))) * 100)}%`,
                        bgcolor: "action.selected",
                        color: "primary.main",
                        fontWeight: 700,
                        borderRadius: 1,
                      }}
                    >
                      {n}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Card>
          </Box>
          <Card>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Lớp cần chú ý
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Mở hồ sơ để phân công giảng viên.
            </Typography>
            <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    {["Lớp", "Tiến độ", "Giảng viên hoạt động", "Cảnh báo"].map(
                      (h) => (
                        <TableCell key={h}>{h}</TableCell>
                      ),
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.warnings.map((w) => {
                    const c = stats.classes.find((c) => c.id === w.classId)!;
                    return (
                      <TableRow key={w.classId}>
                        <TableCell>
                          <NavButton
                            href={`/manage/profile/?entity=classes&id=${encodeURIComponent(c.id)}`}
                          >
                            {c.name}
                          </NavButton>
                        </TableCell>
                        <TableCell>
                          <Progress
                            completed={c.completedUnits}
                            total={c.totalUnits}
                          />
                        </TableCell>
                        <TableCell>0</TableCell>
                        <TableCell>Trống giảng viên</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack spacing={1.5} sx={{ display: { md: "none" } }}>
              {stats.warnings.map((w) => (
                <Box key={w.classId}>
                  <Typography sx={{ fontWeight: 600 }}>
                    {w.className}
                  </Typography>
                  <Typography>Trống giảng viên</Typography>
                  <NavButton
                    href={`/manage/profile/?entity=classes&id=${encodeURIComponent(w.classId)}`}
                  >
                    Hồ sơ & phân công
                  </NavButton>
                </Box>
              ))}
            </Stack>
            {!stats.warnings.length && (
              <Feedback empty="Không có lớp cần xử lý trong phạm vi." />
            )}
            <Box sx={{ mt: 2 }}>
              <NavButton href="/manage/list/?entity=classes">
                Xem lớp học
              </NavButton>
            </Box>
          </Card>
          <Card>
            <Typography variant="h5">Chỉ số theo khoảng ngày học</Typography>
            <Typography sx={{ mt: 1 }}>
              Từ {filter.from || "đầu dữ liệu"} đến {filter.to || "hiện tại"}:{" "}
              {stats.interval.completedSessions} phiên hoàn thành;{" "}
              {stats.interval.newlyCompletedUnits} Unit lần đầu hoàn thành /{" "}
              {stats.interval.denominator} Unit trong phạm vi.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Unit đếm riêng theo lớp; nhiều phiên cùng Unit không đếm trùng.
              Khoảng thời gian dùng ngày học của phiên, không dùng điểm số.
            </Typography>
          </Card>
        </Stack>
      ) : (
        <Feedback empty="Chưa có thống kê." />
      )}
    </>
  );
}
