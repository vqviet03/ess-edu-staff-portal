// Next router targets are app-relative; browser URLs may include a Pages basePath.
export function safeReturnTo(
  value: string | null,
  basePath = "",
): string | null {
  if (
    !value ||
    value.length > 4096 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return null;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f]/.test(decoded))
      return null;
    const url = new URL(value, "https://portal.invalid");
    if (url.origin !== "https://portal.invalid") return null;
    const base = basePath.replace(/\/$/, "");
    let path = url.pathname;
    if (base && (path === base || path.startsWith(base + "/")))
      path = path.slice(base.length) || "/";
    if (
      decodeURIComponent(path).startsWith("//") ||
      /^\/(?:login|auth|activate)(?:\/|$)/.test(decodeURIComponent(path)) ||
      path === "/"
    )
      return null;
    return path + url.search + url.hash;
  } catch {
    return null;
  }
}
export function loginDestination(search: string, basePath = ""): string {
  return (
    safeReturnTo(new URLSearchParams(search).get("next"), basePath) ?? "/home/"
  );
}
export function loginRedirect(target: string, basePath = ""): string {
  const next = safeReturnTo(target, basePath);
  return next ? `/login/?${new URLSearchParams({ next })}` : "/login/";
}
