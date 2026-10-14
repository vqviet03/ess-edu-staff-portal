"use client";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useAppSelector } from "@/store";
const RouteState = createContext<{
  identity: unknown;
  values: Map<string, unknown>;
} | null>(null);
/** In-memory drafts survive page transitions, scoped to the authenticated user. No storage writes or requests. */
export function RouteStateProvider({ children }: { children: ReactNode }) {
  const identity = useAppSelector((s) => s.auth.session?.teacher.id);
  const cache = useMemo(
    () => ({ identity, values: new Map<string, unknown>() }),
    [identity],
  );
  return <RouteState.Provider value={cache}>{children}</RouteState.Provider>;
}
export function useRouteState<T>(key: string, initial: T | (() => T)) {
  const cache = useContext(RouteState)?.values;
  const [value, setValue] = useState<T>(() =>
    cache?.has(key)
      ? (cache.get(key) as T)
      : typeof initial === "function"
        ? (initial as () => T)()
        : initial,
  );
  const update = (next: SetStateAction<T>) =>
    setValue((old) => {
      const result =
        typeof next === "function" ? (next as (previous: T) => T)(old) : next;
      cache?.set(key, result);
      return result;
    });
  return [value, update] as const;
}
