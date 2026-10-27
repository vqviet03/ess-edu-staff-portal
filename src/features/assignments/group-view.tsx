"use client";
import type { ReactNode } from "react";
import { Box, Paper, Stack, Typography, alpha } from "@mui/material";
import type { QuestionGroup } from "./models";
import { blockMedia } from "./models";
import { AssignmentMedia, RichContent } from "./media";
export function SharedStimulus({ group }: { group: QuestionGroup }) {
  return (
    <Paper
      variant="outlined"
      data-testid="shared-stimulus"
      sx={(theme) => ({
        p: { xs: 1.5, md: 2 },
        minWidth: 0,
        bgcolor: alpha(
          theme.palette.info.main,
          theme.palette.mode === "dark" ? 0.18 : 0.09,
        ),
        borderColor: alpha(theme.palette.info.main, 0.28),
      })}
    >
      <Stack spacing={1.5}>
        <Typography
          component="h3"
          sx={{ fontWeight: 700, overflowWrap: "anywhere" }}
        >
          {group.title || "Dữ kiện chung"}
        </Typography>
        {group.instructions && (
          <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
            {group.instructions}
          </Typography>
        )}
        <Box>
          <RichContent value={group.content} media={group.media} />
        </Box>
        <AssignmentMedia media={blockMedia(group.content, group.media)} />
      </Stack>
    </Paper>
  );
}
export function QuestionGroupView({
  group,
  children,
}: {
  group?: QuestionGroup;
  children: ReactNode;
}) {
  if (!group) return <>{children}</>;
  return (
    <Box
      component="section"
      aria-label={group.title || "Nhóm câu hỏi"}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: { xs: 1, md: 2 },
        minWidth: 0,
      }}
    >
      <Stack spacing={2}>
        <SharedStimulus group={group} />
        {children}
      </Stack>
    </Box>
  );
}
