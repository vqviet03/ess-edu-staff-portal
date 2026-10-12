import { api } from "./api";
import type { Envelope } from "@/types";
import type {
  Assignment,
  AssignmentSummary,
  AssignmentWrite,
  AssignmentReport,
  Answer,
  Grade,
  Submission,
  SubmissionPage,
  Page,
  Recording,
  RecordingConfirmation,
  UploadRequest,
} from "@/features/assignments/models";
import type { MaterialFile, UploadTicket } from "@/features/materials/models";
import {
  putSigned,
  uploadBuffers,
} from "@/features/materials/upload-transport";
const unwrap = <T>(r: Envelope<T>) => r.data;
const cleanAnswers = (rows: Answer[]) =>
  rows.map(
    ({
      questionId,
      text,
      link,
      optionIds,
      materialIds,
      recordingSessionId,
    }) => ({
      questionId,
      text,
      link,
      optionIds,
      materialIds,
      recordingSessionId,
    }),
  );
const write = (url: string, body: unknown, method = "POST") => ({
  url,
  body,
  method,
});
export const assignmentApi = api
  .enhanceEndpoints({
    addTagTypes: [
      "LearningAssignments",
      "AssignmentForm",
      "AssignmentDraft",
      "AssignmentSubmissions",
      "AssignmentReport",
    ],
  })
  .injectEndpoints({
    endpoints: (b) => ({
      assignmentList: b.query<
        Page<AssignmentSummary>,
        { classId: string; cursor?: string }
      >({
        query: ({ classId, ...params }) => ({
          url: `/classes/${encodeURIComponent(classId)}/assignments`,
          params,
        }),
        transformResponse: unwrap<Page<AssignmentSummary>>,
        providesTags: (_, __, q) => [
          { type: "LearningAssignments", id: q.classId },
        ],
      }),
      assignment: b.query<Assignment, { id: string; versionId?: string }>({
        query: ({ id, ...params }) => ({ url: `/assignments/${id}`, params }),
        transformResponse: unwrap<Assignment>,
        providesTags: (_, __, q) => [{ type: "AssignmentForm", id: q.id }],
      }),
      saveAssignment: b.mutation<
        Assignment,
        { classId: string; id?: string; body: AssignmentWrite }
      >({
        query: ({ classId, id, body }) =>
          write(
            `/classes/${encodeURIComponent(classId)}/assignments${id ? `/${id}` : ""}`,
            body,
            id ? "PUT" : "POST",
          ),
        transformResponse: unwrap<Assignment>,
        async onQueryStarted(_, { dispatch, queryFulfilled }) {
          try {
            const { data } = await queryFulfilled;
            dispatch(
              assignmentApi.util.upsertQueryData(
                "assignment",
                { id: data.id },
                data,
              ),
            );
          } catch {}
        },
        invalidatesTags: (r, e, q) =>
          e ? [] : [{ type: "LearningAssignments", id: q.classId }, "Posts"],
      }),
      publishAssignment: b.mutation<
        Assignment,
        { id: string; version: number; withdraw?: boolean }
      >({
        query: ({ id, withdraw, version }) =>
          write(`/assignments/${id}/${withdraw ? "withdraw" : "publish"}`, {
            version,
          }),
        transformResponse: unwrap<Assignment>,
        invalidatesTags: (r, e) =>
          e
            ? []
            : [
                { type: "AssignmentForm", id: r?.id },
                { type: "LearningAssignments", id: r?.classId },
                "Posts",
                "AssignmentReport",
              ],
      }),
      removeAssignment: b.mutation<
        { deleted: boolean },
        { id: string; version: number; reason: string }
      >({
        query: ({ id, ...body }) => write(`/assignments/${id}`, body, "DELETE"),
        invalidatesTags: (_, e) =>
          e
            ? []
            : [
                "LearningAssignments",
                "AssignmentForm",
                "Posts",
                "AssignmentReport",
              ],
      }),
      assignmentDraft: b.query<Submission | null, string>({
        query: (id) => `/assignments/${id}/draft`,
        transformResponse: unwrap<Submission | null>,
        providesTags: (_, __, id) => [{ type: "AssignmentDraft", id }],
      }),
      saveAssignmentDraft: b.mutation<
        Submission,
        {
          id: string;
          assignmentVersionId: string;
          answers: Answer[];
          version: number;
        }
      >({
        query: ({ id, ...body }) =>
          write(
            `/assignments/${id}/draft`,
            { ...body, answers: cleanAnswers(body.answers) },
            "PUT",
          ),
        transformResponse: unwrap<Submission>,
        async onQueryStarted(arg, { dispatch, queryFulfilled }) {
          try {
            const { data } = await queryFulfilled;
            dispatch(
              assignmentApi.util.upsertQueryData(
                "assignmentDraft",
                arg.id,
                data,
              ),
            );
          } catch {}
        },
      }),
      submitAssignment: b.mutation<
        Submission,
        {
          id: string;
          assignmentVersionId: string;
          answers: Answer[];
          version: number;
          key: string;
        }
      >({
        query: ({ id, key, ...body }) => ({
          ...write(`/assignments/${id}/submit`, {
            ...body,
            answers: cleanAnswers(body.answers),
          }),
          headers: { "Idempotency-Key": key },
        }),
        transformResponse: unwrap<Submission>,
        async onQueryStarted(arg, { dispatch, queryFulfilled }) {
          try {
            const { data } = await queryFulfilled;
            dispatch(
              assignmentApi.util.upsertQueryData(
                "assignmentDraft",
                arg.id,
                data,
              ),
            );
          } catch {}
        },
        invalidatesTags: (_, e, q) =>
          e
            ? []
            : [{ type: "AssignmentSubmissions", id: q.id }, "AssignmentReport"],
      }),
      assignmentSubmissions: b.query<
        SubmissionPage,
        { id: string; cursor?: string }
      >({
        query: ({ id, ...params }) => ({
          url: `/assignments/${id}/submissions`,
          params,
        }),
        transformResponse: unwrap<SubmissionPage>,
        providesTags: (_, __, q) => [
          { type: "AssignmentSubmissions", id: q.id },
        ],
      }),
      assignmentSubmission: b.query<
        Submission,
        { id: string; submissionId: string }
      >({
        query: (q) => `/assignments/${q.id}/submissions/${q.submissionId}`,
        transformResponse: unwrap<Submission>,
        providesTags: (_, __, q) => [
          { type: "AssignmentSubmissions", id: q.submissionId },
        ],
      }),
      gradeAssignment: b.mutation<
        Submission,
        {
          id: string;
          submissionId: string;
          version: number;
          grades: Grade[];
          overallComment: string;
          overallAdvice: string;
        }
      >({
        query: ({ id, submissionId, ...body }) =>
          write(
            `/assignments/${id}/submissions/${submissionId}/grade`,
            body,
            "PUT",
          ),
        transformResponse: unwrap<Submission>,
        async onQueryStarted(arg, { dispatch, queryFulfilled }) {
          try {
            const { data } = await queryFulfilled;
            dispatch(
              assignmentApi.util.upsertQueryData(
                "assignmentSubmission",
                { id: arg.id, submissionId: arg.submissionId },
                data,
              ),
            );
          } catch {}
        },
        invalidatesTags: (_, e, q) =>
          e
            ? []
            : [{ type: "AssignmentSubmissions", id: q.id }, "AssignmentReport"],
      }),
      publishAssignmentGrade: b.mutation<
        Submission,
        { id: string; submissionId: string; version: number }
      >({
        query: ({ id, submissionId, ...body }) =>
          write(`/assignments/${id}/submissions/${submissionId}/publish`, body),
        transformResponse: unwrap<Submission>,
        invalidatesTags: (_, e, q) =>
          e
            ? []
            : [
                { type: "AssignmentSubmissions", id: q.id },
                { type: "AssignmentSubmissions", id: q.submissionId },
                "AssignmentReport",
              ],
      }),
      assignmentReport: b.query<
        AssignmentReport,
        { classId: string; studentId?: string; unit?: number; cursor?: string }
      >({
        query: ({ classId, studentId, ...params }) => ({
          url: studentId
            ? `/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/assignment-report`
            : `/me/classes/${encodeURIComponent(classId)}/assignment-report`,
          params,
        }),
        transformResponse: unwrap<AssignmentReport>,
        providesTags: ["AssignmentReport"],
      }),
      startAssignmentRecording: b.mutation<
        Recording,
        { id: string; questionId: string }
      >({
        query: ({ id, ...body }) =>
          write(`/assignments/${id}/recordings`, body),
        transformResponse: unwrap<Recording>,
      }),
      finishAssignmentRecording: b.mutation<
        RecordingConfirmation,
        { id: string; recordingId: string; version: number; cancel?: boolean }
      >({
        query: ({ id, recordingId, cancel, version }) =>
          write(
            `/assignments/${id}/recordings/${recordingId}${cancel ? "" : "/complete"}`,
            { version },
            cancel ? "DELETE" : "POST",
          ),
        transformResponse: unwrap<RecordingConfirmation>,
      }),
      assignmentUpload: b.mutation<
        MaterialFile,
        UploadRequest & { bufferId: string }
      >({
        async queryFn({ assignmentId, bufferId, ...body }, q, _, base) {
          const buffers = uploadBuffers.get(bufferId);
          if (!buffers)
            return {
              error: {
                status: "CUSTOM_ERROR",
                error: "File không còn khả dụng.",
              },
            };
          let ticket: UploadTicket | undefined;
          try {
            const init = await base(
              write(`/assignments/${assignmentId}/uploads`, body),
            );
            if (init.error) return { error: init.error };
            ticket = (init.data as Envelope<UploadTicket>).data;
            await putSigned(
              ticket.uploadUrl,
              buffers.file,
              buffers.file.type,
              q.signal,
              buffers.progress,
            );
            if (ticket.thumbnailUploadUrl && buffers.thumbnail)
              await putSigned(
                ticket.thumbnailUploadUrl,
                buffers.thumbnail,
                buffers.thumbnail.type,
                q.signal,
                () => {},
              );
            const result = await base(
              write(`/material-uploads/${ticket.uploadId}/complete`, {
                version: ticket.version,
              }),
            );
            if (result.error) return { error: result.error };
            return { data: (result.data as Envelope<MaterialFile>).data };
          } catch (e) {
            if (ticket && !q.signal.aborted)
              await base(
                write(
                  `/material-uploads/${ticket.uploadId}`,
                  { version: ticket.version },
                  "DELETE",
                ),
              );
            return {
              error: {
                status: "CUSTOM_ERROR",
                error: e instanceof Error ? e.message : "Upload thất bại.",
              },
            };
          } finally {
            uploadBuffers.delete(bufferId);
          }
        },
      }),
      classAssignmentReport: b.query<Page<{studentId:string;studentName:string;report:AssignmentReport}>,{classId:string;unit?:number;cursor?:string}>({
        query:({classId,...params})=>({url:`/classes/${encodeURIComponent(classId)}/assignment-report`,params}),
        transformResponse:unwrap<Page<{studentId:string;studentName:string;report:AssignmentReport}>>,
        providesTags:(_,__,q)=>[{type:"AssignmentReport",id:q.classId}],
      }),
      changePassword: b.mutation<
        { changed: boolean; reauthenticate: boolean },
        {
          currentPassword: string;
          newPassword: string;
          confirmPassword: string;
        }
      >({
        query: (body) => write("/profile/password", body),
        transformResponse: unwrap<{
          changed: boolean;
          reauthenticate: boolean;
        }>,
      }),
    }),
  });
export const {
  useAssignmentListQuery,
  useAssignmentQuery,
  useSaveAssignmentMutation,
  usePublishAssignmentMutation,
  useRemoveAssignmentMutation,
  useAssignmentDraftQuery,
  useSaveAssignmentDraftMutation,
  useSubmitAssignmentMutation,
  useAssignmentSubmissionsQuery,
  useAssignmentSubmissionQuery,
  useGradeAssignmentMutation,
  usePublishAssignmentGradeMutation,
  useAssignmentReportQuery,
  useClassAssignmentReportQuery,
  useStartAssignmentRecordingMutation,
  useFinishAssignmentRecordingMutation,
  useAssignmentUploadMutation,
  useChangePasswordMutation,
} = assignmentApi;
