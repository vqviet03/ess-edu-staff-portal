// Transport policy is shared by reconnect and visibility handlers. No HTTP fallback.
export function foregroundSocketAllowed(hidden: boolean, online: boolean, stopped: boolean) {
  return !hidden && online && !stopped;
}
