export function postShareUrl(
  post: {id: string; classId: string}, portalUrl: string,
): string {
  const url = new URL(portalUrl);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.username || url.password || url.search || url.hash) throw new Error("Địa chỉ portal không hợp lệ.");
  url.pathname = url.pathname.replace(/\/$/, "") + "/post/";
  url.search = new URLSearchParams({postId:post.id,classId:post.classId}).toString();
  return url.href;
}
export function currentPortalUrl(): string {
  return location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? "");
}
