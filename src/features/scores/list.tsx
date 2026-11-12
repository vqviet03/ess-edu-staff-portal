"use client";
import Link from "next/link";
import ButtonBase from "@mui/material/ButtonBase";
import { ProfileAvatar } from "@/features/profile/avatar";
import { publicId } from "@/shared/public-id";
import { ReadOnlyNotice } from "@/features/access/hooks";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { confirmLeave } from "@/shared/unsaved";
import { Feedback, NavButton, Title } from "@/shared/ui";
import { route } from "@/utils/context";
import { calculate, emptyResult, percent } from "@/utils/scores";
import { useScoreContext } from "./context";
const ScoreTable = dynamic(() => import("./table"), {
  ssr: false,
  loading: () => <Feedback loading />,
});
export function Scores() {
  const q = useScoreContext(),
    [showTable, setShowTable] = useState(false);
  const desktop = useMediaQuery(useTheme().breakpoints.up("md"));
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (desktop || showTable) setLoaded(true);
  }, [desktop, showTable]);
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
        title={q.canEdit ? "Nhập nhanh theo bảng" : "Bảng điểm · Chỉ xem"}
        subtitle={`${a.name} · ${a.skills.length} kỹ năng · Schema v${a.schemaVersion}`}
        actions={
          <>
            <NavButton back href={route("/session/", q.context)}>
              ← Phiên học
            </NavButton>
            <NavButton href={route("/import/", q.context)}>
              Tải mẫu / Import Excel
            </NavButton>
            <NavButton href={route("/assessment/", q.context)}>
              Cấu hình
            </NavButton>
          </>
        }
      />
      <ReadOnlyNotice editable={q.canEdit} />
      {!q.students.length ? (
        <Feedback empty="Lớp chưa có học sinh." />
      ) : (
        <>
          <Box
            sx={{ display: { xs: showTable ? "none" : "block", md: "none" } }}
          >
            <Stack
              sx={{
                gap: 1,
              }}
            >
              <Button onClick={() => setShowTable(true)}>
                Mở bảng đầy đủ (cuộn ngang)
              </Button>
              {q.students.map((s) => {
                const r =
                    q.results.find((r) => r.studentId === s.id) ??
                    emptyResult(s.id, a.skills),
                  total = calculate(r, a.skills);
                return (
                  <ButtonBase
                    key={s.id}
                    component={Link}
                    aria-label={`Nhập điểm cho ${s.name}`}
                    href={route("/student-score/", {
                      ...q.context,
                      studentId: s.id,
                    })}
                    sx={{
                      textAlign: "left",
                      justifyContent: "flex-start",
                      gap: 1.25,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "background.paper",
                      minHeight: 44,
                    }}
                  >
                    <ProfileAvatar fallbackInitials name={s.name} size={36} />
                    <Stack
                      sx={{
                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 600,
                        }}
                      >
                        {s.name} ·{" "}
                        {s.nickname ||
                          publicId(s.publicId, s.studentCode, s.id)}
                      </Typography>
                      <Typography>
                        {r.attendance === "ABSENT"
                          ? "Vắng"
                          : `${total.score ?? "—"}/${total.max} · ${percent(total.percentage)} · ${total.entered}/${total.count} phần`}
                      </Typography>
                    </Stack>
                  </ButtonBase>
                );
              })}
            </Stack>
          </Box>
          <Box
            sx={{ display: { xs: showTable ? "block" : "none", md: "block" } }}
          >
            {showTable && (
              <Button
                onClick={() => {
                  if (confirmLeave()) setShowTable(false);
                }}
                sx={{ display: { md: "none" }, mb: 2 }}
              >
                Về danh sách học sinh
              </Button>
            )}
            {(desktop || showTable || loaded) && (
              <ScoreTable
                key={a.id + ":" + a.schemaVersion}
                editable={q.canEdit}
                assessment={a}
                students={q.students}
                results={q.results}
              />
            )}
          </Box>
        </>
      )}
    </>
  );
}
