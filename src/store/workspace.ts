import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Workspace } from "@/features/management/models";
import { signedOut } from "./auth";
export const workspaceSlice = createSlice({
  name: "workspace",
  initialState: { selected: null as Workspace | null },
  reducers: {
    chooseWorkspace: (state, action: PayloadAction<Workspace | null>) => {
      state.selected = action.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(signedOut, (s) => {
      s.selected = null;
    });
  },
});
export const { chooseWorkspace } = workspaceSlice.actions;
