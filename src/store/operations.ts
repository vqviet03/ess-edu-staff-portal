import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Operation, ChangeNotification } from "@/features/operations/models";
export const operationsSlice = createSlice({
  name: "operations",
  initialState: { items: {} as Record<string, Operation>, notifications: {} as Record<string, ChangeNotification> },
  reducers: {
    operationReceived(state, action: PayloadAction<Operation>) {
      const current = state.items[action.payload.operationId];
      if (current && current.status !== "IN_PROGRESS" && action.payload.status === "IN_PROGRESS") return;
      state.items[action.payload.operationId] = action.payload;
      const ids = Object.keys(state.items);
      if (ids.length > 100) delete state.items[ids[0]];
    },
    notificationReceived(state, action: PayloadAction<ChangeNotification>) {
      state.notifications[action.payload.operationId] = action.payload;
      const ids = Object.keys(state.notifications);
      if (ids.length > 100) delete state.notifications[ids[0]];
    },
  },
  extraReducers: (b) => b.addCase("auth/signedOut", () => ({ items: {}, notifications: {} })),
});
export const { operationReceived, notificationReceived } = operationsSlice.actions;
