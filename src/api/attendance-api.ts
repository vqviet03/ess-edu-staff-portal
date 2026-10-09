import { api, unwrap } from "./api";
import type {
  ClassAttendance,
  StudentAttendance,
  ReasonKind,
} from "@/features/attendance/models";
const path = (id: string) => `/classes/${encodeURIComponent(id)}/attendance`;
const tags = (id: string) => [
  { type: "Attendance" as const, id },
  { type: "Rewards" as const, id },
];
export const attendanceApi = api.injectEndpoints({
  endpoints: (b) => ({
    classAttendance: b.query<
      ClassAttendance,
      { classId: string; date?: string; month?: string }
    >({
      query: ({ classId, ...params }) => ({ url: path(classId), params }),
      transformResponse: unwrap<ClassAttendance>,
      providesTags: (r, _, q) => [
        { type: "Attendance", id: q.classId },
        ...(r ? [{ type: "Attendance" as const, id: r.classId }] : []),
      ],
    }),
    confirmAttendance: b.mutation<
      ClassAttendance,
      {
        classId: string;
        date: string;
        version: number;
        reasonKind: ReasonKind;
        reason: string;
        replacesDate?: string;
      }
    >({
      query: ({ classId, ...body }) => ({
        url: `${path(classId)}/days`,
        method: "POST",
        body,
      }),
      transformResponse: unwrap<ClassAttendance>,
      invalidatesTags: (_, e, q) => (e ? [] : tags(q.classId)),
    }),
    saveAttendance: b.mutation<
      ClassAttendance,
      {
        classId: string;
        date: string;
        version: number;
        rows: { studentId: string; status: "PRESENT" | "ABSENT" }[];
        reason: string;
      }
    >({
      query: ({ classId, ...body }) => ({
        url: path(classId),
        method: "PUT",
        body,
      }),
      transformResponse: unwrap<ClassAttendance>,
      invalidatesTags: (_, e, q) => (e ? [] : [...tags(q.classId), "Audit"]),
    }),
    studentAttendance: b.query<
      StudentAttendance,
      {
        classId: string;
        studentId: string;
        month: string;
        status: string;
        page: number;
      }
    >({
      query: ({ classId, studentId, ...params }) => ({
        url: `/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/attendance`,
        params: { ...params, status: params.status || undefined, pageSize: 20 },
      }),
      transformResponse: unwrap<StudentAttendance>,
      providesTags: (_, __, q) => [{ type: "Attendance", id: q.classId }],
    }),
  }),
});
export const {
  useClassAttendanceQuery,
  useConfirmAttendanceMutation,
  useSaveAttendanceMutation,
  useStudentAttendanceQuery,
} = attendanceApi;
