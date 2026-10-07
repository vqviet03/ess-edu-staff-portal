import test from "node:test";
import assert from "node:assert/strict";
import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import { createStaffApi } from "../src/api/api";
import { createAppBaseQuery } from "../src/api/base-query";
import { libraryApi } from "../src/api/library-api";
import { makeStore } from "../src/store";
import { signedIn, signedOut } from "../src/store/auth";
import { notificationReceived, operationLocal } from "../src/store/operations";
import { connectOperationChannel, receiveOperation, waitForOperation } from "../src/features/operations/channel";
import { libraryNoticeReceived, mergeNotice, notificationFilter } from "../src/features/materials/notification-state";
import type { AuthSession } from "../src/types";
import type { Operation, ChangeNotification } from "../src/features/operations/models";
import type { CursorPage, Notification } from "../src/features/materials/models";

const identity: AuthSession = { accessToken: "socket-test-token", expiresAt: new Date(Date.now() + 3600000).toISOString(), teacher: { id: "teacher", name: "Giảng viên", roles: ["TEACHER"], profileStatus: "ACTIVE", accountStatus: "ACTIVE" } };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers: {"Content-Type": "application/json"}});
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 30));

test("same query subscriptions deduplicate; focus/reconnect/remount do not call HTTP", async () => {
  const calls: string[] = [];
  const service = createStaffApi(async (args) => { calls.push(typeof args === "string" ? args : args.url); return {data: {data: identity.teacher}}; });
  const store = makeStore(service);
  store.dispatch(signedIn(identity));
  const first = store.dispatch(service.endpoints.me.initiate());
  const second = store.dispatch(service.endpoints.me.initiate());
  await Promise.all([first.unwrap(), second.unwrap()]);
  assert.equal(calls.length, 1);
  store.dispatch(service.internalActions.onFocusLost());
  store.dispatch(service.internalActions.onFocus());
  store.dispatch(service.internalActions.onOffline());
  store.dispatch(service.internalActions.onOnline());
  first.unsubscribe(); second.unsubscribe();
  const remounted = store.dispatch(service.endpoints.me.initiate());
  await remounted.unwrap(); await settle();
  assert.equal(calls.length, 1);
  remounted.unsubscribe(); store.dispatch(signedOut());
});

test("async mutation waits for socket result: one POST and zero operation GETs", async () => {
  const calls: string[] = [], actions: unknown[] = [];
  const op: Operation = {operationId: "op-1", command: "Staff.Result", status: "IN_PROGRESS", createdAt: new Date().toISOString(), completedAt: null};
  const disconnect = connectOperationChannel(identity.accessToken, (id) => {
    assert.equal(id, op.operationId);
    queueMicrotask(() => receiveOperation(identity.accessToken, {...op, status: "DONE", result: {data: {version: 2}}, completedAt: new Date().toISOString()}));
  });
  const base = createAppBaseQuery({mock: false, url: "https://api.test/v1", fetchFn: async (request) => {
    const req = request as Request; calls.push(`${req.method} ${new URL(req.url).pathname}`);
    assert.equal(req.headers.get("Prefer"), "respond-async");
    return json({data: op}, 202);
  }});
  const runtime = {signal: new AbortController().signal, dispatch: (action: unknown) => actions.push(action), getState: () => ({auth: {session: identity}}), endpoint: "save", type: "mutation"} as unknown as BaseQueryApi;
  try {
    const result = await base({url: "/assessments/a/results/student", method: "PUT", body: {version: 1}}, runtime, {});
    assert.deepEqual(result.data, {data: {version: 2}});
    assert.deepEqual(calls, ["PUT /v1/assessments/a/results/student"]);
    assert(actions.some((action) => (action as {type: string}).type === "operations/operationLocal"));
  } finally { disconnect(); }
});

test("socket timeout/abort do not poll; reconnect watches pending IDs; tokens stay isolated", async () => {
  const control = new AbortController();
  const waiting = waitForOperation("channel-a", "op-a", control.signal, 2000);
  const watched: string[] = [];
  const disconnect = connectOperationChannel("channel-a", (id) => watched.push(id));
  assert.deepEqual(watched, ["op-a"]);
  const done: Operation = {operationId: "op-a", command: "Staff.Result", status: "DONE", createdAt: "", completedAt: "", result: {data: "ok"}};
  receiveOperation("channel-b", done);
  control.abort(); await assert.rejects(waiting, /socket/);
  disconnect();
  await assert.rejects(waitForOperation("channel-c", "op-c", new AbortController().signal, 5), /socket/);
});

