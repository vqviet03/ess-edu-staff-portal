# Shared-stimulus question groups

Figma reference: hMW5mNJ72c3prP6xe93fT9 node 19:44. The existing assignment wizard, app shell, rich input, file browser, uploads, media controls, preview, recorder and grading layouts remain in use. Group stimulus uses a theme-aware pastel blue surface.

Groups are presentation containers, never a question type or a score/answer row. The five existing question types retain their grading, draft, submission, deadline and recording rules. Question count and maximum/percentage use only `questions`.

## Contract

Assignment write/read adds optional `groups`: `{ id, title, content, instructions, order, media }`. Existing question DTOs/writes add nullable `groupId`. Media uses the same materialId/displayWidth/displayHeight/keepAspectRatio contract as questions. Group `order` is the insertion offset among questions (empty draft groups are supported); members must be contiguous. Drafts may contain empty groups; publishing requires a named group with stimulus and at least one child. Limit: 50 groups and the existing 100 total questions. Group references must belong to the submitted schema.

Every save creates an immutable version as before. Input group IDs are request-local references, mapped to new IDs on the saved version. The response is authoritative. The database enforces matching question/group version with a composite FK. Old submissions and drafts retain their form version and shared stimulus. Group media is part of the same version and access/availability checks; answer keys/rubrics remain absent from student payloads.

The existing assignment upload endpoint accepts optional `groupId` for instructor stimulus uploads with an empty UUID `questionId`. Students cannot initiate this path; membership/author/class assignment is checked at BE. Upload/complete/read operations reuse current storage routes and media signature checks. Group assets are never student submission files. Shared media access checks include the published version and the student's original submission version, and do not expose draft or foreign-class files.

## UI and order

Staff can add a question or group side-by-side, name/edit shared data, use library/inline-file chips/direct upload, and add normal questions inside the selected group. Existing media sizing and aspect-ratio controls are reused. Membership changes are explicit. Group deletion requires confirmation and affects only the draft.

Desktop outline drag handles reorder whole blocks atomically; child questions can be dragged within their group. Compact numeric inputs work on mobile/desktop, with invalid positions ignored/reset. A group position moves its data and all children together. Moving or assigning questions retains local IDs until save; response remapping is applied after save. Student/preview renders stimulus once above grouped questions. Existing grading sections show the matching shared context without changing scores.

No polling, new background task, timer, upload worker, dependency or storage configuration is introduced. The loaded form contains group data; files still use existing lazy media and authorized APIs. Lists are capped by schema validation.

## Migration and deployment

Materials `015_materials.sql` is additive: group table, question group/version FK, optional group ownership for media and file-upload context. Existing assignments have no groups and remain readable. Apply this migration with the new image's existing `--migrate-materials` job and `ConnectionStrings__MaterialsMigration` owner/direct connection **before routing traffic to the new API**, then deploy API and both FE builds. Old runtime code remains compatible with the migrated schema. No core/notifications migration, new secret, provider, or automatic web-startup migration is added. Production migration/deployment is outside these PRs.

## Validation

API regressions cover version remapping, no extra answer/score rows, old drafts after republish, answer-key privacy, shared media upload/complete/read authorization, malformed/orphan/split/empty-published groups. FE tests cover immutable block/child ordering, membership, serialized contract, mobile/desktop creation, drag/numeric ordering, save/preview, stimulus shown once, dark theme and responsive bounds. Existing full checks remain required before merge.
