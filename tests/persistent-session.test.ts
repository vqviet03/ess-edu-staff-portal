import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SESSION_KEY,
  readSession,
  writeSession,
} from "../src/features/auth/storage";
import type { AuthSession } from "../src/types";
function makeSession(expiry: number): AuthSession {
  const body = Buffer.from(
    JSON.stringify({ exp: Math.floor(expiry / 1000) }),
  ).toString("base64url");
  return {
    accessToken: `e30.${body}.test-signature`,
    expiresAt: new Date(expiry).toISOString(),
    teacher: { id: "teacher-one", name: "Giảng viên", roles: ["TEACHER"] },
  };
}
function stores() {
  const local = new Map<string, string>(),
    legacy = new Map<string, string>();
  const previous = ["localStorage", "sessionStorage"].map((key) =>
    Object.getOwnPropertyDescriptor(globalThis, key),
  );
  [local, legacy].forEach((values, i) =>
    Object.defineProperty(
      globalThis,
      i === 0 ? "localStorage" : "sessionStorage",
      {
        configurable: true,
        value: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
          removeItem: (key: string) => values.delete(key),
        },
      },
    ),
  );
  return {
    local,
    legacy,
    close: () =>
      ["localStorage", "sessionStorage"].forEach((key, i) => {
        if (previous[i]) Object.defineProperty(globalThis, key, previous[i]!);
        else Reflect.deleteProperty(globalThis, key);
      }),
  };
}
test("a server-issued one-year session survives per-tab storage removal without changing its expiry", () => {
  const s = stores();
  try {
    const session = makeSession(Date.now() + 365 * 86400000);
    writeSession(session);
    s.legacy.clear();
    assert.equal(readSession()?.accessToken, session.accessToken);
    assert.equal(readSession()?.expiresAt, session.expiresAt);
    assert.ok(s.local.has(SESSION_KEY));
  } finally {
    s.close();
  }
});
test("valid legacy session moves once to localStorage; logout clears both stores", () => {
  const s = stores();
  try {
    const session = makeSession(Date.now() + 86400000);
    writeSession(session);
    const raw = s.local.get(SESSION_KEY)!;
    s.local.clear();
    s.legacy.set(SESSION_KEY, raw);
    assert.equal(readSession()?.accessToken, session.accessToken);
    assert.equal(s.legacy.has(SESSION_KEY), false);
    assert.ok(s.local.has(SESSION_KEY));
    s.legacy.set(SESSION_KEY, raw);
    writeSession(null);
    assert.equal(s.local.size, 0);
    assert.equal(s.legacy.size, 0);
    assert.equal(readSession(), null);
  } finally {
    s.close();
  }
});
test("an expired persistent token cannot revive a valid but stale per-tab token", () => {
  const s = stores();
  try {
    writeSession(makeSession(Date.now() + 86400000));
    s.legacy.set(SESSION_KEY, s.local.get(SESSION_KEY)!);
    s.local.set(SESSION_KEY, JSON.stringify(makeSession(Date.now() - 1000)));
    assert.equal(readSession(), null);
    assert.equal(s.local.size, 0);
    assert.equal(s.legacy.size, 0);
  } finally {
    s.close();
  }
});
test("disabled storage does not throw or create an unauthenticated persisted session", () => {
  const s = stores();
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("Storage disabled");
      },
    });
    assert.doesNotThrow(() => writeSession(makeSession(Date.now() + 86400000)));
    assert.equal(readSession(), null);
    assert.doesNotThrow(() => writeSession(null));
  } finally {
    s.close();
  }
});
