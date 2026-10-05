import { api } from "./api";
import type { Envelope } from "@/types";
import type { Operation, ChangeNotification } from "@/features/operations/models";
import { apiConfiguration } from "./config";
import type { AuthState } from "@/store/auth";
import { signedOut } from "@/store/auth";
import { notificationReceived } from "@/store/operations";
export const operationsApi = api.injectEndpoints({ endpoints: (b) => ({
  liveEvents: b.query<{ online: boolean }, string>({
    queryFn: () => ({ data: { online: false } }),
    keepUnusedDataFor: 0,
    async onCacheEntryAdded(userId, { getState, dispatch, updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
      if (apiConfiguration.mock || typeof window === "undefined") return;
      let socket: WebSocket | undefined, reconnect: ReturnType<typeof setTimeout> | undefined, stopped = false;
      const key = `ess.events.${userId}`;
      let cursor = "0", hasCursor = false;
      try { const saved = sessionStorage.getItem(key); hasCursor = saved !== null; cursor = saved ?? "0"; } catch {}
      const persist = () => { try { sessionStorage.setItem(key, cursor); } catch {} };
      const connect = () => {
        const session = (getState() as unknown as { auth: AuthState }).auth.session;
        if (stopped || !session || session.teacher.id !== userId) return;
        const url = new URL(apiConfiguration.baseUrl + "/events/ws"); url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        socket = new WebSocket(url);
        socket.onopen = () => socket?.send(JSON.stringify({ type: "AUTH", accessToken: session.accessToken, ...(hasCursor ? { cursor } : {}) }));
        socket.onmessage = (message) => {
          try {
            const frame = JSON.parse(String(message.data)) as { type: string; data?: ChangeNotification; cursor?: string };
            if (frame.type === "READY") { updateCachedData((state) => { state.online = true; }); if (frame.cursor) cursor = frame.cursor; hasCursor = true; persist(); dispatch(api.util.invalidateTags(["Operations"])); }
            if (frame.type === "CHANGE" && frame.data) {
              cursor = frame.data.eventId; persist(); dispatch(notificationReceived(frame.data));
            }
          } catch {}
        };
        socket.onclose = (event) => {
          if (stopped) return;
          updateCachedData((state) => { state.online = false; });
          if (event.code === 1008 && event.reason === "UNAUTHORIZED") { dispatch(signedOut("Phiên đăng nhập đã hết hạn.")); dispatch(api.util.resetApiState()); return; }
          reconnect = setTimeout(connect, 3000);
        };
      };
      try { await cacheDataLoaded; connect(); await cacheEntryRemoved; }
      catch { /* Cache may be removed during logout before initialization. */ }
      finally { stopped = true; clearTimeout(reconnect); socket?.close(); }
    },
  }),
  operations: b.query<{ items: Operation[] }, void>({ query: () => "/operations", transformResponse: (r: Envelope<{ items: Operation[] }>) => r.data, providesTags: ["Operations"] }),
  operation: b.query<Operation, string>({ query: (id) => `/operations/${encodeURIComponent(id)}`, transformResponse: (r: Envelope<Operation>) => r.data, keepUnusedDataFor: 10 }),
  operationEvents: b.query<{ items: ChangeNotification[] }, string>({ query: (after) => `/operations/events?after=${encodeURIComponent(after)}`, transformResponse: (r: Envelope<{ items: ChangeNotification[] }>) => r.data, keepUnusedDataFor: 0 }),
}) });
export const { useLiveEventsQuery, useOperationsQuery, useLazyOperationQuery, useLazyOperationEventsQuery } = operationsApi;
