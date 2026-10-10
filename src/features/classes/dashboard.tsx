"use client";
import {ClassNotificationSettings} from "@/features/notifications/class-settings";
import {ClassPresenceContext,ClassMembersButton} from "@/features/presence/roster";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useClassQuery, useStudentsQuery } from "@/api/api";
import { useClassCapabilities, useWorkspace } from "@/features/access/hooks";
import { ClassManagementProfile } from "@/features/management/profile";
import { ClassThreadFeed } from "@/features/materials/feed";
import { ClassStudentTable } from "@/features/students/class-table";
import { StudentEditor } from "@/features/students/editor";
import { Card, Feedback, NavButton, StatusChip, Title } from "@/shared/ui";
import type { Class, Student } from "@/types";
import { ClassDetailTabs, initialClassTab, type ClassTab } from "./detail-tabs";
import { ClassProgress } from "./progress";

const ClassRewardActions = dynamic(() =>
  import("@/features/rewards/class-actions").then((m) => m.ClassRewardActions),
);
function TeacherClassProfile({
  classId,
  classInfo,
  editable,
}: {
  classId: string;
  classInfo: Class;
  editable: boolean;
}) {
  const students = useStudentsQuery(classId),
    [student, setStudent] = useState<Student | null>(null),
    [message, setMessage] = useState("");
  return (
    <Stack spacing={2.5}>
      <Card>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Hồ sơ lớp học
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Mã lớp
            </Typography>
            <Typography>{classInfo.code}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Tên lớp
            </Typography>
            <Typography>{classInfo.name}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Lịch học
            </Typography>
            <Typography>{classInfo.schedule}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Trạng thái
            </Typography>
            <Box>
              <StatusChip status={classInfo.status} />
            </Box>
          </Box>
        </Box>
      </Card>
      <Card>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Danh sách học sinh
        </Typography>
        {students.isLoading ||
        (students.isFetching && !students.currentData) ||
        students.error ? (
          <Feedback
            loading={
              students.isLoading ||
              (students.isFetching && !students.currentData)
            }
            error={students.error}
            retry={() => void students.refetch()}
          />
        ) : (
          <ClassStudentTable
            students={students.currentData ?? []}
            classId={classId}
            profileHref={(s) =>
              `/student/?classId=${encodeURIComponent(classId)}&studentId=${encodeURIComponent(s.id)}`
            }
            onEdit={editable ? setStudent : undefined}
          />
        )}
      </Card>
      {student && editable && (
        <StudentEditor
          key={student.id}
          classId={classId}
          student={student}
          close={(saved) => {
            setStudent(null);
            if (saved) setMessage("Đã lưu thông tin học sinh.");
          }}
        />
      )}
      <Snackbar
        open={!!message}
        autoHideDuration={4000}
        message={message}
        onClose={() => setMessage("")}
      />
    </Stack>
  );
}
function TeacherClassDashboard({
  id,
  initialTab,
}: {
  id: string;
  initialTab: ClassTab;
}) {
  const query = useClassQuery(id),
    permissions = useClassCapabilities(id),
    [tab, setTab] = useState(initialTab);
  if (
    permissions.loading ||
    query.isLoading ||
    (query.isFetching && !query.currentData) ||
    permissions.error ||
    query.error
  )
    return (
      <Feedback
        loading={
          permissions.loading ||
          query.isLoading ||
          (query.isFetching && !query.currentData)
        }
        error={permissions.error || query.error}
        retry={() => {
          void permissions.retry();
          void query.refetch();
        }}
      />
    );
  if (!query.currentData || !permissions.viewLearning)
    return (
      <Feedback empty="Không có quyền xem lớp này hoặc lớp không tồn tại." />
    );
  const c = query.currentData;
  return (
    <>
      <Title
        title={c.name}
        subtitle={`${c.code} · ${c.studentCount} học sinh`}
        actions={<NavButton href="/home/">← Danh sách lớp</NavButton>}
      />
      <ClassRewardActions
        classId={c.id}
        name={c.name}
        editable={permissions.editLearning}
      />
      <ClassPresenceContext classId={c.id}/>
      <Stack direction="row"><ClassMembersButton classId={c.id}/><ClassNotificationSettings classId={c.id}/></Stack>
      <ClassDetailTabs
        attendance={<AttendancePanel classId={c.id} />}
        value={tab}
        onChange={setTab}
        thread={
          <ClassThreadFeed classId={c.id} editable={permissions.editLearning} />
        }
        progress={
          <ClassProgress
            classId={id}
            classInfo={c}
            editable={permissions.editLearning}
          />
        }
        profile={
          <TeacherClassProfile
            classId={id}
            classInfo={c}
            editable={permissions.editLearning}
          />
        }
      />
    </>
  );
}
const AttendancePanel = dynamic(
  () =>
    import("@/features/attendance/class-panel").then(
      (m) => m.ClassAttendancePanel,
    ),
  { loading: () => <Feedback loading /> },
);
export function ClassDashboard() {
  const params = useSearchParams(),
    id = params.get("classId") ?? "",
    workspace = useWorkspace();
  if (!id) return <Feedback empty="Thiếu classId. Hãy mở lớp từ trang chủ." />;
  return workspace.selected === "manager" ? (
    <ClassManagementProfile key={id} classId={id} />
  ) : (
    <TeacherClassDashboard
      key={id}
      id={id}
      initialTab={initialClassTab(params.get("tab"))}
    />
  );
}
