import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { api } from "@/api/api";
import { authSlice, signedIn, signedOut, verified } from "./auth";
import { writeSession } from "@/features/auth/storage";
export function makeStore() {
  const listener = createListenerMiddleware();
  const store = configureStore({
    reducer: { auth: authSlice.reducer, [api.reducerPath]: api.reducer },
    middleware: (g) =>
      g({
        serializableCheck: {
          ignoredActions: ["staffApi/executeQuery/fulfilled"],
          ignoredPaths: ["staffApi.queries"],
        },
      })
        .prepend(listener.middleware)
        .concat(api.middleware),
  });
  listener.startListening({
    matcher: (a) =>
      signedIn.match(a) || signedOut.match(a) || verified.match(a),
    effect: () => {
      writeSession(store.getState().auth.session);
      if (!store.getState().auth.session)
        store.dispatch(api.util.resetApiState());
    },
  });
  return store;
}
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export const useAppDispatch = useDispatch.withTypes<AppStore["dispatch"]>();
export const useAppSelector = useSelector.withTypes<RootState>();
