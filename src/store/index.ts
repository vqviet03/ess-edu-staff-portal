import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { workspaceSlice } from "./workspace";
import { operationsSlice, notificationReceived } from "./operations";
import { relatedTags } from "@/features/operations/models";
import { libraryApi } from "@/api/library-api";
import { libraryNoticeReceived, librarySnapshotReceived, mergeNotice } from "@/features/materials/notification-state";
import { api } from "@/api/api";
import { authSlice, signedIn, signedOut, verified } from "./auth";
import { writeSession } from "@/features/auth/storage";
export function makeStore(service = api) {
  const listener = createListenerMiddleware();
  const store = configureStore({
    reducer: { auth: authSlice.reducer, workspace: workspaceSlice.reducer, operations: operationsSlice.reducer, [service.reducerPath]: service.reducer },
    middleware: (g) =>
      g({
        serializableCheck: {
          ignoredActions: ["staffApi/executeQuery/fulfilled"],
          ignoredPaths: ["staffApi.queries"],
        },
      })
        .prepend(listener.middleware)
        .concat(service.middleware),
  });
  listener.startListening({
    actionCreator: librarySnapshotReceived,
    effect: (action, runtime) => {
      const before = runtime.getOriginalState() as { operations: { librarySnapshot: unknown; libraryNotices: Record<string, boolean> } };
      store.dispatch(libraryApi.util.upsertQueryData("notifications", {}, action.payload));
      if (before.operations.librarySnapshot && action.payload.items.some((notice) => !before.operations.libraryNotices[notice.id]))
        runtime.dispatch(service.util.invalidateTags(["Materials", "Folders", "Posts", "Comments", "Storages", "DeletionRequests"]));
    },
  });
  listener.startListening({
    actionCreator: libraryNoticeReceived,
    effect: (action, runtime) => {
      const before = runtime.getOriginalState() as { operations: { libraryNotices: Record<string, boolean> } };
      if (before.operations.libraryNotices[action.payload.notice.id]) return;
      for (const args of libraryApi.util.selectCachedArgsForQuery(store.getState(), "notifications")) {
        store.dispatch(libraryApi.util.updateQueryData("notifications", args, (page) => mergeNotice(page, args, action.payload.notice)));
      }
      // Only an actual server change refreshes subscribed data; notices are
      // patched locally and never cause another /notifications request.
      runtime.dispatch(service.util.invalidateTags(["Materials", "Folders", "Posts", "Comments", "Storages", "DeletionRequests"]));
    },
  });
  listener.startListening({
    actionCreator: notificationReceived,
    effect: (action, runtime) => {
      const before = runtime.getOriginalState() as { operations: { notifications: Record<string, { eventId: string }>; localMutations: Record<string, boolean> }; auth: { session: {teacher: {id: string}} | null } };
      if (before.operations.notifications[action.payload.operationId]) return;
      if (action.payload.actorId === before.auth.session?.teacher.id && before.operations.localMutations[action.payload.operationId]) return;
      if (action.payload.status === "DONE") runtime.dispatch(service.util.invalidateTags(relatedTags(action.payload.entities)));
    },
  });
  listener.startListening({
    matcher: (a) =>
      signedIn.match(a) || signedOut.match(a) || verified.match(a),
    effect: (action) => {
      writeSession(store.getState().auth.session);
      if (signedIn.match(action) || !store.getState().auth.session)
        store.dispatch(service.util.resetApiState());
    },
  });
  return store;
}
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export const useAppDispatch = useDispatch.withTypes<AppStore["dispatch"]>();
export const useAppSelector = useSelector.withTypes<RootState>();
