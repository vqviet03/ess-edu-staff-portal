# Scoped notifications and silent realtime refresh

The API companion change targets `main`; both FE changes target `dev`. No UI layout, ordinary fetch policy, authentication, or static export configuration changes are needed.

- Post, comment/reply and reaction preferences now match canonical API types. Legacy SOCIAL/REPLY use the COMMENT switch. Legacy GRADE remains a fallback for ASSIGNMENT_RESULT, whose explicit saved choice takes precedence. The duplicate grade switch is removed from the settings form.
- Inbox updates remain available in every tab. Toasts ignore read notices and hidden tabs. A Web Lock and a bounded localStorage receipt containing only notice IDs, keyed by account, prevent repeat alerts across visible windows and remounts. No tokens, message bodies, polling or new timers are stored/introduced. Browsers without Web Locks use best-effort storage coordination.
- New RESOURCE_CHANGED frames invalidate only the affected resource family. They never enter the inbox or toast queue. Stable event IDs suppress retries. `resourceRefreshFollows` on new notification frames avoids fetching the same resource again before its silent refresh arrives; older API frames continue using the existing path.
- Class notification settings now expose assignment, submission and assignment-result policies. New defaults exclude unrelated managers; explicitly saved policies remain effective.

Rollout: apply the API's Notifications 006 migration and deploy that API, then deploy the two FE PRs together. Keep the existing build/API/proxy configuration. No production migration/deploy is performed by these PRs.

Validation covers preference compatibility, bounded/account-scoped toast receipts, typed resource tags and two visible tabs sharing one socket while showing one alert. Existing idle/hidden-tab cleanup is retained.
