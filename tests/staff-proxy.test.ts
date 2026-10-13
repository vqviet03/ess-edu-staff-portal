import {test} from "node:test";
import assert from "node:assert/strict";
import worker, {proxyRequest} from "../infra/staff-api-proxy/worker";
const env = {API_ORIGIN: "https://ess-edu-api-920149468670.asia-southeast1.run.app", PUBLIC_ORIGIN: "https://staff.eeslern.com"};

test("proxy forwards auth, mutation, query, version and idempotency without exposing API URLs", async () => {
  const body = JSON.stringify({version: 4, title: "Bài học"});
  const request = new Request(env.PUBLIC_ORIGIN + "/api/v1/posts/p1?mode=save", {method: "PATCH", body, headers: {authorization: "Bearer demo-test-token", "content-type": "application/json", "idempotency-key": "test-key", "if-match": "4"}});
  let calls = 0;
  const response = await proxyRequest(request, env, async (input, init) => {
    calls++;
    const forwarded = new Request(input, init);
    assert.equal(forwarded.url, env.API_ORIGIN + "/v1/posts/p1?mode=save");
    assert.equal(forwarded.method, "PATCH");
    assert.equal(await forwarded.text(), body);
    assert.equal(forwarded.headers.get("authorization"), "Bearer demo-test-token");
    assert.equal(forwarded.headers.get("idempotency-key"), "test-key");
    assert.equal(forwarded.headers.get("if-match"), "4");
    return Response.json({data: {url: env.API_ORIGIN + "/v1/materials/m1/content", upload: "https://private.storage.neon.tech/object"}}, {status: 202, headers: {location: env.API_ORIGIN + "/v1/operations/o1"}});
  });
  assert.equal(calls, 1); assert.equal(response.status, 202);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("location"), env.PUBLIC_ORIGIN + "/api/v1/operations/o1");
  assert.deepEqual(await response.json(), {data: {url: env.PUBLIC_ORIGIN + "/api/v1/materials/m1/content", upload: "https://private.storage.neon.tech/object"}});
});

test("proxy preserves authorized file stream and backend failures, never caches them", async () => {
  const request = new Request(env.PUBLIC_ORIGIN + "/api/v1/materials/m1/content");
  const file = await proxyRequest(request, env, async () => new Response("pdf-bytes", {headers: {"content-type": "application/pdf"}}));
  assert.equal(await file.text(), "pdf-bytes");
  const denied = await proxyRequest(request, env, async () => Response.json({error: {code: "FORBIDDEN"}}, {status: 403}));
  assert.equal(denied.status, 403); assert.equal(denied.headers.get("cache-control"), "no-store");
});

test("WebSocket upgrade is forwarded unchanged to the authenticated backend endpoint", async () => {
  const upgrade = {status: 101} as Response;
  const response = await proxyRequest(new Request(env.PUBLIC_ORIGIN + "/api/v1/events/ws", {headers: {upgrade: "websocket"}}), env, async (input, init) => {
    const forwarded = new Request(input, init);
    assert.equal(forwarded.url, env.API_ORIGIN + "/v1/events/ws");
    assert.equal(forwarded.headers.get("upgrade"), "websocket");
    return upgrade;
  });
  assert.equal(response, upgrade);
});

test("proxy rejects wrong origin/paths and hides transport errors without retries", async () => {
  const send: typeof fetch = async () => {throw new Error("Must not dispatch");};
  for (const url of [env.PUBLIC_ORIGIN + "/api/admin", "https://other.test/api/v1/me", env.PUBLIC_ORIGIN + "/api/v1/%2e%2e/admin"])
    assert.equal((await proxyRequest(new Request(url), env, send)).status, 404);
  let calls = 0;
  const response = await proxyRequest(new Request(env.PUBLIC_ORIGIN + "/api/v1/me"), env, async () => {calls++; throw new Error(env.API_ORIGIN + " private error");});
  assert.equal(calls, 1); assert.equal(response.status, 502);
  assert.equal((await response.text()).includes(env.API_ORIGIN), false);
});

test("Cloudflare entrypoint does not treat ExecutionContext as an HTTP client", async () => {
  assert.equal((await worker.fetch(new Request("https://other.test/api/v1/me"), env)).status, 404);
});

test("HEAD and empty API responses are forwarded without attempting to parse JSON", async () => {
  const head = await proxyRequest(new Request(env.PUBLIC_ORIGIN + "/api/v1/application-settings", {method: "HEAD"}), env,
    async () => new Response(null, {headers: {"content-type": "application/json"}}));
  assert.equal(head.status, 200); assert.equal(await head.text(), "");
  const empty = await proxyRequest(new Request(env.PUBLIC_ORIGIN + "/api/v1/me"), env,
    async () => new Response(null, {status: 204}));
  assert.equal(empty.status, 204);
});
