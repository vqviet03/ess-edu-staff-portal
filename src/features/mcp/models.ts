import type { McpConsent } from "@/api/mcp-api";
export function chatgptCallback(value: string) {
  try {
    const u = new URL(value);
    return (
      u.origin === "https://chatgpt.com" &&
      u.username === "" &&
      u.password === "" &&
      (u.pathname === "/connector_platform_oauth_redirect" ||
        /^\/connector\/oauth\/[a-zA-Z0-9_-]+$/.test(u.pathname))
    );
  } catch {
    return false;
  }
}
export function consentRequest(
  params: URLSearchParams,
): Omit<McpConsent, "roles" | "approve"> | null {
  const value = (key: string) =>
    params.getAll(key).length === 1 ? params.get(key)! : "";
  const r = {
    clientId: value("client_id"),
    redirectUri: value("redirect_uri"),
    responseType: value("response_type"),
    codeChallenge: value("code_challenge"),
    codeChallengeMethod: value("code_challenge_method"),
    resource: value("resource"),
    scope: value("scope"),
    state: value("state"),
  };
  try {
    const resource = new URL(r.resource);
    if (
      r.clientId !== "ees-chatgpt" ||
      !chatgptCallback(r.redirectUri) ||
      new URL(r.redirectUri).search !== "" ||
      new URL(r.redirectUri).hash !== "" ||
      r.responseType !== "code" ||
      r.codeChallengeMethod !== "S256" ||
      !/^[A-Za-z0-9_-]{43}$/.test(r.codeChallenge) ||
      resource.protocol !== "https:" ||
      resource.username ||
      resource.password ||
      resource.pathname.split("/").at(-1) !== "mcp" ||
      resource.hash ||
      resource.search ||
      !r.state ||
      r.state.length > 1024
    )
      return null;
    const scopes = r.scope.split(" ").filter(Boolean);
    if (
      !scopes.includes("ees.read") ||
      scopes.some((s) => !["ees.read", "offline_access"].includes(s))
    )
      return null;
    return r;
  } catch {
    return null;
  }
}
