# ESS material library and session feed

All routes below use `/v1`, existing JWT/session authentication, `{data:T}` envelopes, ISO 8601 dates, UUID IDs and byte sizes. No new mock adapter or production seed is provided. Staff Portal uses `NEXT_PUBLIC_USE_MOCK=false` and the existing API base URL. Tests alone intercept HTTP.

## Persistence and production rollout

Metadata, folders, posts, attachments, comments, reactions, upload reservations and deletion requests live in **ess-materials / ess_materials / production**; public identifiers are in `infra/neon/materials-resource.json`. Core continues to own schools, profiles, accounts projections, class assignments and enrollments. Security, logs and notifications keep their separate production DBs. There are no cross-project SQL foreign keys; current permissions are checked from Core on every request. UUIDs are stable across renames/moves.

Material audit and notification outboxes are written in the metadata transaction. The worker copies audit records to Logs and per-recipient notifications to Notifications, idempotently by audit/event ID. A delivery failure retains the outbox for retry. Notifications are filtered again against current class rights when read. Metadata mutations use a database advisory transaction lock and version concurrency checks; failed writes roll back together. Existing async assessment/management operations remain unchanged.

New SQL is additive. `001_materials.sql`, `002_materials.sql` and `002_notifications.sql` have been applied to the new production metadata DB / existing production Notifications DB; no school data was removed or seeded. Migration commands never execute on web startup.

1. Review/merge backend PR and deploy its image before deploying Staff Portal. The backend feature incorporates the already released main baseline because backend dev was behind main.
2. Add a **new version** to the current production Secret Manager JSON using private `secrets/neon-production-materials-runtime.json`. Regenerate this merged file with `node scripts/neon-materials-config.mjs` after regenerating older production configuration. Preserve deployed JWT/CORS/URLs. It adds `ConnectionStrings:Materials` and `Persistence:Targets:Materials`; existing four DB and six bucket credentials are unchanged.
3. Keep `/var/secrets/neon/partitions.json`, `Persistence__ConfigurationFile`, split/production flags. Remove stale `ConnectionStrings__Materials` overrides. Grant the Cloud Run service account access to the secret as already configured.
4. Deploy the new revision with 100% traffic. `/health/ready` must include `deployment:"production"`, `materialsEnabled:true`. Old configuration keeps older APIs working, while library endpoints return `503 MATERIALS_NOT_CONFIGURED` until configured; no fallback to Core/mock.
5. Verify both staff workspaces and a newly enrolled student. Production metadata begins empty; upload genuine files and publish posts through the UI.

Local/migration configuration: `ConnectionStrings__Materials` runtime pooled, `ConnectionStrings__MaterialsMigration` owner/direct; `--migrate-materials` provisions runtime grants and applies metadata migrations. `--migrate-partitions` applies notification migrations with direct owner connections. Owner credentials must never mount into the API.

Files use existing six **production** Neon projects/buckets: DOCUMENTS (text/PDF/Office), AUDIO, CURRICULUM, TESTS, IMAGES and OTHER. The destination is explicit; audio/images are constrained to corresponding storage. No public bucket or JWT in file URLs. Browser uploads use signed PUT URLs with Content-Type, then server HEAD verifies MIME/size (including thumbnail) before AVAILABLE. URLs last 10 minutes for PUT, 5 minutes for access/thumbnail. Thumbnail generation is client-side at upload, max 256px; PDF page 1 via lazy pdf.js. List rendering never downloads originals. Upload metadata requests are authenticated; object requests use only their signed URL.

Configure `Storage:Areas:<AREA>:CapacityBytes` per private bucket, `Storage:MaxUploadBytes` (default 100 MiB), `Storage:LargeFileWarningBytes` (default 20 MiB). Capacity is the application quota (default 4.5 GB / 4,500,000,000 bytes per area), **not a promise of provider free-plan limits**. Used bytes include existing Core material uploads as well as soft-deactivated library files; pending/cancelled objects conservatively retain reservations. Physical storage is not deleted by frontend, and cancelled uploads require an operator reconciliation before releasing their reservation. Monitor actual Neon usage as well as these application counters. Neon bucket OPTIONS has been checked for PUT/Content-Type from the Pages origin; API CORS permits DELETE, X-Workspace, If-Match. Use Pages **origin** `https://vqviet03.github.io`, not its repository path.

## Authorization

Student: only published posts/files attached in their ACTIVE enrollments; no warehouse listing, upload, rename or internal fields. Staff: shared library read and author names. Session-sourced files additionally require class access for teachers. Teacher: own-upload rename/request-deletion; edit posts only if current TEACHER role, active profile/account, ACTIVE assignment, editable ACTIVE class. Manager: folder/program/level CRUD, move, metadata/audit/storage read, deletion approval; manager-only cannot edit learning content. `X-Workspace:manager` prevents session edits even for dual-role accounts. Workspace never grants a role. `workspace=teacher`/header returns reduced file DTO even for dual-role users.

Profile/folder/post/comment/notification DELETEs are **soft**. File DELETE/approved requests purge physical objects server-side; see [updated lifecycle](management-refinements.md). Folder deactivation requires empty dependencies. Approval requires reason and `KEEP_UNAVAILABLE` (retain attachment as unavailable) or `DETACH` (remove attachment, retain audit). File quota is released only after both original and thumbnail are successfully purged; DELETING remains counted. Teacher/student DTO omits storageId/storageObjectKey and never exposes audit logs.

