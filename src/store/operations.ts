import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Operation, ChangeNotification } from "@/features/operations/models";
import type { CursorPage, Notification } from "@/features/materials/models";
import { libraryNoticeReceived, librarySnapshotReceived } from "@/features/materials/notification-state";
export const operationsSlice = createSlice({
  name: "operations",
  initialState: { librarySnapshot: null as CursorPage<Notification> | null, libraryNotices: {} as Record<string, boolean>, localMutations: {} as Record<string, boolean>, items: {} as Record<string, Operation>, notifications: {} as Record<string, ChangeNotification> },
  reducers: {
    operationLocal(state, action: PayloadAction<string>) { state.localMutations[action.payload] = true; },
    operationAbandoned(state, action: PayloadAction<string>) { delete state.localMutations[action.payload]; },
    operationReceived(state, action: PayloadAction<Operation>) {
      const current = state.items[action.payload.operationId];
      if (current && current.status !== "IN_PROGRESS" && action.payload.status === "IN_PROGRESS") return;
      state.items[action.payload.operationId] = action.payload;
      const ids = Object.keys(state.items);
      if (ids.length > 100) { delete state.items[ids[0]]; delete state.localMutations[ids[0]]; }
    },
    notificationReceived(state, action: PayloadAction<ChangeNotification>) {
      state.notifications[action.payload.operationId] = action.payload;
      const ids = Object.keys(state.notifications);
      if (ids.length > 100) delete state.notifications[ids[0]];
    },
  },
  extraReducers: (b) => b
    .addCase(librarySnapshotReceived, (state, action) => {
      state.librarySnapshot = action.payload;
      for (const notice of action.payload.items) state.libraryNotices[notice.id] = true;
    })
    .addCase(libraryNoticeReceived, (state, action) => {
      state.libraryNotices[action.payload.notice.id] = true;
      const ids = Object.keys(state.libraryNotices);
      if (ids.length > 1000) delete state.libraryNotices[ids[0]];
    })
    .addCase("auth/signedOut", () => ({ librarySnapshot: null, libraryNotices: {}, localMutations: {}, items: {}, notifications: {} })),
});
export const { operationReceived, notificationReceived, operationLocal, operationAbandoned } = operationsSlice.actions;
