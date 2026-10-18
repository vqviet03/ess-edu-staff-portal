export function rememberNotice(
  storage: Pick<Storage, "getItem" | "setItem">,
  scope: string,
  id: string,
) {
  const key = `ees:notice-receipts:${scope}`;
  const parsed: unknown = JSON.parse(storage.getItem(key) || "[]");
  const ids = Array.isArray(parsed)
    ? parsed.filter((x): x is string => typeof x === "string").slice(-255)
    : [];
  if (ids.includes(id)) return false;
  storage.setItem(key, JSON.stringify([...ids, id]));
  return true;
}
export async function claimNoticeToast(scope: string, id: string) {
  if (document.hidden) return false;
  const claim = () => {
    if (document.hidden) return false;
    try {
      return rememberNotice(localStorage, scope, id);
    } catch {
      return true;
    }
  };
  return navigator.locks
    ? navigator.locks.request(`ees:notice-toast:${scope}`, claim)
    : claim();
}
