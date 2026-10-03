import type { Context } from "@/types";
export function route(
  path: string,
  values: Partial<Context> & { studentId?: string } = {},
) {
  const query = new URLSearchParams(
    Object.entries(values).filter(([, v]) => Boolean(v)),
  );
  return `${path.replace(/\/$/, "")}/${query.size ? "?" + query : ""}`;
}
