import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import type { AuthState } from "@/store/auth";
import { createMockAdapter } from "@/mock/adapter";
import { requestHeaders } from "./headers";
type Query = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>;
export const useMock = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
export function createAppBaseQuery(config: {
  mock: boolean;
  url?: string;
  timeout?: number;
  mockAdapter?: Query;
  fetchFn?: NonNullable<Parameters<typeof fetchBaseQuery>[0]>["fetchFn"];
}): Query {
  const real = fetchBaseQuery({
      baseUrl: config.url,
      fetchFn: config.fetchFn,
      timeout:
        Number.isFinite(config.timeout) && config.timeout! > 0
          ? config.timeout
          : 15000,
      prepareHeaders: (headers, { getState }) => {
        const auth = (getState() as { auth: AuthState }).auth;
        if (auth.session)
          headers.set("Authorization", `Bearer ${auth.session.accessToken}`);
        return headers;
      },
    }),
    mock = config.mockAdapter ?? createMockAdapter();
  return async (args, api, options) => {
    const request = typeof args === "string" ? { url: args } : args;
    if (!config.mock && !config.url)
      return {
        error: {
          status: "CUSTOM_ERROR",
          error: "Chưa cấu hình NEXT_PUBLIC_API_BASE_URL cho API thật.",
        },
      };
    const headers = requestHeaders(request.headers),
      auth = (api.getState() as { auth: AuthState }).auth;
    if (config.mock && auth.session)
      headers.set("Authorization", `Bearer ${auth.session.accessToken}`);
    const result = config.mock
      ? await mock({ ...request, headers }, api, options)
      : await real(request, api, options);
    if (result.error?.status === 401 && auth.session) {
      api.dispatch({
        type: "auth/signedOut",
        payload: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.",
      });
      api.dispatch({ type: "staffApi/resetApiState" });
    }
    return result;
  };
}
export const baseQuery = createAppBaseQuery({
  mock: useMock,
  url: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 15000),
});
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const e = error as {
      data?: { error?: { message?: string } };
      error?: string;
    };
    return (
      e.data?.error?.message ??
      e.error ??
      "Không thể thực hiện yêu cầu. Vui lòng thử lại."
    );
  }
  return "Không thể thực hiện yêu cầu. Vui lòng thử lại.";
}
