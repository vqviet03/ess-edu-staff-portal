# Page architecture and navigation

`src/app` owns static Next.js pages/layouts. `src/features` owns screen behavior, forms and data subscriptions; `src/shared` owns navigation and user-scoped view state. All routes use query identifiers; static export and the existing Pages deployment remain supported.

## Page routes

- `/class/thread/`, `/class/progress/`, `/class/profile/`, `/class/attendance/`
- `/session/materials/`, `/session/assessments/`
- `/student/info/`, `/student/report/`, `/student/assignments/`, `/student/rewards/`
- `/manage/profile/thread/`, `/manage/profile/progress/`, `/manage/profile/profile/`, `/manage/profile/attendance/`, `/manage/profile/rewards/`

The assessment creation dialog is URL-owned (`createAssessment=1`), so opening it from the materials page survives the transition to the assessments page. Sidebar active state includes nested pages.

Existing root URLs and `?tab=` links remain valid, including notification/deep links. Selecting a main tab navigates to its static page and retains context query parameters. On nested pages, the route determines the selected tab. Small selections such as Unit, date range, folder, wizard step and file preview are view state, rather than separate pages.

## Back behavior

`NavigationRuntime` adds the previous safe internal application URL to each browser history entry while preserving Next.js state. Replace navigation retains the entry's original predecessor. Native browser back/forward and reload preserve this metadata. Common Back actions use the browser history when an internal predecessor exists; a direct external/deep entry uses its explicit parent fallback. Auth paths, link-login codes and external URLs are excluded.

`useSectionTab` synchronizes main tab routes; `usePageTab` supports query-only view state. Both preserve other query parameters and avoid scrolling to the top on tab changes. Do not add a second local copy of URL-owned tab state.

## Rendering and API lifecycle

Only the active tab's content mounts; hidden reports do not keep API subscriptions alive. RTK Query retains and deduplicates cached requests using existing keys. Session assessments are requested only on the assessments page. There is no API polling, timer refetch, or additional auth fetch in navigation.

`RouteStateProvider` retains post composer drafts, selected files, feed cursor and selected list filters/pages in memory for page transitions. It resets on authenticated identity changes. Closing a composer retains its draft; an open unsaved form still prompts before leaving. Refreshing the browser clears these in-memory drafts; server-backed assignment drafts retain their existing behavior. Do not persist temporary signed URLs, credentials or new auth copies in view state.

## Assignment deadlines

Feed and post detail display the API-provided deadline in Vietnamese local date/time, accompanied by text and color: more than 72 hours (green), within 72 hours (amber), within 24 hours (red), past deadline (red, “Đã qua hạn”). Null dates display “Không có hạn nộp”. This is presentation only; the backend enforces submissions and due dates. It does not imply that an already-submitted learner submitted late.

## Formatting and checks

Use `npm run format` before committing; `npm run format:check` runs in CI. Prettier excludes generated output, lockfile, public binary/worker assets and environment files. Run lint, typecheck, unit tests, production build and Playwright. Browser regression tests cover exact tab restoration, browser back/forward, reload and duplicate-request counts.

## Staff assignment view and cancel

Assignments open in a student-style preview by default. The edit icon is available only to the assigned teacher with schema-edit permission. A readonly user opening an old `mode=edit` link gets the preview. The submissions list is loaded only when opened. The assignment page owns its Back icon in create/view/edit/grading states.

Cancel exits the local editor without a save request. Unsaved changes require confirmation; canceling that confirmation retains the editor. Previously saved drafts and published versions remain unchanged. Edit is a mode of the same page (URL replace), so cancel returns to preview while Back retains the originating page/tab.
