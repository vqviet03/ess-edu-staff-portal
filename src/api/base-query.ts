import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import type { AuthState } from "@/store/auth";
import { requestHeaders } from "./headers";
import { apiConfiguration, resolveApiConfiguration } from "./config";
import { expired } from "@/features/auth/storage";
type Query = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>;
export const useMock = apiConfiguration.mock;
export function createAppBaseQuery(config: {
  mock: boolean;
  url?: string;
  timeout?: number;
  configurationError?: string | null;
  mockAdapter?: Query;
  fetchFn?: NonNullable<Parameters<typeof fetchBaseQuery>[0]>["fetchFn"];
}): Query {
  const resolved = resolveApiConfiguration(String(config.mock), config.url, config.timeout ?? 15000);
  let mock = config.mockAdapter;
  const real = fetchBaseQuery({
      baseUrl: resolved.baseUrl,
      fetchFn: config.fetchFn,
      timeout: resolved.timeout,
      prepareHeaders: (headers, { getState, arg }) => {
        const auth = (getState() as { auth: AuthState }).auth;
        const path = typeof arg === "string" ? arg : arg.url;
        if (auth.session && !["/auth/login", "/auth/link/exchange", "/auth/activate"].includes(path))
          headers.set("Authorization", `Bearer ${auth.session.accessToken}`);
        else headers.delete("Authorization");
        headers.set("Accept", "application/json");
        return headers;
      },
    });
  return async (args, api, options) => {
    const request = typeof args === "string" ? { url: args } : args;
    if (config.configurationError || resolved.error)
      return {
        error: {
          status: "CUSTOM_ERROR",
          error: "Chưa cấu hình API.",
          data: {error: {code: "CONFIGURATION_ERROR", message: "Hệ thống chưa sẵn sàng. Vui lòng liên hệ trung tâm."}},
        },
      };
    const headers = requestHeaders(request.headers),
      auth = (api.getState() as { auth: AuthState }).auth;
    const publicRequest = ["/auth/login", "/auth/link/exchange", "/auth/activate"].includes(request.url) || (config.mock && request.url === "/demo/reset");
    const originalToken = auth.session?.accessToken;
    const currentToken = () => (api.getState() as { auth: AuthState }).auth.session?.accessToken;
    const endSession = () => {
      if (auth.session && currentToken() === originalToken) {
        api.dispatch({type: "auth/signedOut", payload: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."});
        api.dispatch({type: "staffApi/resetApiState"});
      }
    };
    if (!publicRequest && (!auth.session?.accessToken || expired(auth.session))) {
      endSession();
      return {error: {status: 401, data: {error: {code: "TOKEN_EXPIRED", message: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."}}}};
    }
    if (config.mock && auth.session && !publicRequest)
      headers.set("Authorization", `Bearer ${auth.session.accessToken}`);
    if (config.mock && !mock) mock = (await import("@/mock/adapter")).createMockAdapter();
    const result = config.mock
      ? await mock!({ ...request, headers }, api, options)
      : await real(request, api, options);
    if (result.error?.status === 401 && !publicRequest) endSession();
    return result;
  };
}
export const baseQuery = createAppBaseQuery({
  mock: useMock,
  url: apiConfiguration.baseUrl,
  timeout: apiConfiguration.timeout,
  configurationError: apiConfiguration.error,
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
