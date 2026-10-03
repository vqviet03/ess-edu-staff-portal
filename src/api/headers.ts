import type { FetchArgs } from "@reduxjs/toolkit/query";
export function requestHeaders(input: FetchArgs["headers"]) {
  const result = new Headers();
  if (input instanceof Headers) input.forEach((v, k) => result.set(k, v));
  else if (Array.isArray(input))
    input.forEach(([k, v]) => {
      if (k && v !== undefined) result.set(k, v);
    });
  else if (input)
    Object.entries(input).forEach(([k, v]) => {
      if (v !== undefined) result.set(k, v);
    });
  return result;
}
