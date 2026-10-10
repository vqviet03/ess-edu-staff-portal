import { api, unwrap } from "./api";
import type {
  ClassRewards,
  RewardClass,
  RewardDetail,
  RewardEntry,
  RewardHistory,
  RewardKind,
  Attendance,
  StudySchedule,
  ScheduleConfig,
} from "@/features/rewards/models";
const path = (id: string) => `/classes/${encodeURIComponent(id)}`;
const rewardPath = (c: { classId: string; studentId: string }) =>
  `${path(c.classId)}/students/${encodeURIComponent(c.studentId)}/rewards`;
const tags = (id: string) => [{ type: "Rewards" as const, id }];
export const rewardsApi = api.injectEndpoints({
  endpoints: (b) => ({
    classRewards: b.query<ClassRewards, { classId: string; date?: string }>({
      query: ({ classId, date }) => ({
        url: `${path(classId)}/rewards`,
        params: { date },
      }),
      transformResponse: unwrap<ClassRewards>,
      providesTags: (r, _, q) => [
        ...tags(q.classId),
        ...(r && "classId" in r && typeof r.classId === "string"
          ? tags(r.classId)
          : []),
      ],
    }),
    rewardClasses: b.query<RewardClass[], string>({
      query: (id) => `/students/${encodeURIComponent(id)}/reward-classes`,
      transformResponse: unwrap<RewardClass[]>,
      providesTags: ["Rewards"],
    }),
    rewardDetail: b.query<
      RewardDetail,
      { classId: string; studentId: string; from: string; to: string }
    >({
      query: (q) => ({
        url: rewardPath(q),
        params: { from: q.from || undefined, to: q.to || undefined },
      }),
      transformResponse: unwrap<RewardDetail>,
      providesTags: (r, _, q) => [
        ...tags(q.classId),
        ...(r && "classId" in r && typeof r.classId === "string"
          ? tags(r.classId)
          : []),
      ],
    }),
    rewardActivities: b.query<
      RewardHistory,
      { classId: string; date?: string; page: number }
    >({
      query: (q) => ({
        url: `${path(q.classId)}/rewards/activities`,
        params: { date: q.date, page: q.page, pageSize: 20 },
      }),
      transformResponse: unwrap<RewardHistory>,
      providesTags: (_, __, q) => [{ type: "Rewards", id: q.classId }],
    }),
    rewardHistory: b.query<
      RewardHistory,
      {
        classId: string;
        studentId: string;
        kind?: RewardKind;
        date?: string;
        page: number;
      }
    >({
      query: (q) => ({
        url: `${rewardPath(q)}/history`,
        params: { kind: q.kind, date: q.date, page: q.page, pageSize: 20 },
      }),
      transformResponse: unwrap<RewardHistory>,
      providesTags: (r, _, q) => [
        ...tags(q.classId),
        ...(r && "classId" in r && typeof r.classId === "string"
          ? tags(r.classId)
          : []),
      ],
    }),
    addReward: b.mutation<
      RewardEntry,
      {
        classId: string;
        studentId: string;
        kind: RewardKind;
        amount: number;
        note?: string;
        date?: string;
        key: string;
        notificationPriority?: "NORMAL"|"IMPORTANT";
      }
    >({
      query: ({ classId, studentId, key, ...body }) => ({
        url: rewardPath({ classId, studentId }),
        method: "POST",
        headers: { "Idempotency-Key": key },
        body,
      }),
      transformResponse: unwrap<RewardEntry>,
      invalidatesTags: (_, e, q) => (e ? [] : tags(q.classId)),
    }),
    correctReward: b.mutation<
      RewardEntry,
      {
        classId: string;
        studentId: string;
        entryId: string;
        amount: number;
        note: string;
        reason: string;
        key: string;
        notificationPriority?: "NORMAL"|"IMPORTANT";
      }
    >({
      query: ({ classId, studentId, entryId, key, ...body }) => ({
        url: `${rewardPath({ classId, studentId })}/${encodeURIComponent(entryId)}/correction`,
        method: "POST",
        headers: { "Idempotency-Key": key },
        body,
      }),
      transformResponse: unwrap<RewardEntry>,
      invalidatesTags: (_, e, q) => (e ? [] : tags(q.classId)),
    }),
    reverseReward: b.mutation<
      RewardEntry,
      {
        classId: string;
        studentId: string;
        entryId: string;
        note: string;
        key: string;
        notificationPriority?: "NORMAL"|"IMPORTANT";
      }
    >({
      query: ({ classId, studentId, entryId, note, key, notificationPriority }) => ({
        url: `${rewardPath({ classId, studentId })}/${encodeURIComponent(entryId)}/reverse`,
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: { note, notificationPriority },
      }),
      transformResponse: unwrap<RewardEntry>,
      invalidatesTags: (_, e, q) => (e ? [] : tags(q.classId)),
    }),
    saveRewardAttendance: b.mutation<
      ClassRewards,
      {
        classId: string;
        date: string;
        version: number;
        close: boolean;
        rows: { studentId: string; status: Attendance }[];
      }
    >({
      query: ({ classId, ...body }) => ({
        url: `${path(classId)}/rewards/attendance`,
        method: "PUT",
        body,
      }),
      transformResponse: unwrap<ClassRewards>,
      invalidatesTags: (_, e, q) => (e ? [] : tags(q.classId)),
    }),
    studySchedule: b.query<StudySchedule, string>({
      query: (id) => `${path(id)}/schedule`,
      transformResponse: unwrap<StudySchedule>,
      providesTags: (r, _, id) => [
        { type: "Schedule", id },
        ...(r ? [{ type: "Schedule" as const, id: r.classId }] : []),
      ],
    }),
    saveStudySchedule: b.mutation<
      StudySchedule,
      {
        classId: string;
        version: number;
        plannedSessions?: number;
        planStartDate?: string;
        effectiveFrom: string;
        configuration: ScheduleConfig;
      }
    >({
      query: ({ classId, ...body }) => ({
        url: `${path(classId)}/schedule`,
        method: "PUT",
        body,
      }),
      transformResponse: unwrap<StudySchedule>,
      invalidatesTags: (_, e, q) =>
        e
          ? []
          : [
              { type: "Attendance", id: q.classId },
              { type: "Schedule", id: q.classId },
              ...tags(q.classId),
            ],
    }),
  }),
});
export const {
  useClassRewardsQuery,
  useRewardClassesQuery,
  useRewardDetailQuery,
  useRewardHistoryQuery,
  useRewardActivitiesQuery,
  useAddRewardMutation,
  useCorrectRewardMutation,
  useReverseRewardMutation,
  useSaveRewardAttendanceMutation,
  useStudyScheduleQuery,
  useSaveStudyScheduleMutation,
} = rewardsApi;
