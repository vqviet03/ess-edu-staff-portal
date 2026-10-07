import type { CursorPage, Notification } from "@/features/materials/models";
import { libraryNoticeReceived, librarySnapshotReceived } from "@/features/materials/notification-state";
import { api } from "./api";
import type { Envelope } from "@/types";
import type { Operation, ChangeNotification } from "@/features/operations/models";
import { apiConfiguration } from "./config";
import type { AuthState } from "@/store/auth";
import { signedOut } from "@/store/auth";
import { notificationReceived, operationReceived } from "@/store/operations";
import { connectOperationChannel, receiveOperation } from "@/features/operations/channel";
import { foregroundSocketAllowed } from "@/features/operations/foreground";
export const operationsApi = api.injectEndpoints({ endpoints: (b) => ({
  liveEvents: b.query<{ online: boolean }, string>({
    queryFn: () => ({ data: { online: false } }),
    keepUnusedDataFor: 0,
    async onCacheEntryAdded(userId, { getState, dispatch, updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
      if (apiConfiguration.mock || typeof window === "undefined") return;
      let socket: WebSocket | undefined, reconnect: ReturnType<typeof setTimeout> | undefined, stopped = false, attempts = 0;
      let disconnect: (() => void) | undefined;
      const key = `ess.events.${userId}`;
      let cursor = "0", hasCursor = false;
      try { const saved = sessionStorage.getItem(key); hasCursor = saved !== null; cursor = saved ?? "0"; } catch {}
      const persist = () => { try { sessionStorage.setItem(key, cursor); } catch {} };
      const allowed = () => foregroundSocketAllowed(document.hidden, navigator.onLine, stopped);
      const pause = () => {
        clearTimeout(reconnect); disconnect?.(); disconnect = undefined;
        const previous = socket; socket = undefined;
        if (previous) { previous.onclose = null; previous.onmessage = null; previous.onopen = null; previous.close(1000, "BACKGROUND"); }
        updateCachedData((state) => { state.online = false; });
      };
      const connect = () => {
        const session = (getState() as unknown as { auth: AuthState }).auth.session;
        if (!allowed() || !session || session.teacher.id !== userId || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
        const url = new URL(apiConfiguration.baseUrl + "/events/ws"); url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        socket = new WebSocket(url);
        socket.onopen = () => socket?.send(JSON.stringify({ type: "AUTH", accessToken: session.accessToken, ...(hasCursor ? { cursor } : {}) }));
        socket.onmessage = (message) => {
          try {
            const frame = JSON.parse(String(message.data)) as { type: string; data?: ChangeNotification | Operation | Notification | CursorPage<Notification>; cursor?: string };
            if (frame.type === "READY") {
              updateCachedData((state) => { state.online = true; });
              if (frame.cursor) cursor = frame.cursor;
              hasCursor = true; attempts = 0; persist(); disconnect?.();
              disconnect = connectOperationChannel(session.accessToken, (operationId) => {
                if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "WATCH", operationId }));
              });
            }
            if (frame.type === "OPERATION" && frame.data && "operationId" in frame.data && "createdAt" in frame.data) {
              dispatch(operationReceived(frame.data)); receiveOperation(session.accessToken, frame.data);
            }
            if (frame.type === "NOTIFICATION" && frame.data && "isRead" in frame.data) {
              dispatch(libraryNoticeReceived({ notice: frame.data }));
            }
            if (frame.type === "NOTIFICATIONS" && frame.data && "items" in frame.data) {
              dispatch(librarySnapshotReceived(frame.data));
            }
            if (frame.type === "CHANGE" && frame.data && "eventId" in frame.data) {
              cursor = frame.data.eventId; persist(); dispatch(notificationReceived(frame.data));
            }
          } catch {}
        };
        socket.onclose = (event) => {
          if (stopped) return;
          socket = undefined;
          disconnect?.(); disconnect = undefined;
          updateCachedData((state) => { state.online = false; });
          if (event.code === 1008 && event.reason === "UNAUTHORIZED") { dispatch(signedOut("Phiên đăng nhập đã hết hạn.")); dispatch(api.util.resetApiState()); return; }
          if (allowed()) reconnect = setTimeout(connect, Math.min(60000, 3000 * 2 ** attempts++));
        };
      };
      const resume = () => { if (allowed()) { clearTimeout(reconnect); connect(); } else pause(); };
      try {
        await cacheDataLoaded;
        document.addEventListener("visibilitychange", resume);
        window.addEventListener("offline", pause);
        window.addEventListener("online", resume);
        window.addEventListener("pagehide", pause);
        window.addEventListener("pageshow", resume);
        connect(); await cacheEntryRemoved;
      }
      catch { /* Cache may be removed during logout before initialization. */ }
      finally {
        stopped = true;
        document.removeEventListener("visibilitychange", resume);
        window.removeEventListener("offline", pause);
        window.removeEventListener("online", resume);
        window.removeEventListener("pagehide", pause);
        window.removeEventListener("pageshow", resume);
        pause();
      }
    },
  }),
  operations: b.query<{ items: Operation[] }, void>({ query: () => "/operations", transformResponse: (r: Envelope<{ items: Operation[] }>) => r.data, providesTags: ["Operations"] }),
  operation: b.query<Operation, string>({ query: (id) => `/operations/${encodeURIComponent(id)}`, transformResponse: (r: Envelope<Operation>) => r.data, keepUnusedDataFor: 10 }),
  operationEvents: b.query<{ items: ChangeNotification[] }, string>({ query: (after) => `/operations/events?after=${encodeURIComponent(after)}`, transformResponse: (r: Envelope<{ items: ChangeNotification[] }>) => r.data, keepUnusedDataFor: 0 }),
}) });
export const { useLiveEventsQuery, useOperationsQuery, useLazyOperationQuery, useLazyOperationEventsQuery } = operationsApi;
