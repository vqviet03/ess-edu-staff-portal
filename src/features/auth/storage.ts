import type { AuthSession } from "@/types";
import { apiConfiguration } from "@/api/config";
export const SESSION_KEY = "learnleaf.staff.auth";
export function expired(session: AuthSession) {
  let until = Date.parse(session.expiresAt);
  try {
    const body = session.accessToken.split(".")[1];
    if (body) {
      const parsed = JSON.parse(
        atob(body.replace(/-/g, "+").replace(/_/g, "/")),
      ) as { exp?: number };
      if (typeof parsed.exp === "number")
        until = Math.min(until, parsed.exp * 1000);
    }
  } catch {}
  return !Number.isFinite(until) || until <= Date.now();
}
export function readSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AuthSession & {apiMock?: boolean; apiBaseUrl?: string};
    const valid = typeof s?.accessToken === "string" && s.accessToken.length > 0 && typeof s.expiresAt === "string" && typeof s.teacher?.id === "string" && s.teacher.id.length > 0 && typeof s.teacher.name === "string";
    const correctBackend = s?.apiMock === undefined || (s.apiMock === apiConfiguration.mock && s.apiBaseUrl === apiConfiguration.baseUrl);
    if (valid && correctBackend && (apiConfiguration.mock || !s.accessToken.startsWith("demo-")) && !expired(s)) return s;
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  } catch {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    return null;
  }
}
export function writeSession(session: AuthSession | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify({...session, apiMock: apiConfiguration.mock, apiBaseUrl: apiConfiguration.baseUrl}));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}
