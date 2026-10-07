import { createAction } from "@reduxjs/toolkit";
import type { CursorPage, Notification } from "./models";

export interface NotificationFilter { type?: string; isRead?: boolean; cursor?: string }
export const libraryNoticeReceived = createAction<{ cursor?: string; notice: Notification }>("operations/libraryNoticeReceived");
export const librarySnapshotReceived = createAction<CursorPage<Notification>>("operations/librarySnapshotReceived");
export function notificationFilter(filter: NotificationFilter): NotificationFilter {
  return {
    ...(filter.type ? { type: filter.type } : {}),
    ...(filter.isRead !== undefined ? { isRead: filter.isRead } : {}),
    ...(filter.cursor ? { cursor: filter.cursor } : {}),
  };
}
export function mergeNotice(page: CursorPage<Notification>, filter: NotificationFilter, notice: Notification) {
  const index = page.items.findIndex((item) => item.id === notice.id);
  const old = page.items[index];
  if (old && old.version >= notice.version) return;
  if (page.unreadCount !== undefined) page.unreadCount += old ? Number(!notice.isRead) - Number(!old.isRead) : Number(!notice.isRead);
  const matches = (!filter.type || filter.type === notice.type) && (filter.isRead === undefined || filter.isRead === notice.isRead);
  if (index >= 0) {
    if (matches) page.items[index] = notice;
    else page.items.splice(index, 1);
  } else if (!filter.cursor && matches) {
    page.items.unshift(notice);
    if (page.items.length > 30) { page.items.pop(); page.nextCursor ??= "30"; }
  }
}
