export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
  page?: number; pageSize?: number;
  unreadCount?: number;
}
export interface Folder {
  id: string;
  parentId: string | null;
  name: string;
  kind: "PROGRAM" | "LEVEL" | "CUSTOM";
  version: number;
}
export type Area =
  | "DOCUMENTS"
  | "AUDIO"
  | "CURRICULUM"
  | "TESTS"
  | "IMAGES"
  | "OTHER";
export interface MaterialFile {
  id: string;
  originalName: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  thumbnailBytes?: number;
  storageBytes?: number;
  thumbnailUrl: string | null;
  folderId: string | null;
  authorId: string;
  authorName: string;
  uploadedBy: string;
  uploadSource: "session" | "library";
  sourceSessionId: string | null;
  sourcePostId: string | null;
  storageId?: Area;
  storageObjectKey?: string;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface Attachment {
  materialId: string;
  group: "LESSON" | "GUIDE" | "AUDIO";
  available: boolean;
  file: MaterialFile | null;
}
export type Reaction = "LIKE" | "LOVE" | "CELEBRATE";
export interface Post {
  id: string;
  sessionId: string;
  classId: string;
  title: string;
  body: string;
  status: "DRAFT" | "PUBLISHED";
  authorId: string;
  authorName: string;
  publishedBy: string;
  publisherName: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  attachments: Attachment[];
  reactions: { reaction: Reaction; count: number }[];
  myReaction: Reaction | null;
  commentCount: number;
}
export interface PostInput {
  title: string;
  body: string;
  status: Post["status"];
  attachments: Pick<Attachment, "materialId" | "group">[];
  version: number;
}
export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  version: number;
}
export interface Storage {
  id: Area;
  totalBytes: number;
  usedBytes: number;
  reservedBytes: number;
  remainingBytes: number;
  percentage: number;
  status: string;
  maxUploadBytes: number;
  largeFileWarningBytes: number;
}
export interface DeletionItem {
  purge?: { status: string; attempts: number; lastError: string | null; nextAttemptAt: string } | null;
  request: {
    id: string;
    materialId: string;
    reason: string;
    status: string;
    version: number;
  };
  file: MaterialFile;
  usages: { id: string; title: string; sessionId: string; classId: string }[];
}
export interface Notification {
  id: string;
  type: string;
  title: string;
  href: string;
  isRead: boolean;
  version: number;
  createdAt: string;
}
export interface UploadInput {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageId: Area;
  folderId: string | null;
  uploadSource: "session" | "library";
  sourceSessionId?: string;
  sourcePostId?: string;
  thumbnailMime?: string;
  thumbnailBytes?: number;
}
export interface UploadTicket {
  uploadId: string;
  uploadUrl: string;
  thumbnailUploadUrl: string | null;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
  version: number;
}
export interface BrowserQuery {
  folderId: string | null;
  search: string;
  scope: "current" | "all";
  type: string;
  sort: string;
  cursor?: string;
  limit?: number;
  workspace?: string;
}
