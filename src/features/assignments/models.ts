import type { MaterialFile } from "@/features/materials/models";
export type QuestionType =
  "SINGLE" | "MULTIPLE" | "TEXT" | "LINK_FILE" | "SPEAKING";
export const questionLabels: Record<QuestionType, string> = {
  SINGLE: "Chọn một đáp án",
  MULTIPLE: "Chọn nhiều đáp án",
  TEXT: "Tự luận",
  LINK_FILE: "Liên kết / File",
  SPEAKING: "Bài nói",
};
export interface Media {
  materialId: string;
  displayWidth: number | null;
  displayHeight: number | null;
  keepAspectRatio: boolean;
  file: MaterialFile | null;
}
export interface Option {
  id: string;
  content: string;
  order: number;
  isCorrect?: boolean | null;
  media: Media[];
}
export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  instructions: string;
  rubric?: string | null;
  maxScore: number;
  order: number;
  allowUploadedAudio: boolean;
  maxDurationSeconds: number;
  options: Option[];
  media: Media[];
}
export interface Assignment {
  id: string;
  classId: string;
  postId: string;
  sessionId: string | null;
  unitNumber: number | null;
  title: string;
  instructions: string;
  status: "DRAFT" | "PUBLISHED" | "WITHDRAWN";
  deadline: string | null;
  allowLate: boolean;
  publishedAt: string | null;
  version: number;
  assignmentVersionId: string;
  schemaVersion: number;
  canEdit: boolean;
  canEditSchema?: boolean;
  totalMax: number;
  questions: Question[];
}
export type AssignmentSummary = Pick<
  Assignment,
  | "id"
  | "postId"
  | "title"
  | "unitNumber"
  | "sessionId"
  | "status"
  | "deadline"
  | "version"
  | "publishedAt"
>;
export interface Answer {
  questionId: string;
  text: string;
  link: string;
  optionIds: string[];
  materialIds: string[];
  recordingSessionId?: string | null;
  files?: MaterialFile[];
}
export interface Grade {
  questionId: string;
  score: number | null;
  automatic: boolean;
  comment: string;
  advice: string;
}
export interface Submission {
  id: string;
  assignmentId: string;
  assignmentVersionId: string;
  studentId: string;
  studentName: string;
  studentNickname: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  version: number;
  status: string;
  isLate: boolean;
  answers: Answer[];
  grades: Grade[];
  overallComment: string;
  overallAdvice: string;
  totalScore: number | null;
  totalMax: number;
  percentage: number | null;
}
export interface MediaWrite {
  materialId: string;
  displayWidth: number | null;
  displayHeight: number | null;
  keepAspectRatio: boolean;
}
export interface QuestionWrite {
  type: QuestionType;
  content: string;
  instructions: string;
  rubric: string;
  maxScore: number;
  allowUploadedAudio: boolean;
  maxDurationSeconds: number;
  options: { content: string; isCorrect: boolean; media: MediaWrite[] }[];
  media: MediaWrite[];
}
export interface AssignmentWrite {
  title: string;
  instructions: string;
  sessionId: string | null;
  unitNumber: number | null;
  deadline: string | null;
  allowLate: boolean;
  version: number;
  questions: QuestionWrite[];
}
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}
export interface ReportEntry {
  assignmentId: string;
  postId: string;
  title: string;
  unitNumber: number | null;
  deadline: string | null;
  publishedAt: string;
  submissionId: string | null;
  submittedAt: string | null;
  isLate: boolean;
  missing: boolean;
  status: string;
  percentage: number | null;
  totalScore: number | null;
  totalMax: number;
  comment: string;
  advice: string;
}
export interface AssignmentReport extends Page<ReportEntry> {
  summary: {
    assigned: number;
    submitted: number;
    missing: number;
    late: number;
    awaitingGrading: number;
    completionPercentage: number | null;
    missingPercentage: number | null;
    gradedPercentage: number | null;
    includingUnsubmittedPercentage: number | null;
  };
}
export interface Recording {
  id: string;
  version: number;
  expiresAt: string;
  maxDurationSeconds: number;
  status?: string;
  materialId?: string | null;
}
export interface UploadRequest {
  assignmentId: string;
  questionId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  recordingSessionId?: string;
  thumbnailMime?: string;
  thumbnailBytes?: number;
}
export function emptyAnswer(q: Question): Answer {
  return {
    questionId: q.id,
    text: "",
    link: "",
    optionIds: [],
    materialIds: [],
  };
}
export function answered(q: Question, a: Answer): boolean {
  if (q.type === "SINGLE" || q.type === "MULTIPLE")
    return (
      a.optionIds.length > 0 &&
      (q.type !== "SINGLE" || a.optionIds.length === 1) &&
      a.optionIds.every((id) => q.options.some((o) => o.id === id))
    );
  if (q.type === "TEXT") return a.text.trim().length > 0;
  if (q.type === "LINK_FILE")
    return validLink(a.link) || a.materialIds.length > 0;
  return (
    a.materialIds.length === 1 &&
    (q.allowUploadedAudio || !!a.recordingSessionId)
  );
}
export function validLink(value: string) {
  try {
    const u = new URL(value);
    return (
      ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
    );
  } catch {
    return false;
  }
}
export const statusLabels: Record<string, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã công bố",
  WITHDRAWN: "Đã thu hồi",
  OVERDUE: "Quá hạn chưa nộp",
  NOT_SUBMITTED: "Chưa nộp",
  NOT_DUE: "Chưa đến hạn nộp",
  PENDING_GRADING: "Chờ chấm",
  GRADED: "Đã chấm, chờ công bố",
};
export const numberLabel = (n: number | null | undefined) =>
  n == null
    ? "Chờ chấm"
    : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(n);
export function schemaWrite(a: Assignment): AssignmentWrite {
  const media = (m: Media): MediaWrite => ({
    materialId: m.materialId,
    displayWidth: m.displayWidth,
    displayHeight: m.displayHeight,
    keepAspectRatio: m.keepAspectRatio,
  });
  return {
    title: a.title,
    instructions: a.instructions,
    sessionId: a.sessionId,
    unitNumber: a.unitNumber,
    deadline: a.deadline,
    allowLate: a.allowLate,
    version: a.version,
    questions: a.questions.map((q) => ({
      type: q.type,
      content: q.content,
      instructions: q.instructions,
      rubric: q.rubric ?? "",
      maxScore: q.maxScore,
      allowUploadedAudio: q.allowUploadedAudio,
      maxDurationSeconds: q.maxDurationSeconds,
      media: q.media.map(media),
      options: q.options.map((o) => ({
        content: o.content,
        isCorrect: o.isCorrect ?? false,
        media: o.media.map(media),
      })),
    })),
  };
}

export const blockMedia = (content: string, media: Media[]) =>
  media.filter((m) => !content.includes(`[file:${m.materialId}]`));

export interface RecordingConfirmation {
  id: string;
  status: "CONFIRMED" | "CANCELLED";
  materialId: string | null;
  verifiedDurationSeconds: number | null;
  version: number;
}

export interface SubmissionPage extends Page<Submission> {
  summary: {
    assigned: number;
    submitted: number;
    awaitingGrading: number;
    graded: number;
    notSubmitted: number;
  };
}
