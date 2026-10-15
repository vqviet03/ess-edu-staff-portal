# Frontend realtime and media lifecycle

Staff and student portals use the same policy. Normal RTK Query HTTP requests,
uploads and draft autosaves are deliberately unaffected by the idle overlay.

## Visible inactivity

After ten minutes without pointer, touch, keyboard or scroll activity, a visible,
authenticated tab displays a theme-aware blur overlay, makes its content inert,
and leaves realtime. The waking gesture is consumed to prevent accidental actions.
There is one deadline timer, no interval or network heartbeat. High-frequency
activity updates only an in-memory timestamp, not React state or storage.
Hidden tabs stop realtime immediately without an overlay; returning starts a new
ten-minute activity window. Logout/unmount removes all listeners and the timer.

## Shared connections

BroadcastChannel forwards broker frames and commands; Web Locks elects one owner
per origin, API URL, exact session token and class context. Only a SHA-256 namespace
is derived from the session: AUTH tokens are never broadcast. Different accounts,
sessions, websites or class contexts stay isolated. Distinct class contexts need
separate sockets because the current backend supports one presence room per socket.

A follower joining an existing group triggers a bounded connection refresh for a
fresh server snapshot/replay, not cached private frames. Owner departure releases
the lock; an already waiting active tab takes over without polling. All inactive
members leave the group, so no socket or election task survives the last consumer.
Unsupported browsers use dedicated sockets with the same foreground/idle policy.
Actual visible tabs can still receive separate HTTP refreshes for resources they
use: this does not share RTK Query caches between tabs. HTTP deduplication remains
within each tab. A broker failure does not create timer-based reconnect attempts.

## Media

Thumbnail metadata/blob requests begin only near the viewport, using existing
protected API endpoints and responsive thumbnail sizes. Assignment display images
prefer thumbnails when available; the staff dimension editor still reads the full
preview so restoring original dimensions remains accurate. Audio/video do not
preload media before playback (the staff dimension editor retains video metadata
loading so original-size controls still work); close/unmount pauses playback, removes sources and
releases the media element. PDF.js stops opportunistic prefetch and retains its
existing lazy page rendering and loading-task destruction.

The current authenticated content contract downloads a blob through RTK Query
before handing it to the viewer. `preload=none` and PDF options cannot turn this
into end-to-end range streaming: that requires a separate backend/proxy change.
No public storage URLs, JWT URL parameters, CDN private-file caching, or authorization
changes are introduced here. No GCP configuration or migration is required.
