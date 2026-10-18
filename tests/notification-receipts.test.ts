import test from "node:test";
import assert from "node:assert/strict";
import { rememberNotice } from "../src/features/notifications/toast-receipts";
test("toast receipts suppress repeat events after remount, isolate accounts and remain bounded", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  assert.equal(rememberNotice(storage, "a", "notice-1"), true);
  assert.equal(rememberNotice(storage, "a", "notice-1"), false);
  assert.equal(rememberNotice(storage, "b", "notice-1"), true);
  for (let i = 0; i < 300; i++) rememberNotice(storage, "a", `next-${i}`);
  assert.equal(JSON.parse(values.get("ees:notice-receipts:a")!).length, 256);
  assert.equal(rememberNotice(storage, "a", "next-299"), false);
});