## Endpoints

| Method | Path | Request / response |
|---|---|---|
| GET | /material-folders?parentId=&search=&scope=current\|all | `{items:Folder[],nextCursor:null}` (bounded 500 nodes per request) |
| GET | /material-folders/id/path | `{items:Folder[],nextCursor:null}` root-to-folder breadcrumb, scoped to school |
| POST/PATCH | /material-folders[/id] | `{name,parentId,kind:PROGRAM\|LEVEL\|CUSTOM,version}` → Folder |
| DELETE | /material-folders/id | `{version,reason}` |
| GET | /materials?folderId=&search=&scope=&type=&sort=&cursor=&limit= | CursorPage<File>; type pdf/image/audio/video/other; sort name/name-desc/newest/size |
| GET/PATCH | /materials/id | File / `{displayName,version}` |
| POST | /materials/bulk-move | `{ids,folderId,versions:{[id]:version}}`, atomic max 100 |
| GET | /materials/id/access-url?purpose=preview\|download | `{url,expiresAt}`; no persistent signed URL |
| GET | /materials/id/audit-logs?page=&pageSize= | manager, paged audit + total + actor public/login ID and name |
| GET/DELETE | /materials/id/deletion-impact / /materials/id | manager, usages / `{version,reason,linkAction}` physical purge queue |
| POST | /materials/id/deletion-requests | `{reason,version}` |
| GET | /material-deletion-requests | requests (own for teacher) + file + active post/session usages |
| POST | /material-deletion-requests/id/decision | `{decision:APPROVED\|REJECTED,reason,linkAction,version}` |
| GET | /material-upload-settings | maxUploadBytes, largeFileWarningBytes, areas; all Staff |
| POST | /material-uploads/initiate | UploadInput → UploadTicket |
| POST/DELETE | /material-uploads/id/complete / /material-uploads/id | `{version}`; completion is idempotent, cancellation retains reservation |
| GET | /storages / /storage-alerts | manager, total/used/reserved/remaining bytes, percentage, threshold status |
| GET/POST | /sessions/id/posts | CursorPage<Post> / PostInput |
| GET/PATCH/DELETE | /posts/id | Post / PostInput / `{version,reason}` |
| PUT/DELETE | /posts/id/reaction | `{reaction:LIKE\|LOVE\|CELEBRATE}` / remove; one per user |
| GET/POST | /posts/id/comments | CursorPage<Comment> / `{body,parentId?,version?}` |
| PATCH/DELETE | /comments/id | `{body,version}` / `{version,reason}` |
| GET | /notifications?type=&isRead=&cursor=&limit= | CursorPage<Notification> + unreadCount |
| PATCH/DELETE | /notifications/id | `{isRead,version}` / `{version}` |
| POST | /notifications/read-all | marks currently accessible notifications read |

CursorPage = `{items:T[],nextCursor:string|null,total?,unreadCount?}`. Pagination is bounded (files 40, tree files 30, feed 10, comments 20); changing cursor swaps the page instead of mounting unbounded DOM. Tree loads each branch only upon expansion. Name search is debounced and currentData prevents stale-filter rendering. Bulk file selection survives navigation via stable ID; picker excludes folders.

UploadInput example:
```json
{"originalName":"Unit 1.pdf","mimeType":"application/pdf","sizeBytes":400000,"storageId":"CURRICULUM","folderId":null,"uploadSource":"session","sourceSessionId":"00000000-0000-0000-0000-000000000001","thumbnailMime":"image/webp","thumbnailBytes":9000}
```
Optional sourcePostId must belong to sourceSessionId. UploadTicket = `{uploadId,uploadUrl,thumbnailUploadUrl,method:"PUT",headers,expiresAt,version}`. UploadSource library or session. Original name, author/upload provenance, object key are immutable; first direct-upload attachment records its sourcePostId. File DTO has id/originalName/displayName/mimeType/sizeBytes/thumbnailUrl/folderId/authorId/authorName/uploadedBy/uploadSource/sourceSessionId/sourcePostId/status/createdAt/updatedAt/version and manager-only storage fields.

PostInput = `{title,body,status:DRAFT|PUBLISHED,version,attachments:[{materialId,group:LESSON|GUIDE|AUDIO}]}`. Plain multiline text, no HTML execution. Post includes author/publisher names, reaction counts/current reaction, commentCount and attachments with availability. Deleted ancestors/comments don't expose deleted content.

Errors retain the existing `{error:{code,message,fieldErrors?}}` envelope. 400 invalid pagination/filter, 401 expired/revoked session, 403 denied, 404 unavailable entity, 409 version/dependency conflict, 410 expired upload, 422 invalid MIME/size/schema/quota, 429 existing auth throttling, 503 missing DB/storage/unavailable persistence. Never automatically retry mutations. Concurrent edits keep the client draft and show an error. Signed object responses never contain access JWT.

Existing student endpoints `/me/classes/:classId/materials` and `/me/classes/:classId/materials/:materialId/access` also include/access AVAILABLE attachments of PUBLISHED posts in that exact class. Legacy Core materials remain compatible. Library files return the existing type contract (PDF/audio/video/link); image/other files open as signed links. The student frontend is unchanged; student feed/comment screens are outside this Staff Portal extension.

Chi tiết thay đổi mới: [ID, audit, branding, quota và xóa tài liệu](management-refinements.md).
