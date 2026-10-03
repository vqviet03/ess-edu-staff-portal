import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthSession, Teacher } from "@/types";
export interface AuthState {
  status: "booting" | "guest" | "validating" | "authenticated";
  session: AuthSession | null;
  message: string | null;
}
const initialState: AuthState = {
  status: "booting",
  session: null,
  message: null,
};
export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    restore: (s, a: PayloadAction<AuthSession | null>) => {
      s.session = a.payload;
      s.status = a.payload ? "validating" : "guest";
    },
    signedIn: (s, a: PayloadAction<AuthSession>) => {
      s.session = a.payload;
      s.status = "authenticated";
      s.message = null;
    },
    verified: (s, a: PayloadAction<Teacher>) => {
      if (s.session) {
        s.session.teacher = a.payload;
        s.status = "authenticated";
      }
    },
    signedOut: (s, a: PayloadAction<string | undefined>) => {
      s.session = null;
      s.status = "guest";
      s.message = a.payload ?? null;
    },
  },
});
export const { restore, signedIn, verified, signedOut } = authSlice.actions;