test("concurrent forbidden actions refresh /auth/me once and never retry mutations; 401 logs out", async () => {
  const calls: string[] = [], actions: unknown[] = [];
  let auth: AuthSession | null = identity;
  const base = createAppBaseQuery({mock: false, url: "https://api.test/v1", fetchFn: async (request) => {
    const path = new URL((request as Request).url).pathname; calls.push(path);
    if (path.endsWith("/auth/me")) { await settle(); return json({data: {...identity.teacher, roles: ["MANAGER"]}}); }
    return json({error: {code: "FORBIDDEN", message: "Không có quyền"}}, path.endsWith("/expired") ? 401 : 403);
  }});
  const runtime = {signal: new AbortController().signal, dispatch: (action: unknown) => {
    actions.push(action); if ((action as {type: string}).type === "auth/signedOut") auth = null;
  }, getState: () => ({auth: {session: auth}}), endpoint: "action", type: "mutation"} as unknown as BaseQueryApi;
  const results = await Promise.all([base({url: "/denied", method: "PATCH"}, runtime, {}), base({url: "/denied", method: "PATCH"}, runtime, {})]);
  assert(results.every((r) => r.error?.status === 403));
  assert.equal(calls.filter((p) => p.endsWith("/auth/me")).length, 1);
  assert.equal(calls.filter((p) => p.endsWith("/denied")).length, 2);
  assert(actions.some((action) => (action as {type: string}).type === "auth/verified"));
  await base("/expired", runtime, {});
  assert.equal(auth, null);
  assert.equal(calls.filter((p) => p.endsWith("/auth/me")).length, 1);
});

test("actor completion and replayed socket event do not invalidate the same query twice", async () => {
  let calls = 0;
  const service = createStaffApi(async () => { calls++; return {data: {data: {id: "class", name: "ESS", code: "ess20"}}}; });
  const store = makeStore(service); store.dispatch(signedIn(identity));
  const query = store.dispatch(service.endpoints.class.initiate("class")); await query.unwrap();
  const event: ChangeNotification = {eventId: "1", operationId: "local", actorId: "teacher", status: "DONE", command: "Management.Commit", entities: ["classes"], completedAt: new Date().toISOString()};
  store.dispatch(operationLocal("local")); store.dispatch(notificationReceived(event)); await settle(); assert.equal(calls, 1);
  store.dispatch(notificationReceived({...event, operationId: "external", actorId: "another", eventId: "2"})); await settle(); assert.equal(calls, 2);
  store.dispatch(notificationReceived({...event, operationId: "external", actorId: "another", eventId: "3"})); await settle(); assert.equal(calls, 2);
  query.unsubscribe(); store.dispatch(signedOut());
});

test("notification default filters share a key; socket patches list/count once without refetch", async () => {
  assert.deepEqual(notificationFilter({type: "", isRead: undefined, cursor: undefined}), {});
  const store = makeStore(); store.dispatch(signedIn(identity));
  await store.dispatch(libraryApi.util.upsertQueryData("notifications", {}, {items: [], nextCursor: null, unreadCount: 0}));
  const entry = Object.values(store.getState().staffApi.queries)[0]; const requestId = entry?.requestId;
  const notice: Notification = {id: "notice", type: "MATERIAL", title: "Bài mới", href: "/session/", isRead: false, version: 1, createdAt: new Date().toISOString()};
  store.dispatch(libraryNoticeReceived({cursor: "1", notice}));
  store.dispatch(libraryNoticeReceived({cursor: "2", notice}));
  const state = libraryApi.endpoints.notifications.select({type: "", cursor: undefined})(store.getState());
  assert.equal(state.data?.items.length, 1); assert.equal(state.data?.unreadCount, 1); assert.equal(state.requestId, requestId);
  const filtered: CursorPage<Notification> = {items: [], nextCursor: null, unreadCount: 0};
  mergeNotice(filtered, {type: "STORAGE"}, notice);
  assert.equal(filtered.items.length, 0); assert.equal(filtered.unreadCount, 1);
  store.dispatch(signedOut());
});

test("socket initial snapshot populates notifications without a query subscription", async () => {
  const { librarySnapshotReceived } = await import("../src/features/materials/notification-state");
  const store = makeStore(); store.dispatch(signedIn(identity));
  const notice: Notification = {id:"snapshot",type:"MATERIAL",title:"Bài học",href:"/session/",isRead:false,version:1,createdAt:new Date().toISOString()};
  store.dispatch(librarySnapshotReceived({items:[notice],nextCursor:null,unreadCount:1}));
  await settle();
  const data = libraryApi.endpoints.notifications.select({})(store.getState()).data;
  assert.equal(data?.items[0].id, "snapshot"); assert.equal(data?.unreadCount, 1);
  store.dispatch(libraryNoticeReceived({notice}));
  assert.equal(libraryApi.endpoints.notifications.select({})(store.getState()).data?.unreadCount, 1);
  store.dispatch(signedOut());
});
