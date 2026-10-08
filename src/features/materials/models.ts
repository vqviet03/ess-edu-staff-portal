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
  kind: "PROGRAM" | "LEVEL" | "CUSTOM" | "EXTERNAL";
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
  publicId?: string;
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
  uploadSource: "session" | "library" | "comment";
  sourceSessionId: string | null;
  sourcePostId: string | null;
  storageId?: string;
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
  attachments?: MaterialFile[];
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
  id: string;
  name?: string; category?: Area; lifecycle?: "ACTIVE" | "DRAINING" | "INACTIVE"; version?: number; configured?: boolean;
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
  storageId: string;
  folderId: string | null;
  uploadSource: "session" | "library" | "comment";
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
  storageId?: string;
  folderId: string | null;
  search: string;
  scope: "current" | "all";
  type: string;
  sort: string;
  cursor?: string;
  limit?: number;
  workspace?: string;
}

export interface StoragePageData extends CursorPage<Storage> { configurationEnabled?: boolean }
export interface UploadRoute { source: "comment" | "session" | "library"; fileType: string; storageId: string; version: number }
export interface UploadSettings { routes?: UploadRoute[]; maxUploadBytes: number; largeFileWarningBytes: number; areas: string[]; storages?: { id: string; name: string; category: Area }[] }
