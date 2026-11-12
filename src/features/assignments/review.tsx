"use client";
import { compactRadii } from "@/theme/compact";
import { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMore";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutlineOutlined";
import { AssignmentSurface } from "./surface";
import { assignmentBlocks } from "./groups";
import { QuestionGroupView } from "./group-view";
import { AssignmentMedia, RichContent } from "./media";
import { blockMedia, questionLabels, type Assignment } from "./models";

// A read-only view: no draft state, autosave, submission requests or inputs.
export function AssignmentReview({
  assignment,
  showAnswers,
}: {
  assignment: Assignment;
  showAnswers: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const allClosed = assignment.questions.every((q) => collapsed.has(q.id));
  return (
    <AssignmentSurface>
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}
        >
          <Typography component="h2" variant="h6">
            Nội dung bài tập
          </Typography>
          <Button
            size="small"
            onClick={() =>
              setCollapsed(
                allClosed
                  ? new Set()
                  : new Set(assignment.questions.map((q) => q.id)),
              )
            }
          >
            {allClosed ? "Mở rộng tất cả" : "Thu gọn tất cả"}
          </Button>
        </Stack>
        {assignmentBlocks(assignment).map((block) => (
          <QuestionGroupView key={block.id} group={block.group}>
            {block.questions.map((q) => {
              const index = assignment.questions.findIndex(
                  (x) => x.id === q.id,
                ),
                expanded = !collapsed.has(q.id);
              return (
                <Accordion
                  key={q.id}
                  expanded={expanded}
                  disableGutters
                  slotProps={{ transition: { unmountOnExit: true } }}
                  onChange={(_, open) =>
                    setCollapsed((previous) => {
                      const next = new Set(previous);
                      if (open) next.delete(q.id);
                      else next.add(q.id);
                      return next;
                    })
                  }
                  sx={{
                    minWidth: 0,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: `${compactRadii.item} !important`,
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    id={`review-${q.id}`}
                    aria-controls={`review-body-${q.id}`}
                    sx={{
                      px: { xs: 1.5, sm: 2 },
                      minHeight: 52,
                      "& .MuiAccordionSummary-content": {
                        minWidth: 0,
                        my: 1.25,
                      },
                    }}
                  >
                    <Stack spacing={0.5} sx={{ minWidth: 0, width: "100%" }}>
                      <Stack
                        direction="row"
                        sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}
                      >
                        <Typography
                          component="span"
                          sx={{ fontWeight: 700, fontSize: 14 }}
                        >
                          Câu {index + 1}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          {questionLabels[q.type]} · {q.maxScore} điểm
                        </Typography>
                      </Stack>
                      <Typography
                        component="span"
                        sx={{
                          fontSize: 14,
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                          ...(!expanded && {
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }),
                        }}
                      >
                        {q.content.replace(/\[file:[^\]]+\]/g, "").trim()}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails
                    id={`review-body-${q.id}`}
                    sx={{ px: { xs: 1.5, sm: 2 }, pb: 1.5, pt: 0 }}
                  >
                    <Stack spacing={1}>
                      {q.instructions && (
                        <Typography variant="body2" color="text.secondary">
                          {q.instructions}
                        </Typography>
                      )}
                      {/https?:\/\/|\[file:/.test(q.content) && (
                        <RichContent value={q.content} media={q.media} />
                      )}
                      <AssignmentMedia media={q.media} />
                      {q.options.map((option, i) => (
                        <Box
                          key={option.id}
                          sx={{
                            display: "flex",
                            gap: 1,
                            alignItems: "flex-start",
                            p: 1,
                            borderRadius: compactRadii.inset,
                            bgcolor:
                              showAnswers && option.isCorrect
                                ? "action.selected"
                                : "transparent",
                          }}
                        >
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{ fontWeight: 700 }}
                          >
                            {String.fromCharCode(65 + i)}.
                          </Typography>
                          <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                            <RichContent
                              value={option.content}
                              media={option.media}
                            />
                            <AssignmentMedia
                              media={blockMedia(option.content, option.media)}
                            />
                          </Stack>
                          {showAnswers && option.isCorrect && (
                            <Chip
                              size="small"
                              color="success"
                              variant="outlined"
                              icon={<CheckCircleOutline />}
                              label="Đáp án đúng"
                              sx={{ flexShrink: 0 }}
                            />
                          )}
                        </Box>
                      ))}
                      {q.type === "SPEAKING" && (
                        <Typography variant="body2" color="text.secondary">
                          Bài nói tối đa {q.maxDurationSeconds} giây
                        </Typography>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </QuestionGroupView>
        ))}
      </Stack>
    </AssignmentSurface>
  );
}
