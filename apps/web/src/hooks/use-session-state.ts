"use client";

import { useCallback, useState } from "react";

/**
 * A useState wrapper backed by sessionStorage.
 * Values survive page navigations within the same browser tab.
 */
export function useSessionState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const stored = sessionStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          sessionStorage.setItem(key, JSON.stringify(next));
        } catch { /* quota exceeded — degrade gracefully */ }
        return next;
      });
    },
    [key],
  );

  return [value, set];
}
