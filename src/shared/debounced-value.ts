"use client";
import { useEffect, useState } from "react";
/** One cancellable timer per actual input change; never polls or refetches. */
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
