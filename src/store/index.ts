import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { workspaceSlice } from "./workspace";
import { operationsSlice, notificationReceived } from "./operations";
import { relatedTags } from "@/features/operations/models";
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
    actionCreator: notificationReceived,
    effect: (action, runtime) => {
      const before = runtime.getOriginalState() as { operations: { notifications: Record<string, { eventId: string }> } };
      if (before.operations.notifications[action.payload.operationId]?.eventId === action.payload.eventId) return;
      runtime.dispatch(service.util.invalidateTags(action.payload.status === "DONE" ? relatedTags(action.payload.entities) : ["Operations", "ClassAccess"]));
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
