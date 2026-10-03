"use client";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Snackbar from "@mui/material/Snackbar";
import { useUpdateAssessmentMutation } from "@/api/api";
import { errorMessage } from "@/api/base-query";
import { Card, Feedback, NavButton, StatusChip, Title } from "@/shared/ui";
import { route } from "@/utils/context";
import { confirmLeave } from "@/shared/unsaved";
import { useScoreContext } from "@/features/scores/context";
import { SchemaEditor } from "./schema-editor";
export function AssessmentDetail() {
  const q = useScoreContext(),
    [update, state] = useUpdateAssessmentMutation(),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  if (q.loading || q.error || q.empty)
    return (
      <Feedback
        loading={q.loading}
        error={q.error}
        empty={q.empty}
        retry={q.retry}
      />
    );
  const a = q.assessment;
  if (!a) return <Feedback empty="Không có bài đánh giá." />;
  return (
    <>
      <Title
        title="Cấu hình bài đánh giá"
        subtitle={`${a.name} · Schema v${a.schemaVersion}`}
        actions={
          <>
            <NavButton href={route("/session/", q.context)}>
              ← Phiên học
            </NavButton>
            <NavButton href={route("/scores/", q.context)}>Bảng điểm</NavButton>
            <NavButton href={route("/import/", q.context)}>
              Import Excel
            </NavButton>
          </>
        }
      />
      <Stack
        direction="row"
        sx={{
          ...{ mb: 2 },
          gap: 2,
          alignItems: "center",
        }}
      >
        <StatusChip status={a.status} />
        <Button
          disabled={state.isLoading}
          onClick={async () => {
            if (
              !confirmLeave() ||
              !window.confirm(
                a.status === "DRAFT"
                  ? "Hoàn thành và khóa điểm bài đánh giá?"
                  : "Mở lại bài đánh giá để chỉnh sửa?",
              )
            )
              return;
            try {
              setError("");
              await update({
                ...a,
                status: a.status === "DRAFT" ? "COMPLETED" : "DRAFT",
              }).unwrap();
              setMessage("Đã cập nhật trạng thái bài đánh giá.");
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        >
          {a.status === "DRAFT" ? "Đánh dấu hoàn thành" : "Chuyển về nháp"}
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Card>
        <SchemaEditor
          key={a.version}
          initial={{ name: a.name, type: a.type, skills: a.skills }}
          results={q.results}
          locked={a.status === "COMPLETED"}
          busy={state.isLoading}
          submit={async (values, confirmed) => {
            await update({
              ...a,
              ...values,
              confirmSchemaChange: confirmed,
            }).unwrap();
            setMessage("Đã lưu cấu hình bài đánh giá.");
          }}
        />
      </Card>
      <Snackbar
        open={!!message}
        message={message}
        autoHideDuration={4000}
        onClose={() => setMessage("")}
      />
    </>
  );
}
