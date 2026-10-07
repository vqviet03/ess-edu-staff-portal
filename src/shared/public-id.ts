// Keep opaque routing keys internal; only human-facing identifiers are rendered.
const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
export function publicId(...values: (string | null | undefined)[]): string {
  return values.find(v => v?.trim() && !uuid.test(v)) ?? "—";
}
export function auditDetails(value: string): string {
  try {
    const clean = (v: unknown): unknown => {
      if (typeof v === "string") return uuid.test(v) ? undefined : v;
      if (Array.isArray(v)) return v.map(clean).filter(x => x !== undefined);
      if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([k]) => !/secret|token|password|objectkey|thumbnailkey|connection|endpoint/i.test(k)).map(([k, x]) => [k, clean(x)]).filter(([, x]) => x !== undefined));
      return v;
    };
    return JSON.stringify(clean(JSON.parse(value)), null, 2);
  } catch { return "Chi tiết không khả dụng."; }
}
