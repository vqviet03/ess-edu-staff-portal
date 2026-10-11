/** A socket close is not proof that an HTTP session has expired.
 * Check once per token/lifecycle, share concurrent checks, and never poll/retry.
 * The existing RTK Query baseQuery owns logout on an actual HTTP 401.
 */
export function createSocketSessionCheck(
  currentToken: () => string | null | undefined,
  verify: () => Promise<{ data?: unknown; error?: unknown }>,
) {
  let attemptedToken: string | undefined;
  let pending: Promise<boolean> | undefined;
  return (token: string): Promise<boolean> => {
    if (currentToken() !== token) return Promise.resolve(false);
    if (attemptedToken === token) return pending ?? Promise.resolve(false);
    attemptedToken = token;
    pending = (async () => {
      try {
        const result = await verify();
        return currentToken() === token && !result.error && result.data !== undefined;
      } catch {
        // Offline, timeout, 403 and server failures do not revoke the session.
        return false;
      } finally {
        pending = undefined;
      }
    })();
    return pending;
  };
}
