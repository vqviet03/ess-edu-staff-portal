import type { Checkout } from "./models";
interface Attempt {
  fingerprint: string;
  key: string;
  workflowId?: string;
}
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export const attemptStorageKey = (classId: string, studentId: string) =>
  `ees.gift-checkout:${classId}:${studentId}`;
export function checkoutFingerprint(input: Checkout) {
  return JSON.stringify({
    ...input,
    items: [...input.items].sort((a, b) => a.giftId.localeCompare(b.giftId)),
  });
}
export function readAttempt(
  store: Store | undefined,
  key: string,
): Attempt | null {
  try {
    const value = JSON.parse(store?.getItem(key) ?? "null") as Attempt | null;
    return value &&
      typeof value.fingerprint === "string" &&
      typeof value.key === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}
export function checkoutAttempt(
  store: Store | undefined,
  key: string,
  input: Checkout,
  createKey: () => string,
): Attempt {
  const fingerprint = checkoutFingerprint(input),
    old = readAttempt(store, key);
  if (old?.fingerprint === fingerprint) return old;
  const attempt = { fingerprint, key: createKey() };
  try {
    store?.setItem(key, JSON.stringify(attempt));
  } catch {}
  return attempt;
}
export function rememberWorkflow(
  store: Store | undefined,
  key: string,
  workflowId: string,
) {
  const old = readAttempt(store, key);
  if (old)
    try {
      store?.setItem(key, JSON.stringify({ ...old, workflowId }));
    } catch {}
}
export function clearAttempt(store: Store | undefined, key: string) {
  try {
    store?.removeItem(key);
  } catch {}
}

export function browserAttemptStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}
