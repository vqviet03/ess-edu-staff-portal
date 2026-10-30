# EES read-only MCP for ChatGPT web

This optional integration runs inside the existing .NET API. It adds no paid SDK, AI API key, service, always-on instance, polling, SSE connection, cron, worker or new storage provider. Cloud Run/Neon still bill normal requests under their existing quotas; zero infrastructure cost cannot be guaranteed. ChatGPT plan/rollout controls whether a user can add a custom MCP server. OpenAI currently documents Pro read/fetch and custom MCP on web, not the mobile app: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt.

## Delivered scope

Eleven tools: identity, classes, students, study schedule, class attendance, student attendance, reward ledger/actual points and individual transaction history, student Units, Unit skill/test report and assignment reports. They call existing services with current school/class permissions. A dual-role account explicitly chooses teacher/manager workspace; teacher workspace cannot inherit manager access. Grant roles can only shrink when roles are removed, never silently expand after consent.

Every tool has readOnlyHint=true and destructiveHint=false because it is actually read-only. No arbitrary URL, SQL, REST method, upload, grading or mutation gateway exists. Read calls do not save attendance, rewards or reports. Arguments are bounded; pages max 50, date windows max 366 days (default last 90), result payload max 200KiB, tool execution max 30 seconds. Oversized results ask the client to narrow filters; they are not silently truncated. Do not configure scheduled refreshes on the ChatGPT side.

## Deployment order (review first; not executed by these PRs)

1. Deploy the new backend with MCP disabled (default). Existing app behavior remains available.
2. Run the existing migration job with the new image, using owner/direct connections already configured. Apply Core 027 and Security 002:

```text
--migrate
```

```text
--migrate-partitions
```

These are separate executions/arguments, as the existing CLI exits after each selected mode. Single mode needs Core 027. Production split uses the Security table at runtime; the Core schema supports existing backfill/verification tooling. Security grant/session writes are not duplicated into Core. No Materials, Rewards, Logs or Notifications schema change is introduced. No live Neon configuration was changed; live configuration must continue using the production branch.

3. Deploy staff FE (still static-export compatible), including `/mcp/authorize/` and the personal-profile connection/revoke panel.
4. Enable MCP in Cloud Run. Retain the **existing correct HTTPS root** `Api__PublicBaseUrl`. The repository's current default API/staff domains give the following values; verify they still match your deployed service rather than changing a working URL blindly:

```text
Mcp__Enabled=true
Mcp__ConsentUrl=https://staff.eeslern.com/mcp/authorize/
Api__PublicBaseUrl=https://ess-edu-api-920149468670.asia-southeast1.run.app
```

No secret needs to be created/changed. Existing JWT signing configuration is reused with a separate MCP audience. All instances use database grants, not in-memory OAuth sessions, so no session affinity/min-instance setting is needed.

## Add the connection in ChatGPT web

Use the custom MCP/app connection UI available to the account. UI labels vary with the current Plugins/Apps rollout. Add:

```text
Name: EES · Tra cứu và báo cáo
MCP URL: https://ess-edu-api-920149468670.asia-southeast1.run.app/mcp
Authentication: OAuth
Scopes: ees.read offline_access
```

Prefer dynamic client registration. This server registers a public PKCE client with the exact callback allowlist. If the UI instead requires a predefined public client:

```text
Client ID: ees-chatgpt
Client authentication: none
Authorization URL: https://ess-edu-api-920149468670.asia-southeast1.run.app/mcp/oauth/authorize
Token URL: https://ess-edu-api-920149468670.asia-southeast1.run.app/mcp/oauth/token
```

Do not paste an EES password/token into a conversation, and do not enter a made-up client secret. Discovery endpoints are `/.well-known/oauth-protected-resource/mcp` and `/.well-known/oauth-authorization-server`. Metadata advertises issuer identification; the default callback is:

```text
https://chatgpt.com/connector_platform_oauth_redirect
```

If ChatGPT explicitly displays a callback-ID-specific URL, copy that exact callback into the allowlist (do not wildcard it):

```text
Mcp__RedirectUris__0=https://chatgpt.com/connector_platform_oauth_redirect
Mcp__RedirectUris__1=https://chatgpt.com/connector/oauth/REPLACE_WITH_THE_ACTUAL_CALLBACK_ID
```

The browser opens existing staff login, returns to the preserved consent URL, and the user chooses currently allowed roles. Approve read access or cancel. Finish OAuth to return to ChatGPT. Test with “Cho tôi danh sách lớp tôi được phép xem”, then “Báo cáo điểm danh lớp … trong tháng …”. The integration is not connected to any personal ChatGPT account merely by merging these PRs; the account owner must complete this browser flow after deployment.

## Security and lifetime

Authorization code + S256 PKCE; code valid 5 minutes and consumed atomically once. Codes/refresh tokens are stored hashed, never plaintext. Rotating refresh tokens are one-use; concurrent reuse has one winner. Access JWTs last up to 15 minutes and are audience-bound to the exact MCP resource, so they cannot authenticate to normal EES read/write APIs. Interactive EES tokens cannot authenticate to MCP. Normal account/session expiry policies apply to the dedicated ChatGPT session; refresh does not extend that deadline. No permanent token is minted.

Each request checks the grant, dedicated session, active account/profile and current roles. Removing a role, changing password/revoking sessions, locking an account or revoking a connection takes effect on subsequent calls. Only the owner can list/revoke their connections in Hồ sơ cá nhân → Kết nối ChatGPT. Revoking does not log out the normal browser session. Disconnecting in ChatGPT alone need not revoke the EES grant; use the EES panel to revoke immediately. Pending authorizations expire after 5 minutes and do not occupy the active-connection limit thereafter.

## Transport, validation and compatibility

Stateless Streamable HTTP POST returns JSON-RPC JSON responses. GET returns 405; no SSE/heartbeat/session is started. initialize, ping, tools/list, tools/call and initialized/cancelled notifications are supported. Version negotiation supports 2026-07-28,2025-11-25,2025-06-18,2025-03-26. No batches/resources/prompts/tasks are advertised. Unknown tools, mutation names and malformed arguments are rejected. JSON parse errors are JSON-RPC errors. Origin validation, request/response bounds, per-session rate limiting and request cancellation are enforced.

Tests cover discovery, redirect/scope checks, S256, cancellation consent, code replay, refresh races, normal-token/MCP audience separation, role removal, expiry, cross-school/class restrictions, no business writes, owner revocation, and actual split storage. Staff tests cover preserving OAuth parameters through login, responsive consent, callback validation and confirmed revocation. Real personal ChatGPT onboarding requires deployment/account access and is not claimed as tested in local/CI fixtures.
