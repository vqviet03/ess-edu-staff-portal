"use client";
import { compactRadii } from "@/theme/compact";
import Link from "next/link";
import ButtonBase from "@mui/material/ButtonBase";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useSessionsQuery } from "@/api/api";
import { ReadOnlyNotice } from "@/features/access/hooks";
import { SessionEditor } from "@/features/sessions/editor";
import { Card, Feedback, StatusChip } from "@/shared/ui";
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
        <UnitTrack
          total={classInfo.totalUnits}
          completed={completed}
          started={(query.currentData ?? []).flatMap((s) =>
            s.unitNumber ? [s.unitNumber] : [],
          )}
        />
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
                  borderRadius: compactRadii.item,
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

/**
 * Unit progress as one bar split into a segment per Unit: completed Units are
 * filled, Units with sessions but no completed one are tinted, and a marker
 * above the bar names the Unit the class is on now.
 */
function UnitTrack({
  total,
  completed,
  started,
}: {
  total: number;
  completed: number[];
  started: number[];
}) {
  const units = Array.from({ length: total }, (_, i) => i + 1),
    done = new Set(completed),
    open = started.filter((unit) => !done.has(unit) && unit <= total);
  const current = open.length
    ? Math.max(...open)
    : (units.find((unit) => !done.has(unit)) ?? total);
  const percent = total ? Math.round((completed.length / total) * 100) : 0,
    // Centre of the current Unit's segment, as a share of the bar.
    at = total ? ((current - 0.5) / total) * 100 : 0;
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {completed.length}/{total} Unit · {percent}%
      </Typography>
      {total > 0 && (
        <Box
          role="progressbar"
          aria-label="Tiến độ Unit"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={completed.length}
          aria-valuetext={`${completed.length}/${total} Unit hoàn thành, đang ở Unit ${current}`}
          sx={{ position: "relative", pt: 4 }}
        >
          <Box
            aria-hidden
            data-testid="unit-track-marker"
            sx={(theme) => ({
              position: "absolute",
              top: 0,
              left: `${at}%`,
              // Shift the label by the same share so it never leaves the bar.
              transform: `translateX(-${at}%)`,
              transition: theme.transitions.create(["left", "transform"]),
              px: 1,
              py: 0.25,
              borderRadius: 999,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              fontSize: 12,
              fontWeight: 700,
              lineHeight: "18px",
              whiteSpace: "nowrap",
            })}
          >
            Unit {current}
          </Box>
          <Box
            aria-hidden
            sx={(theme) => ({
              position: "absolute",
              top: 20,
              left: `${at}%`,
              transform: "translateX(-50%)",
              transition: theme.transitions.create("left"),
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: `6px solid ${theme.palette.primary.main}`,
            })}
          />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${total}, 1fr)`,
              gap: total > 24 ? "1px" : "3px",
            }}
          >
            {units.map((unit) => (
              <Box
                key={unit}
                title={`Unit ${unit} · ${
                  done.has(unit)
                    ? "Hoàn thành"
                    : started.includes(unit)
                      ? "Đang học"
                      : "Chưa học"
                }`}
                sx={(theme) => ({
                  height: 10,
                  borderRadius: "3px",
                  "&:first-of-type": { borderRadius: "999px 3px 3px 999px" },
                  "&:last-of-type": {
                    borderRadius: total > 1 ? "3px 999px 999px 3px" : 999,
                  },
                  bgcolor: done.has(unit)
                    ? "primary.main"
                    : started.includes(unit)
                      ? alpha(theme.palette.primary.main, 0.45)
                      : "action.selected",
                  outline:
                    unit === current
                      ? `2px solid ${theme.palette.primary.main}`
                      : "none",
                  outlineOffset: 1,
                })}
              />
            ))}
          </Box>
          <Stack
            direction="row"
            aria-hidden
            sx={{
              justifyContent: "space-between",
              mt: 0.5,
              color: "text.secondary",
              fontSize: 11,
            }}
          >
            <span>Unit 1</span>
            <span>Unit {total}</span>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
