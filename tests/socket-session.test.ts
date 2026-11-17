import assert from "node:assert/strict";
import test from "node:test";
import { createSocketSessionCheck } from "../src/features/auth/socket-session";

test("socket auth failure checks once, sharing concurrent checks and limiting recovery", async () => {
  let calls = 0;
  let finish!: (value: { data: unknown }) => void;
  const check = createSocketSessionCheck(
    () => "token",
    () => {
      calls++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  );
  const first = check("token"),
    second = check("token");
  assert.equal(calls, 1);
  finish({ data: { id: "current-user" } });
  assert.equal(await first, true);
  assert.equal(await second, true);
  assert.equal(await check("token"), false);
  assert.equal(calls, 1);
});

test("network/403/401/server failures never authorize a reconnect or loop", async () => {
  for (const status of [401, 403, 500, "FETCH_ERROR", "TIMEOUT_ERROR"]) {
    let calls = 0;
    const check = createSocketSessionCheck(
      () => "token",
      async () => {
        calls++;
        return { data: { id: "old-cache" }, error: { status } };
      },
    );
    assert.equal(await check("token"), false);
    assert.equal(await check("token"), false);
    assert.equal(calls, 1);
  }
  const check = createSocketSessionCheck(
    () => "token",
    async () => {
      throw new Error("Offline");
    },
  );
  assert.equal(await check("token"), false);
});

test("old socket and late auth response cannot affect a new login or disposed lifecycle", async () => {
  let token: string | null = "old";
  let calls = 0;
  let finish!: (value: { data: unknown }) => void;
  const check = createSocketSessionCheck(
    () => token,
    () => {
      calls++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  );
  const pending = check("old");
  token = "new";
  finish({ data: { id: "old-user" } });
  assert.equal(await pending, false);
  assert.equal(await check("old"), false);
  token = null;
  assert.equal(await check("new"), false);
  assert.equal(calls, 1);
});
