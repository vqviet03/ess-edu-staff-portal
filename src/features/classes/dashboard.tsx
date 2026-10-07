"use client";
import { publicId } from "@/shared/public-id";
import { ReadOnlyNotice, useClassCapabilities } from "@/features/access/hooks";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useClassQuery, useStudentsQuery, useSessionsQuery } from "@/api/api";
import {
  Card,
  Feedback,
  NavButton,
  Progress,
  StatusChip,
  Title,
} from "@/shared/ui";
import { completedUnitNumbers } from "@/utils/scores";
import { StudentEditor } from "@/features/students/editor";
import { SessionEditor } from "@/features/sessions/editor";
import type { Student } from "@/types";
export function ClassDashboard() {
  const id = useSearchParams().get("classId") ?? "",
    c = useClassQuery(id, { skip: !id }),
    students = useStudentsQuery(id, { skip: !id }),
    sessions = useSessionsQuery(id, { skip: !id });
  const permissions=useClassCapabilities(id);
  const [tab, setTab] = useState(0),
    [student, setStudent] = useState<Student | null>(null),
    [create, setCreate] = useState(false),
    [message, setMessage] = useState("");
  if (!id) return <Feedback empty="Thiếu classId. Hãy mở lớp từ trang chủ." />;
  if (
    permissions.loading || c.isLoading ||
    (c.isFetching && !c.currentData) ||
    students.isLoading ||
    (students.isFetching && !students.currentData) ||
    sessions.isLoading ||
    (sessions.isFetching && !sessions.currentData) ||
    permissions.error || c.error ||
    students.error ||
    sessions.error
  )
    return (
      <Feedback
        loading={
          permissions.loading || c.isLoading ||
          (c.isFetching && !c.currentData) ||
          students.isLoading ||
          (students.isFetching && !students.currentData) ||
          sessions.isLoading ||
          (sessions.isFetching && !sessions.currentData)
        }
        error={permissions.error || c.error || students.error || sessions.error}
        retry={() => {
          void permissions.retry();
          void c.refetch();
          void students.refetch();
          void sessions.refetch();
        }}
      />
    );
  if (!c.currentData) return <Feedback empty="Lớp không tồn tại." />;
  const completed = completedUnitNumbers(sessions.currentData ?? []);
  return (
    <>
      <Title
        title={c.currentData.name}
        subtitle={`${c.currentData.code} · ${c.currentData.schedule} · ${c.currentData.studentCount} học sinh`}
        actions={<NavButton href="/home/">← Danh sách lớp</NavButton>}
      />
      <ReadOnlyNotice editable={permissions.editLearning}/>
      <Card>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Tiến độ lớp
        </Typography>
        <Progress
          completed={completed.length}
          total={c.currentData.totalUnits}
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))",
            gap: 1,
            mt: 2,
          }}
        >
          {Array.from({ length: c.currentData.totalUnits }, (_, i) => {
            const done = completed.includes(i + 1),
              started = sessions.currentData?.some(
                (s) => s.unitNumber === i + 1,
              );
            return (
              <Box
                key={i}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: done ? "primary.main" : "action.hover",
                  color: done ? "primary.contrastText" : "text.primary",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 600,
                  }}
                >
                  Unit {i + 1}
                </Typography>
                <Typography variant="caption">
                  {done ? "Hoàn thành" : started ? "Đang học" : "Chưa học"}
                </Typography>
              </Box>
            );
          })}
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 2 }}
        >
          Số Unit riêng biệt có phiên hoàn thành / tổng Unit của lớp.
        </Typography>
      </Card>
      <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ my: 2 }}>
        <Tab label="Học sinh" />
        <Tab label="Phiên học" />
      </Tabs>
      <Card>
        {tab === 0 ? (
          <>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Danh sách học sinh
            </Typography>
            {students.currentData?.length ? (
              <TableContainer>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      {[
                        "ID",
                        "Họ tên",
                        "Biệt danh",
                        "Ngày sinh",
                        "Trạng thái",
                        "",
                      ].map((h, i) => (
                        <TableCell key={i}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.currentData.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{publicId(s.publicId, s.studentCode, s.id)}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.nickname || "—"}</TableCell>
                        <TableCell>
                          {s.dateOfBirth
                            ? new Date(
                                s.dateOfBirth + "T00:00:00",
                              ).toLocaleDateString("vi-VN")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusChip status={s.status} />
                        </TableCell>
                        <TableCell>
                          <NavButton href={`/reports/?classId=${encodeURIComponent(id)}&studentId=${encodeURIComponent(s.id)}`}>Báo cáo học tập</NavButton>
                          <Button
                            disabled={!permissions.editLearning}
                            onClick={() => setStudent(s)}
                            aria-label={"Sửa " + s.name}
                          >
                            Chỉnh sửa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Feedback empty="Lớp chưa có học sinh." />
            )}
          </>
        ) : (
          <>
            <Stack
              direction="row"
              sx={{
                ...{ mb: 2 },
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Typography variant="h5">Phiên học</Typography>
              <Button disabled={!permissions.editLearning} variant="contained" onClick={() => setCreate(true)}>
                Tạo phiên học
              </Button>
            </Stack>
            {sessions.currentData?.length ? (
              <Stack spacing={2}>
                {sessions.currentData.map((s) => (
                  <Box
                    key={s.id}
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 2,
                    }}
                  >
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontWeight: 600,
                          }}
                        >
                          {s.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {s.date} ·{" "}
                          {s.unitNumber
                            ? "Unit " + s.unitNumber
                            : "Không gắn Unit"}
                        </Typography>
                      </Box>
                      <StatusChip status={s.status} />
                    </Stack>
                    <Typography sx={{ my: 1, whiteSpace: "pre-wrap" }}>
                      {s.note}
                    </Typography>
                    <NavButton
                      href={`/session/?classId=${encodeURIComponent(id)}&sessionId=${encodeURIComponent(s.id)}`}
                    >
                      Mở phiên
                    </NavButton>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Feedback empty="Chưa có phiên học. Tạo phiên đầu tiên để bắt đầu." />
            )}
          </>
        )}
      </Card>
      {student && permissions.editLearning && (
        <StudentEditor
          key={student.id}
          classId={id}
          student={student}
          close={(saved) => {
            setStudent(null);
            if (saved) setMessage("Đã lưu thông tin học sinh.");
          }}
        />
      )}
      {create && permissions.editLearning && (
        <SessionEditor
          classId={id}
          totalUnits={c.currentData.totalUnits}
          close={(saved) => {
            setCreate(false);
            if (saved) setMessage("Đã tạo phiên học.");
          }}
        />
      )}
      <Snackbar
        open={!!message}
        autoHideDuration={4000}
        onClose={() => setMessage("")}
        message={message}
      />
    </>
  );
}
