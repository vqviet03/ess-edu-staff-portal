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
import { businessMutation, operationEnvelope } from "@/features/operations/models";
import { operationReceived } from "@/store/operations";
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
    if (businessMutation(request.url, request.method)) {
      headers.set("Prefer", "respond-async");
      if (!headers.has("Idempotency-Key")) headers.set("Idempotency-Key", crypto.randomUUID());
    }
    const send = (arg: FetchArgs) => config.mock ? mock!(arg, api, options) : real(arg, api, options);
    const result = await send({ ...request, headers });
    if (result.error?.status === 401 && !publicRequest) endSession();
    let operation = operationEnvelope(result.data);
    if (operation && businessMutation(request.url, request.method)) {
      api.dispatch(operationReceived(operation));
      let failures = 0;
      while (operation.status === "IN_PROGRESS" && !api.signal.aborted) {
        await new Promise<void>((resolve) => {
          const done = () => { clearTimeout(timer); api.signal.removeEventListener("abort", done); resolve(); };
          const timer = setTimeout(done, 700); api.signal.addEventListener("abort", done, { once: true });
        });
        if (api.signal.aborted) break;
        const next = await send({ url: `/operations/${encodeURIComponent(operation.operationId)}`, headers });
        if (next.error) {
          if (next.error.status === 401) { endSession(); return next; }
          if (++failures >= 3) return { error: { status: "CUSTOM_ERROR", error: "Mất kết nối theo dõi. Tác vụ đã gửi vẫn được xử lý; xem thông báo trước khi gửi lại." } };
          continue;
        }
        failures = 0;
        const updated = operationEnvelope(next.data);
        if (!updated) return { error: { status: "CUSTOM_ERROR", error: "Response tác vụ không hợp lệ." } };
        operation = updated; api.dispatch(operationReceived(operation));
      }
      if (operation.status === "DONE") return { data: operation.result };
      if (operation.status === "FAILED") {
        if (operation.error?.status === 401) endSession();
        return { error: { status: operation.error?.status ?? 500, data: { error: operation.error ?? { code: "OPERATION_FAILED", message: "Tác vụ thất bại, dữ liệu chưa được lưu." } } } };
      }
      return { error: { status: "CUSTOM_ERROR", error: "Đã ngừng theo dõi; tác vụ đã gửi vẫn được xử lý." } };
    }
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
