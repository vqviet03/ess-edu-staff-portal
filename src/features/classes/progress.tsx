"use client";
import Link from "next/link";
import ButtonBase from "@mui/material/ButtonBase";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useSessionsQuery } from "@/api/api";
import { ReadOnlyNotice } from "@/features/access/hooks";
import { SessionEditor } from "@/features/sessions/editor";
import { Card, Feedback, Progress, StatusChip } from "@/shared/ui";
import { completedUnitNumbers } from "@/utils/scores";
import type { Class } from "@/types";

export function ClassProgress({
  classId,
  classInfo,
  editable,
}: {
  classId: string;
  classInfo: Class;
  editable: boolean;
}) {
  const query = useSessionsQuery(classId, { skip: !classId }),
    [create, setCreate] = useState(false),
    [message, setMessage] = useState("");
  const completed = completedUnitNumbers(query.currentData ?? []);
  if (
    query.isLoading ||
    (query.isFetching && !query.currentData) ||
    query.error
  )
    return (
      <Feedback
        loading={query.isLoading || (query.isFetching && !query.currentData)}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  return (
    <Stack spacing={2.5}>
      <ReadOnlyNotice editable={editable} />
      <Card>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Tiến độ Unit
        </Typography>
        <Progress completed={completed.length} total={classInfo.totalUnits} />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))",
            gap: 1,
            mt: 2,
          }}
        >
          {Array.from({ length: classInfo.totalUnits }, (_, i) => {
            const done = completed.includes(i + 1),
              started = query.currentData?.some((s) => s.unitNumber === i + 1);
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
                <Typography sx={{ fontWeight: 600 }}>Unit {i + 1}</Typography>
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
      <Card>
        <Stack
          direction="row"
          sx={{
            mb: 2,
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography variant="h5">Phiên học</Typography>
          <Button
            variant="contained"
            disabled={!editable}
            onClick={() => setCreate(true)}
          >
            Tạo phiên học
          </Button>
        </Stack>
        {query.currentData?.length ? (
          <Stack spacing={1}>
            {query.currentData.map((s) => (
              <ButtonBase
                component={Link}
                aria-label={`Phiên học ${s.name}`}
                href={`/session/?classId=${encodeURIComponent(classId)}&sessionId=${encodeURIComponent(s.id)}`}
                key={s.id}
                sx={{
                  p: { xs: 1.25, md: 2 },
                  display: "block",
                  textAlign: "left",
                  minHeight: 44,
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
                    <Typography sx={{ fontWeight: 600 }}>{s.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {s.date} ·{" "}
                      {s.unitNumber ? "Unit " + s.unitNumber : "Không gắn Unit"}
                    </Typography>
                  </Box>
                  <StatusChip status={s.status} />
                </Stack>
                {s.note && (
                  <Typography
                    variant="body2"
                    sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}
                  >
                    {s.note}
                  </Typography>
                )}
              </ButtonBase>
            ))}
          </Stack>
        ) : (
          <Feedback
            empty={
              editable
                ? "Chưa có phiên học. Tạo phiên đầu tiên để bắt đầu."
                : "Lớp chưa có phiên học."
            }
          />
        )}
      </Card>
      {create && editable && (
        <SessionEditor
          classId={classId}
          totalUnits={classInfo.totalUnits}
          close={(saved) => {
            setCreate(false);
            if (saved) setMessage("Đã tạo phiên học.");
          }}
        />
      )}
      <Snackbar
        open={!!message}
        message={message}
        autoHideDuration={4000}
        onClose={() => setMessage("")}
      />
    </Stack>
  );
}
