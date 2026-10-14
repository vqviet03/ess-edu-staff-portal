export const portal = "staff" as const;
export const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(
  /\/$/,
  "",
);
export function supportsPush() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
export const invalidPushKeyMessage =
  "Không thể bật thông báo đẩy vì cấu hình khóa thông báo của hệ thống chưa hợp lệ. Vui lòng liên hệ quản lý.";
export function applicationKey(value: string) {
  try {
    // VAPID uses an uncompressed P-256 point (65 bytes), encoded as base64url.
    if (!/^[A-Za-z0-9_-]{87}=?$/.test(value)) throw new Error();
    const b = atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(88, "="));
    const key = Uint8Array.from(b, (c) => c.charCodeAt(0));
    if (key.length !== 65 || key[0] !== 4) throw new Error();
    return key;
  } catch {
    throw new Error(invalidPushKeyMessage);
  }
}
export function registerWorker() {
  return navigator.serviceWorker.register(`${basePath}/ess-sw.js`, {
    scope: `${basePath}/`,
  });
}

export const hiddenPreferenceTypes: string[] = [];
