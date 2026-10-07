import { notificationFilter, mergeNotice } from "@/features/materials/notification-state";
import type { AuthState } from "@/store/auth";
import { api } from "./api";
import type { Envelope } from "@/types";
import type {
  Attachment,
  BrowserQuery,
  Comment,
  CursorPage,
  DeletionItem,
  Folder,
  MaterialFile,
  Notification,
  Post,
  PostInput,
  Reaction,
  Storage,
  StoragePageData,
  UploadSettings,
  UploadInput,
  UploadTicket,
} from "@/features/materials/models";
import {
  putSigned,
  uploadBuffers,
} from "@/features/materials/upload-transport";
import { reactionUpdate } from "@/features/materials/utils";
const unwrap = <T>(r: Envelope<T>) => r.data;
const mutation = (url: string, body: unknown, method = "POST") => ({
  url,
  body,
  method,
});
export const libraryApi = api.injectEndpoints({
  endpoints: (b) => ({
    folders: b.query<
      CursorPage<Folder>,
      {
        parentId: string | null;
        search?: string;
        scope?: string;
        workspace?: string;
      }
    >({
      query: (q) => ({
        url: "/material-folders",
        params: { ...q, parentId: q.parentId ?? undefined },
      }),
      transformResponse: unwrap<CursorPage<Folder>>,
      providesTags: ["Folders"],
    }),
    folderPath: b.query<CursorPage<Folder>, string>({
      query: (id) => `/material-folders/${id}/path`,
      transformResponse: unwrap<CursorPage<Folder>>,
      providesTags: ["Folders"],
    }),
    saveFolder: b.mutation<
      Folder,
      {
        id?: string;
        name: string;
        parentId: string | null;
        kind: Folder["kind"];
        version: number;
      }
    >({
      query: ({ id, ...body }) =>
        mutation(
          id ? `/material-folders/${id}` : "/material-folders",
          body,
          id ? "PATCH" : "POST",
        ),
      transformResponse: unwrap<Folder>,
      invalidatesTags: ["Folders"],
    }),
    removeFolder: b.mutation<
      unknown,
      { id: string; version: number; reason: string }
    >({
      query: ({ id, ...body }) =>
        mutation(`/material-folders/${id}`, body, "DELETE"),
      invalidatesTags: ["Folders"],
    }),
    files: b.query<CursorPage<MaterialFile>, BrowserQuery>({
      query: (q) => ({
        url: "/materials",
        params: { ...q, folderId: q.folderId ?? undefined },
      }),
      transformResponse: unwrap<CursorPage<MaterialFile>>,
      providesTags: (r) => [
        "Materials",
        ...(r?.items.map((f) => ({ type: "Materials" as const, id: f.id })) ??
          []),
      ],
    }),
    file: b.query<MaterialFile, { id: string; workspace?: string }>({
      query: (q) => ({
        url: `/materials/${q.id}`,
        params: { workspace: q.workspace },
      }),
      transformResponse: unwrap<MaterialFile>,
      providesTags: (_, __, q) => [{ type: "Materials", id: q.id }],
    }),
    renameFile: b.mutation<
      MaterialFile,
      { id: string; displayName: string; version: number }
    >({
      query: ({ id, ...body }) => mutation(`/materials/${id}`, body, "PATCH"),
      transformResponse: unwrap<MaterialFile>,
      invalidatesTags: ["Materials", "Posts"],
    }),
    moveFiles: b.mutation<
      unknown,
      {
        ids: string[];
        folderId: string | null;
        versions: Record<string, number>;
      }
    >({
      query: (body) => mutation("/materials/bulk-move", body),
      invalidatesTags: ["Materials", "Folders", "Posts"],
    }),
    access: b.query<
      { url: string; expiresAt: string },
      { id: string; purpose: "preview" | "download" }
    >({
      query: (q) => ({
        url: `/materials/${q.id}/access-url`,
        params: { purpose: q.purpose },
      }),
      transformResponse: unwrap<{ url: string; expiresAt: string }>,
      keepUnusedDataFor: 0,
    }),
    auditFile: b.query<
      CursorPage<{
        id: string;
        actorId: string;
        actorUserId?: string; actorLoginId?: string; actorName?: string;
        action: string;
        changesJson: string;
        createdAt: string;
      }>,
      string | { id: string; page: number; pageSize?: number }
    >({
      query: (q) => ({ url: `/materials/${typeof q === "string" ? q : q.id}/audit-logs`, params: typeof q === "string" ? {} : { page: q.page, pageSize: q.pageSize ?? 20 } }),
      transformResponse: unwrap<
        CursorPage<{
          id: string;
          actorId: string;
          actorUserId?: string; actorLoginId?: string; actorName?: string;
          action: string;
          changesJson: string;
          createdAt: string;
        }>
      >,
      providesTags: ["Materials"],
    }),
    deletionImpact: b.query<{ file: MaterialFile; usages: DeletionItem["usages"] }, string>({ query: id => `/materials/${id}/deletion-impact`, transformResponse: unwrap<{ file: MaterialFile; usages: DeletionItem["usages"] }>, providesTags: ["Materials", "Posts"] }),
    deleteFile: b.mutation<{ status: string }, { id: string; version: number; reason: string; linkAction: "KEEP_UNAVAILABLE" | "DETACH" }>({ query: ({ id, ...body }) => ({ url: `/materials/${id}`, method: "DELETE", body }), transformResponse: unwrap<{ status: string }>, invalidatesTags: (_, e) => e ? [] : ["Materials", "Posts", "Storages", "DeletionRequests", "Audit"] }),
    deletionRequests: b.query<CursorPage<DeletionItem>, void>({
      query: () => "/material-deletion-requests",
      transformResponse: unwrap<CursorPage<DeletionItem>>,
      providesTags: ["DeletionRequests"],
    }),
    requestDeletion: b.mutation<
      unknown,
      { id: string; version: number; reason: string }
    >({
      query: ({ id, ...body }) =>
        mutation(`/materials/${id}/deletion-requests`, body),
      invalidatesTags: ["DeletionRequests"],
    }),
    decideDeletion: b.mutation<
      unknown,
      {
        id: string;
        version: number;
        decision: "APPROVED" | "REJECTED";
        reason: string;
        linkAction: "KEEP_UNAVAILABLE" | "DETACH";
      }
    >({
      query: ({ id, ...body }) =>
        mutation(`/material-deletion-requests/${id}/decision`, body),
      invalidatesTags: [
        "DeletionRequests",
        "Materials",
        "Posts",
        "Storages",
      ],
    }),
    uploadSettings: b.query<UploadSettings, void>({
      query: () => "/material-upload-settings",
      transformResponse: unwrap<UploadSettings>, providesTags: ["Storages"],
    }),
    initiateUpload: b.mutation<UploadTicket, UploadInput>({
      query: (body) => mutation("/material-uploads/initiate", body),
      transformResponse: unwrap<UploadTicket>,
      invalidatesTags: ["Storages"],
    }),
    cancelUpload: b.mutation<unknown, { uploadId: string; version: number }>({
      query: (q) =>
        mutation(
          `/material-uploads/${q.uploadId}`,
          { version: q.version },
          "DELETE",
        ),
      invalidatesTags: ["Storages"],
    }),
    transferUpload: b.mutation<
      MaterialFile,
      { key: string; ticket: UploadTicket }
    >({
      async queryFn(arg, ctx, _, base) {
        const buffer = uploadBuffers.get(arg.key);
        if (!buffer)
          return {
            error: { status: "CUSTOM_ERROR", error: "Không có file tải lên." },
          };
        try {
          await putSigned(
            arg.ticket.uploadUrl,
            buffer.file,
            buffer.file.type || "application/octet-stream",
            ctx.signal,
            (v) => buffer.progress(Math.round(v * 0.9)),
          );
          if (buffer.thumbnail && arg.ticket.thumbnailUploadUrl)
            await putSigned(
              arg.ticket.thumbnailUploadUrl,
              buffer.thumbnail,
              buffer.thumbnail.type,
              ctx.signal,
              (v) => buffer.progress(90 + Math.round(v * 0.1)),
            );
          const r = await base(
            mutation(`/material-uploads/${arg.ticket.uploadId}/complete`, {
              version: arg.ticket.version,
            }),
          );
          if (r.error) return { error: r.error };
          return { data: (r.data as Envelope<MaterialFile>).data };
        } catch (e) {
          return {
            error: {
              status: "CUSTOM_ERROR",
              error: e instanceof Error ? e.message : "Upload lỗi.",
            },
          };
        }
      },
      invalidatesTags: (_, error) => (error ? [] : ["Materials", "Storages"]),
    }),
    storages: b.query<StoragePageData, void>({
      query: () => "/storages",
      transformResponse: unwrap<StoragePageData>,
      providesTags: ["Storages"],
      keepUnusedDataFor: 10,
    }),
    storageAlerts: b.query<CursorPage<Storage>, void>({
      query: () => "/storage-alerts",
      transformResponse: unwrap<CursorPage<Storage>>,
      providesTags: ["Storages"],
    }),
    posts: b.query<CursorPage<Post>, { sessionId: string; cursor?: string }>({
      query: (q) => ({
        url: `/sessions/${q.sessionId}/posts`,
        params: { cursor: q.cursor, limit: 10 },
      }),
      transformResponse: unwrap<CursorPage<Post>>,
      providesTags: (r) => [
        "Posts",
        ...(r?.items.map((p) => ({ type: "Posts" as const, id: p.id })) ?? []),
      ],
    }),
    savePost: b.mutation<
      Post,
      { id?: string; sessionId: string; body: PostInput }
    >({
      query: (q) =>
        mutation(
          q.id ? `/posts/${q.id}` : `/sessions/${q.sessionId}/posts`,
          q.body,
          q.id ? "PATCH" : "POST",
        ),
      transformResponse: unwrap<Post>,
      invalidatesTags: ["Posts", "Materials"],
    }),
    removePost: b.mutation<
      unknown,
      { id: string; version: number; reason: string }
    >({
      query: ({ id, ...body }) => mutation(`/posts/${id}`, body, "DELETE"),
      invalidatesTags: ["Posts"],
    }),
    reaction: b.mutation<
      unknown,
      {
        id: string;
        sessionId: string;
        cursor?: string;
        reaction: Reaction | null;
      }
    >({
      query: (q) =>
        mutation(
          `/posts/${q.id}/reaction`,
          q.reaction ? { reaction: q.reaction } : undefined,
          q.reaction ? "PUT" : "DELETE",
        ),
      async onQueryStarted(q, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          libraryApi.util.updateQueryData(
            "posts",
            { sessionId: q.sessionId, cursor: q.cursor },
            (draft) => {
              const p = draft.items.find((p) => p.id === q.id);
              if (p) reactionUpdate(p, q.reaction);
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_, error, q) =>
        error ? [] : [{ type: "Posts", id: q.id }],
    }),
    comments: b.query<CursorPage<Comment>, { postId: string; cursor?: string }>(
      {
        query: (q) => ({
          url: `/posts/${q.postId}/comments`,
          params: { cursor: q.cursor, limit: 20 },
        }),
        transformResponse: unwrap<CursorPage<Comment>>,
        providesTags: (_, __, q) => [{ type: "Comments", id: q.postId }],
      },
    ),
    saveComment: b.mutation<
      Comment,
      {
        id?: string;
        postId: string;
        body: string;
        parentId?: string;
        version?: number;
      }
    >({
      query: ({ id, postId, ...body }) =>
        mutation(
          id ? `/comments/${id}` : `/posts/${postId}/comments`,
          body,
          id ? "PATCH" : "POST",
        ),
      transformResponse: unwrap<Comment>,
      async onQueryStarted(q, { dispatch, getState, queryFulfilled }) {
        const teacher = (getState() as unknown as { auth: AuthState }).auth
          .session?.teacher;
        const temporaryId = "pending:" + crypto.randomUUID();
        const patch = dispatch(
          libraryApi.util.updateQueryData(
            "comments",
            { postId: q.postId, cursor: undefined },
            (draft) => {
              if (q.id) {
                const row = draft.items.find((c) => c.id === q.id);
                if (row) row.body = q.body;
              } else
                draft.items.push({
                  id: temporaryId,
                  postId: q.postId,
                  parentId: q.parentId ?? null,
                  authorId: teacher?.id ?? "",
                  authorName: teacher?.name ?? "Bạn",
                  body: q.body,
                  version: 0,
                  createdAt: new Date().toISOString(),
                });
            },
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            libraryApi.util.updateQueryData(
              "comments",
              { postId: q.postId, cursor: undefined },
              (draft) => {
                const index = draft.items.findIndex(
                  (c) => c.id === (q.id ?? temporaryId),
                );
                if (index >= 0) draft.items[index] = data;
              },
            ),
          );
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_, error, q) =>
        error
          ? []
          : [{ type: "Comments", id: q.postId }, "Posts"],
    }),
    removeComment: b.mutation<
      unknown,
      { id: string; postId: string; version: number }
    >({
      query: ({ id, version }) =>
        mutation(
          `/comments/${id}`,
          { version, reason: "Người dùng xóa bình luận" },
          "DELETE",
        ),
      invalidatesTags: (_, error, q) =>
        error ? [] : [{ type: "Comments", id: q.postId }, "Posts"],
    }),
    notifications: b.query<
      CursorPage<Notification>,
      { type?: string; isRead?: boolean; cursor?: string }
    >({
      query: (q) => ({ url: "/notifications", params: notificationFilter(q) }),
      serializeQueryArgs: ({ queryArgs }) => notificationFilter(queryArgs),
      keepUnusedDataFor: 86400,
      transformResponse: unwrap<CursorPage<Notification>>,
      providesTags: ["Notifications"],
    }),
    changeNotification: b.mutation<
      Notification,
      { id: string; version: number; isRead?: boolean; deleted?: boolean }
    >({
      query: ({ id, deleted, ...body }) => mutation(`/notifications/${id}`, body, deleted ? "DELETE" : "PATCH"),
      transformResponse: unwrap<Notification>,
      async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const state = getState() as Parameters<typeof libraryApi.util.selectCachedArgsForQuery>[0];
          const filters = libraryApi.util.selectCachedArgsForQuery(state, "notifications");
          const previous = filters.map((args) => libraryApi.endpoints.notifications.select(args)(state).data?.items.find((n) => n.id === arg.id)).find((n) => n !== undefined);
          const delta = previous ? (arg.deleted ? -Number(!previous.isRead) : Number(!data.isRead) - Number(!previous.isRead)) : 0;
          for (const args of filters) {
            dispatch(libraryApi.util.updateQueryData("notifications", args, (page) => {
              const unread = page.unreadCount;
              if (arg.deleted) {
                page.items = page.items.filter((n) => n.id !== arg.id);
              } else mergeNotice(page, args, data);
              if (unread !== undefined) page.unreadCount = Math.max(0, unread + delta);
            }));
          }
        } catch { /* Failed writes preserve cached notices and the user's form. */ }
      },
    }),
    readNotifications: b.mutation<unknown, void>({
      query: () => mutation("/notifications/read-all", {}),
      async onQueryStarted(_, { dispatch, getState, queryFulfilled }) {
        try {
          await queryFulfilled;
          const state = getState() as Parameters<typeof libraryApi.util.selectCachedArgsForQuery>[0];
          for (const args of libraryApi.util.selectCachedArgsForQuery(state, "notifications")) {
            dispatch(libraryApi.util.updateQueryData("notifications", args, (page) => {
              page.unreadCount = 0;
              for (const notice of page.items) if (!notice.isRead) { notice.isRead = true; notice.version++; }
              if (args.isRead === false) page.items = [];
            }));
          }
        } catch { /* Keep unread state if the server rejects the action. */ }
      },
    }),
  }),
});
export const {
  useFoldersQuery,
  useLazyFolderPathQuery,
  useSaveFolderMutation,
  useRemoveFolderMutation,
  useFilesQuery,
  useFileQuery,
  useRenameFileMutation,
  useMoveFilesMutation,
  useLazyAccessQuery,
  useAccessQuery,
  useAuditFileQuery,
  useDeletionImpactQuery,
  useDeleteFileMutation,
  useDeletionRequestsQuery,
  useRequestDeletionMutation,
  useDecideDeletionMutation,
  useUploadSettingsQuery,
  useInitiateUploadMutation,
  useTransferUploadMutation,
  useCancelUploadMutation,
  useStoragesQuery,
  useStorageAlertsQuery,
  usePostsQuery,
  useSavePostMutation,
  useRemovePostMutation,
  useReactionMutation,
  useCommentsQuery,
  useSaveCommentMutation,
  useRemoveCommentMutation,
  useNotificationsQuery,
  useChangeNotificationMutation,
  useReadNotificationsMutation,
} = libraryApi;
export type { Attachment };
