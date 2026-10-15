import test from "node:test";
import assert from "node:assert/strict";
import {
  attemptStorageKey,
  checkoutAttempt,
  readAttempt,
  rememberWorkflow,
  clearAttempt,
  checkoutFingerprint,
} from "../src/features/gifts/checkout-attempt";
const cart = {
  classId: "class-a",
  studentId: "student-a",
  items: [{ giftId: "gift-a", quantity: 1, expectedPoints: 20 }],
};
test("checkout preserves one idempotency key across retries, remounts and ambiguous responses", () => {
  const values = new Map<string, string>(),
    store = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
      removeItem: (k: string) => {
        values.delete(k);
      },
    },
    key = attemptStorageKey(cart.classId, cart.studentId);
  assert.equal(checkoutAttempt(store, key, cart, () => "first").key, "first");
  rememberWorkflow(store, key, "workflow");
  assert.equal(
    checkoutAttempt(store, key, cart, () => "duplicate").key,
    "first",
  );
  assert.equal(readAttempt(store, key)?.workflowId, "workflow");
  clearAttempt(store, key);
  assert.equal(
    checkoutAttempt(store, key, cart, () => "new-intent").key,
    "new-intent",
  );
});
test("different prices, quantities, recipients and classes are separate confirmations", () => {
  const values = new Map<string, string>(),
    store = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
      removeItem: (k: string) => {
        values.delete(k);
      },
    };
  assert.notEqual(
    checkoutFingerprint(cart),
    checkoutFingerprint({ ...cart, studentId: "other" }),
  );
  assert.notEqual(attemptStorageKey("a", "u"), attemptStorageKey("b", "u"));
  checkoutAttempt(store, "attempt", cart, () => "a");
  assert.equal(
    checkoutAttempt(
      store,
      "attempt",
      { ...cart, items: [{ ...cart.items[0], expectedPoints: 30 }] },
      () => "b",
    ).key,
    "b",
  );
  const items = [
    ...cart.items,
    { giftId: "b", quantity: 1, expectedPoints: 2 },
  ];
  assert.equal(
    checkoutFingerprint({ ...cart, items }),
    checkoutFingerprint({ ...cart, items: [...items].reverse() }),
  );
});
