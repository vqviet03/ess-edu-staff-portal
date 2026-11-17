import { api, unwrap } from "./api";

export interface Retention {
  limit: number;
  deleteMode: "SOFT" | "HARD";
  version: number;
}
export const retentionApi = api
  .enhanceEndpoints({ addTagTypes: ["NotificationRetention"] })
  .injectEndpoints({
    endpoints: (b) => ({
      notificationRetention: b.query<Retention, void>({
        query: () => "/manager/notification-settings",
        transformResponse: unwrap<Retention>,
        providesTags: ["NotificationRetention"],
      }),
      saveNotificationRetention: b.mutation<Retention, Retention>({
        query: (body) => ({
          url: "/manager/notification-settings",
          method: "PATCH",
          body,
        }),
        transformResponse: unwrap<Retention>,
        async onQueryStarted(_, { dispatch, queryFulfilled }) {
          try {
            const { data } = await queryFulfilled;
            dispatch(
              retentionApi.util.upsertQueryData(
                "notificationRetention",
                undefined,
                data,
              ),
            );
          } catch {}
        },
        invalidatesTags: (_, e) => (e ? [] : ["Audit"]),
      }),
    }),
  });
