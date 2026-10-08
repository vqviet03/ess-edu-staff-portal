"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";
import { useClassQuery, useHistoricalStudentsQuery } from "@/api/api";
import { useClassCapabilities } from "@/features/access/hooks";
import { Card, Feedback, NavButton, StatusChip, Title } from "@/shared/ui";
import { publicId } from "@/shared/public-id";
import { StudentEditor } from "./editor";

export function StudentDetail() {
  const params = useSearchParams(),
    classId = params.get("classId") ?? "",
    studentId = params.get("studentId") ?? "",
    permissions = useClassCapabilities(classId),
    c = useClassQuery(classId, { skip: !classId }),
    students = useHistoricalStudentsQuery(classId, {
      skip: !classId || !studentId || !permissions.viewLearning,
    }),
    [edit, setEdit] = useState(false),
    [message, setMessage] = useState("");
  if (!classId || !studentId)
    return (
      <Feedback empty="Thiếu lớp hoặc học sinh. Hãy mở hồ sơ từ danh sách học sinh của lớp." />
    );
  if (
    permissions.loading ||
    c.isLoading ||
    students.isLoading ||
    permissions.error ||
    c.error ||
    students.error
  )
    return (
      <Feedback
        loading={permissions.loading || c.isLoading || students.isLoading}
        error={permissions.error || c.error || students.error}
        retry={() => {
          void permissions.retry();
          void c.refetch();
          if (permissions.viewLearning) void students.refetch();
        }}
      />
    );
  if (!permissions.viewLearning)
    return <Feedback empty="Bạn không có quyền xem học sinh của lớp này." />;
  const student = students.currentData?.find(
    (s) =>
      s.id === studentId ||
      s.publicId === studentId ||
      s.studentCode === studentId,
  );
  if (!student)
    return (
      <Feedback empty="Học sinh không thuộc lớp này hoặc không còn dữ liệu hồ sơ." />
    );
  const profileId = publicId(student.publicId, student.studentCode, student.id);
  return (
    <>
      <Title
        title={student.name}
        subtitle={`Hồ sơ học sinh · ${c.currentData?.name ?? ""}`}
        actions={
          <>
            <NavButton
              href={`/class/?classId=${encodeURIComponent(classId)}&tab=profile`}
            >
              ← Hồ sơ lớp học
            </NavButton>
            <NavButton
              href={`/reports/?classId=${encodeURIComponent(classId)}&studentId=${encodeURIComponent(student.id)}`}
            >
              Báo cáo học tập
            </NavButton>
            {permissions.editLearning && (
              <Button variant="contained" onClick={() => setEdit(true)}>
                Chỉnh sửa thông tin học sinh
              </Button>
            )}
          </>
        }
      />
      <Card>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          {[
            ["ID", profileId],
            ["Họ tên", student.name],
            ["Biệt danh", student.nickname || "—"],
            [
              "Ngày sinh",
              student.dateOfBirth
                ? new Date(
                    student.dateOfBirth + "T00:00:00",
                  ).toLocaleDateString("vi-VN")
                : "—",
            ],
          ].map(([label, value]) => (
            <Box key={label}>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography>{value}</Typography>
            </Box>
          ))}
          <Box>
            <Typography variant="caption" color="text.secondary">
              Trạng thái
            </Typography>
            <Box>
              <StatusChip status={student.status} />
            </Box>
          </Box>
        </Box>
      </Card>
      {edit && permissions.editLearning && (
        <StudentEditor
          key={student.id}
          student={student}
          classId={classId}
          close={(saved) => {
            setEdit(false);
            if (saved) setMessage("Đã lưu thông tin học sinh.");
          }}
        />
      )}
      <Snackbar
        open={!!message}
        message={message}
        autoHideDuration={4000}
        onClose={() => setMessage("")}
      />
    </>
  );
}
