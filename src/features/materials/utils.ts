import type { Area, MaterialFile, Reaction } from "./models";
export const areaLabels: Record<Area, string> = {
  DOCUMENTS: "Văn bản",
  AUDIO: "Audio",
  CURRICULUM: "Giáo trình",
  TESTS: "Bài test",
  IMAGES: "Ảnh",
  OTHER: "Khác",
};
export function fileKind(mime: string) {
  return mime === "application/pdf"
    ? "PDF"
    : mime.startsWith("audio/")
      ? "Audio"
      : mime.startsWith("image/")
        ? "Ảnh"
        : mime.startsWith("video/")
          ? "Video"
          : "File";
}
export function bytes(value: number) {
  if (value < 1024) return `${value} B`;
  const unit = value < 1024 ** 2 ? "KB" : value < 1024 ** 3 ? "MB" : "GB";
  const divisor = unit === "KB" ? 1024 : unit === "MB" ? 1024 ** 2 : 1024 ** 3;
  return `${(value / divisor).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} ${unit}`;
}
export function defaultArea(mime: string): Area {
  return mime.startsWith("audio/")
    ? "AUDIO"
    : mime.startsWith("image/")
      ? "IMAGES"
      : mime === "application/pdf" || mime.startsWith("text/")
        ? "DOCUMENTS"
        : "OTHER";
}
export function toggleSelection(
  selected: Record<string, MaterialFile>,
  file: MaterialFile,
) {
  const next = { ...selected };
  if (next[file.id]) delete next[file.id];
  else next[file.id] = file;
  return next;
}
export function reactionUpdate<
  T extends {
    reactions: { reaction: Reaction; count: number }[];
    myReaction: Reaction | null;
  },
>(post: T, next: Reaction | null) {
  if (post.myReaction) {
    const old = post.reactions.find((r) => r.reaction === post.myReaction);
    if (old) old.count = Math.max(0, old.count - 1);
  }
  if (next) {
    const row = post.reactions.find((r) => r.reaction === next);
    if (row) row.count++;
    else post.reactions.push({ reaction: next, count: 1 });
  }
  post.myReaction = next;
}
export function validateUpload(file: File, max: number) {
  if (file.size === 0) return "File rỗng.";
  if (file.size > max) return `File vượt ${bytes(max)}.`;
  const allowed = new Set([
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "audio/mpeg",
    "audio/mp4",
    "audio/wav",
    "audio/ogg",
    "video/mp4",
    "video/webm",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
    "application/zip",
    "application/octet-stream",
  ]);
  if (!allowed.has(file.type || "application/octet-stream"))
    return "Định dạng file chưa được hỗ trợ.";
  if (file.name.length > 200 || /[\\/\x00-\x1f]/.test(file.name))
    return "Tên file không hợp lệ.";
  return null;
}
