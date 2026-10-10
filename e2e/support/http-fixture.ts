import type { Page, WebSocketRoute } from '@playwright/test';
import { createMockAdapter } from '../../src/mock/adapter';
import { seed, type Database } from '../../src/mock/fixtures';
import { resolveApiConfiguration } from '../../src/api/config';
import type { Notification } from '../../src/features/materials/models';
import type { AuthSession, Envelope } from '../../src/types';
import type { BaseQueryApi } from '@reduxjs/toolkit/query';

// Only tests intercept HTTP. The production browser executes real fetchBaseQuery.
export async function installHttpFixture(page: Page, shared?: { get: () => string; set: (value: string) => void }) {
  page.on("pageerror",e=>console.error("BROWSER_ERROR",e.message));
  const config = resolveApiConfiguration('false', process.env.NEXT_PUBLIC_API_BASE_URL);
  if (config.error) throw new Error(config.error);
  const prefix = new URL(config.baseUrl).pathname;
  let value = JSON.stringify(seed());
  const database = shared ?? {get: () => value, set: (next: string) => {value = next;}};
  const adapter = createMockAdapter({getItem: () => database.get(), setItem: (_key, next) => {database.set(next);}}, 0);
  const runtime = {signal: new AbortController().signal, abort() {}, dispatch: () => {}, getState: () => ({}), extra: undefined, endpoint: 'httpFixture', type: 'query'} as BaseQueryApi;
  let queue = Promise.resolve();
  const sockets = new Set<WebSocketRoute>();
  const persistedNotices = new Map<string, Notification>();
  let connections = 0, closes = 0;
  await page.route(`${config.baseUrl}/**`, route => {
    queue = queue.then(async () => {
      const request = route.request();
      const cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type,idempotency-key,accept,prefer,x-workspace', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS'};
      if (request.method() === 'OPTIONS') {await route.fulfill({status:204, headers:cors});return;}
      let body: unknown;
      if (request.headers()['content-type']?.startsWith('multipart/form-data')) {
        body = await new Request('http://fixture.test', {method:'POST', headers:request.headers(), body:Uint8Array.from(request.postDataBuffer() ?? [])}).formData();
      } else if (request.postData()) body = request.postDataJSON();
      const url = new URL(request.url());
      const endpoint = url.pathname.slice(prefix.length) + url.search;
      const classThread = url.pathname.slice(prefix.length).match(/^\/classes\/([^/]+)\/(threads|thread-sessions)$/);
      if (classThread && request.method() === 'GET') {
        const db = JSON.parse(database.get()) as Database;
        const items = classThread[2] === 'threads' ? [] : db.sessions.filter(s => s.classId === classThread[1]);
        await route.fulfill({status:200, headers:cors, contentType:'application/json', body:JSON.stringify({data:{items,nextCursor:null}})});
        return;
      }
      if (/^\/classes\/[^/]+\/schedule$/.test(endpoint) && request.method() === 'GET') {
        await route.fulfill({status:200, headers:cors, contentType:'application/json', body:JSON.stringify({data:{classId:endpoint.split('/')[2],version:0,effectiveFrom:null,configuration:{mode:'FLEXIBLE',cycle:'WEEKLY',timeMode:'FLEXIBLE',startTime:null,endTime:null,slots:[]},occurrences:[],timeZone:'Asia/Ho_Chi_Minh'}})}); return;
      }
      const response = await adapter({url:endpoint, method:request.method(), headers:request.headers(), body}, runtime, {});
      if (!response.error && ['/auth/login','/auth/link/exchange'].includes(endpoint)) {
        const session = (response.data as Envelope<AuthSession>).data;
        const db = JSON.parse(database.get()) as Database;
        delete db.tokens[session.accessToken];
        session.accessToken = `e30.${Buffer.from(JSON.stringify({exp:Math.floor(Date.parse(session.expiresAt)/1000)})).toString('base64url')}.${crypto.randomUUID()}`;
        db.tokens[session.accessToken] = session;
        database.set(JSON.stringify(db));
      }
      if (response.error) {
        await route.fulfill({status:typeof response.error.status === 'number' ? response.error.status : 500, headers:cors, contentType:'application/json', body:JSON.stringify(response.error.data)});
      } else if (response.data instanceof Blob) {
        await route.fulfill({status:200, headers:cors, contentType:response.data.type, body:Buffer.from(await response.data.arrayBuffer())});
      } else await route.fulfill({status:request.headers().prefer === 'respond-async' && request.method() !== 'GET' && typeof response.data === 'object' && response.data !== null && 'data' in response.data && typeof response.data.data === 'object' && response.data.data !== null && 'operationId' in response.data.data ? 202 : 200, headers:cors, contentType:'application/json', body:JSON.stringify(response.data)});
    });
    return queue;
  });
  await page.routeWebSocket(config.baseUrl.replace(/^http/, 'ws') + '/events/ws', socket => {
    connections++;
    let token = '', cursor = '0', timer: ReturnType<typeof setInterval> | undefined;
    socket.onMessage(async message => {
      try {
        const auth = JSON.parse(String(message)) as {type?: string; accessToken?: string; cursor?: string; operationId?: string};
        if (auth.type === 'WATCH' && token && auth.operationId) {
          const result = await adapter({url:`/operations/${auth.operationId}`, headers:{Authorization:`Bearer ${token}`}}, runtime, {});
          if (!result.error) socket.send(JSON.stringify({type:'OPERATION', data:(result.data as {data:unknown}).data}));
          return;
        }
        if (auth.type !== 'AUTH' || !auth.accessToken) {socket.close({code:1008, reason:'UNAUTHORIZED'});return;}
        token = auth.accessToken;
        const checked = await adapter({url:'/auth/me', headers:{Authorization:`Bearer ${token}`}}, runtime, {});
        if (checked.error) {socket.close({code:1008, reason:'UNAUTHORIZED'});return;}
        const db = JSON.parse(database.get()) as Database;
        cursor = auth.cursor ?? db.operationEvents?.at(-1)?.eventId ?? '0';
        sockets.add(socket);
        socket.send(JSON.stringify({type:'READY', cursor}));
        socket.send(JSON.stringify({type:'NOTIFICATIONS', data:{items:[...persistedNotices.values()],nextCursor:null,unreadCount:[...persistedNotices.values()].filter(n => !n.isRead).length}}));
        timer = setInterval(() => {
          const current = JSON.parse(database.get()) as Database;
          const me = current.tokens[token]?.teacher;
          if (!me || Date.parse(current.tokens[token].expiresAt) <= Date.now()) { clearInterval(timer); socket.close({code:1008, reason:'UNAUTHORIZED'}); return; }
          for (const event of current.operationEvents ?? []) if (BigInt(event.eventId) > BigInt(cursor) && (me?.roles?.includes('MANAGER') || event.actorId === me?.id)) {socket.send(JSON.stringify({type:'CHANGE', data:event}));cursor=event.eventId;}
        }, 50);
      } catch {socket.close({code:1008, reason:'UNAUTHORIZED'});}
    });
    socket.onClose(() => { closes++; clearInterval(timer); sockets.delete(socket); });
  });
  return { connectionCounts: () => ({connections, closes, active:sockets.size}), pushNotice: (notice: Notification) => {
    persistedNotices.set(notice.id, notice);
    for (const socket of sockets) socket.send(JSON.stringify({type:'NOTIFICATION', data:notice}));
  }};
}
