"use client";
import { ReadOnlyNotice, useClassCapabilities } from "@/features/access/hooks";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import {
  useClassQuery,
  useSessionsQuery,
  useAssessmentsQuery,
  useCreateAssessmentMutation,
} from "@/api/api";
import {
  Card,
  Feedback,
  NavButton,
  Progress,
  StatusChip,
  Title,
} from "@/shared/ui";
import { route } from "@/utils/context";
import { confirmLeave } from "@/shared/unsaved";
import {
  defaultSchema,
  SchemaEditor,
} from "@/features/assessments/schema-editor";
import { SessionEditor } from "./editor";
export function SessionDetail() {
  const params = useSearchParams(),
    classId = params.get("classId") ?? "",
    sessionId = params.get("sessionId") ?? "",
    ready = !!classId && !!sessionId;
  const permissions=useClassCapabilities(classId);
  const c = useClassQuery(classId, { skip: !ready }),
    sessions = useSessionsQuery(classId, { skip: !ready }),
    list = useAssessmentsQuery(sessionId, { skip: !ready });
  const [editing, setEditing] = useState(false),
    [creating, setCreating] = useState(false),
    [message, setMessage] = useState(""),
    [create, state] = useCreateAssessmentMutation();
  if (!ready) return <Feedback empty="Thiếu classId hoặc sessionId." />;
  if (
    permissions.loading || c.isLoading ||
    (c.isFetching && !c.currentData) ||
    sessions.isLoading ||
    (sessions.isFetching && !sessions.currentData) ||
    list.isLoading ||
    (list.isFetching && !list.currentData) ||
    permissions.error || c.error ||
    sessions.error ||
    list.error
  )
    return (
      <Feedback
        loading={
          permissions.loading || c.isLoading ||
          (c.isFetching && !c.currentData) ||
          sessions.isLoading ||
          (sessions.isFetching && !sessions.currentData) ||
          list.isLoading ||
          (list.isFetching && !list.currentData)
        }
        error={permissions.error || c.error || sessions.error || list.error}
        retry={() => {
          void permissions.retry();
          void c.refetch();
          void sessions.refetch();
          void list.refetch();
        }}
      />
    );
  const session = sessions.currentData?.find((s) => s.id === sessionId);
  if (!session || !c.currentData)
    return <Alert severity="error">Phiên học không thuộc lớp này.</Alert>;
  return (
    <>
      <Title
        title={session.name + " · Phiên học"}
        subtitle={`${c.currentData.name} · ${session.date}`}
        actions={
          <>
            <NavButton href={"/class/?classId=" + encodeURIComponent(classId)}>
              ← Dashboard lớp
            </NavButton>
            <Button disabled={!permissions.editLearning} onClick={() => setEditing(true)}>Thông tin phiên</Button>
            <Button disabled={!permissions.editLearning} variant="contained" onClick={() => setCreating(true)}>
              Tạo bài đánh giá
            </Button>
          </>
        }
      />
      <ReadOnlyNotice editable={permissions.editLearning}/>
      <Card>
        <Stack
          sx={{
            gap: 2,
          }}
        >
          <StatusChip status={session.status} />
          <Progress
            completed={c.currentData.completedUnits}
            total={c.currentData.totalUnits}
          />
          <Typography sx={{ whiteSpace: "pre-wrap" }}>
            {session.note || "Chưa có ghi chú."}
          </Typography>
        </Stack>
      </Card>
      <Typography variant="h5" sx={{ my: 2.5 }}>
        Bài đánh giá
      </Typography>
      {list.currentData?.length ? (
        <Stack
          sx={{
            gap: 2,
          }}
        >
          {list.currentData.map((a) => {
            const context = { classId, sessionId, assessmentId: a.id };
            return (
              <Card key={a.id}>
                <Stack
                  sx={{
                    gap: 2,
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography variant="h5">{a.name}</Typography>
                    <StatusChip status={a.status} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {a.type === "FINAL_TEST"
                      ? "Kiểm tra cuối kỳ"
                      : "Theo dõi tiến bộ"}{" "}
                    · {a.skills.length} kỹ năng · Tổng tối đa{" "}
                    {a.skills.reduce((n, s) => n + s.maxQuestions, 0)} · Schema
                    v{a.schemaVersion}
                  </Typography>
                  <Stack
                    direction="row"
                    useFlexGap
                    sx={{
                      flexWrap: "wrap",
                      gap: 1,
                    }}
                  >
                    <NavButton href={route("/scores/", context)} primary>
                      {permissions.editLearning?"Nhập điểm dạng bảng":"Xem bảng điểm"}
                    </NavButton>
                    <NavButton href={route("/student-score/", context)}>
                      {permissions.editLearning?"Nhập từng học sinh":"Xem từng học sinh"}
                    </NavButton>
                    <NavButton href={route("/assessment/", context)}>
                      {permissions.editLearning?"Sửa cấu hình":"Xem schema"}
                    </NavButton>
                    <NavButton href={route("/import/", context)}>
                      {permissions.editLearning?"Import Excel":"Xem file mẫu"}
                    </NavButton>
                  </Stack>
                </Stack>
              </Card>
            );
          })}
        </Stack>
      ) : (
        <Feedback empty="Chưa có bài đánh giá. Tạo bài để nhập điểm." />
      )}
      {editing && permissions.editLearning && (
        <SessionEditor
          classId={classId}
          session={session}
          totalUnits={c.currentData.totalUnits}
          close={(saved) => {
            setEditing(false);
            if (saved) setMessage("Đã lưu phiên học.");
          }}
        />
      )}
      <Dialog
        open={creating && permissions.editLearning}
        onClose={() => {
          if (confirmLeave()) setCreating(false);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Tạo bài đánh giá</DialogTitle>
        <DialogContent>
          <SchemaEditor
            initial={defaultSchema}
            busy={state.isLoading}
            submit={async (assessment) => {
              await create({ sessionId, assessment }).unwrap();
              setCreating(false);
              setMessage("Đã tạo bài đánh giá.");
            }}
          />
          <Button
            onClick={() => {
              if (confirmLeave()) setCreating(false);
            }}
            sx={{ mt: 2 }}
          >
            Hủy
          </Button>
        </DialogContent>
      </Dialog>
      <Snackbar
        open={!!message}
        message={message}
        autoHideDuration={4000}
        onClose={() => setMessage("")}
      />
    </>
  );
}
