import test from "node:test";
import assert from "node:assert/strict";
import { chatgptCallback, consentRequest } from "../src/features/mcp/models";
function query() {
  return new URLSearchParams({
    client_id: "ees-chatgpt",
    redirect_uri: "https://chatgpt.com/connector_platform_oauth_redirect",
    response_type: "code",
    code_challenge: "a".repeat(43),
    code_challenge_method: "S256",
    resource: "https://api.ees.example/mcp",
    scope: "ees.read offline_access",
    state: "oauth-state",
  });
}
test("MCP consent accepts only read scope, S256 and ChatGPT callbacks", () => {
  const q = query();
  assert.equal(consentRequest(q)?.state, "oauth-state");
  for (const [key, value] of [
    ["redirect_uri", "https://evil.test/connector_platform_oauth_redirect"],
    [
      "redirect_uri",
      "https://chatgpt.com@evil.test/connector_platform_oauth_redirect",
    ],
    ["scope", "ees.read ees.write"],
    ["code_challenge_method", "plain"],
    ["resource", "http://api.ees.example/mcp"],
    ["code_challenge", "short"],
    ["client_id", "other"],
  ]) {
    const bad = query();
    bad.set(key, value);
    assert.equal(consentRequest(bad), null);
  }
});
test("duplicate OAuth arguments, unsafe callbacks and missing state are rejected", () => {
  const duplicate = query();
  duplicate.append("state", "other");
  assert.equal(consentRequest(duplicate), null);
  const missing = query();
  missing.delete("state");
  assert.equal(consentRequest(missing), null);
  assert.equal(
    chatgptCallback(
      "https://chatgpt.com/connector_platform_oauth_redirect?code=x&iss=https%3A%2F%2Fapi.ees.example",
    ),
    true,
  );
  assert.equal(
    chatgptCallback("https://chatgpt.com/connector/oauth/safe_callback"),
    true,
  );
  for (const uri of [
    "javascript:alert(1)",
    "https://chatgpt.com.evil.test/connector_platform_oauth_redirect",
    "https://user:pass@chatgpt.com/connector_platform_oauth_redirect",
    "https://chatgpt.com/other",
  ])
    assert.equal(chatgptCallback(uri), false);
});
