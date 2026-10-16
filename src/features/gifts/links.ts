export function staffGiftNoticeHref(href: string): string {
  try {
    const url = new URL(href, "https://portal.invalid");
    if (
      url.origin !== "https://portal.invalid" ||
      url.pathname !== "/home/rewards/gifts/"
    )
      return href;
    const params = new URLSearchParams();
    for (const key of ["classId", "redemptionId"]) {
      const value = url.searchParams.get(key);
      if (value) params.set(key, value);
    }
    return `/rewards/requests/?${params}`;
  } catch {
    return href;
  }
}
