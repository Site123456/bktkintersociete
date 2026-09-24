"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Setter returned by useLocalDraft (value or updater, like useState). */
export type SetDraft<T> = (value: T | ((prev: T) => T)) => void;

type DraftState<T> = { key: string | null; value: T; dirty: boolean };

const SAVE_DELAY_MS = 400;

/** Reads a saved draft; falls back when missing, unreadable, null or of another shape than `fallback`. */
function readDraft<T>(key: string | null, fallback: T, validate?: (v: unknown) => v is T): T {
  if (!key || typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    if (validate) return validate(parsed) ? parsed : fallback;
    if (typeof parsed !== typeof fallback || Array.isArray(parsed) !== Array.isArray(fallback)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeDraft(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode): the draft simply is not kept.
  }
}

function removeDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * State saved in localStorage (debounced, 400 ms), restored on the next visit.
 * `key` null disables saving. Changing the key loads the draft stored under the new key.
 * A change made in another tab (same key) replaces the value here, or resets it when that tab removed the draft.
 * Reads storage during the first render: render the component client-only (see useMounted) to avoid hydration mismatches.
 * Optional `validate` checks the stored value's shape; without it only the JSON type must match `initial`.
 * Returns [value, setValue, clear, reload] — clear() forgets the stored draft and goes back to `initial`;
 * reload() saves any pending change, then reads the stored draft again (with the current `initial` and `validate`).
 */
export function useLocalDraft<T>(
  key: string | null,
  initial: T,
  validate?: (v: unknown) => v is T,
): [T, SetDraft<T>, () => void, () => void] {
  const [state, setState] = useState<DraftState<T>>(() => ({ key, value: readDraft(key, initial, validate), dirty: false }));

  // Key changed (e.g. another site): load that draft now, during render (React's "adjust state on prop change").
  let current = state;
  if (state.key !== key) {
    current = { key, value: readDraft(key, initial, validate), dirty: false };
    setState(current);
  }

  const pending = useRef<{ key: string; value: T } | null>(null);
  const initialRef = useRef(initial);
  const validateRef = useRef(validate);
  useEffect(() => {
    initialRef.current = initial;
    validateRef.current = validate;
  });

  const flush = useCallback(() => {
    const p = pending.current;
    pending.current = null;
    if (p) writeDraft(p.key, p.value);
  }, []);

  // Debounced save of user changes.
  useEffect(() => {
    if (pending.current && pending.current.key !== state.key) flush();
    if (!state.key || !state.dirty) return;
    pending.current = { key: state.key, value: state.value };
    const timer = window.setTimeout(flush, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state, flush]);

  // Save right away when the tab is hidden or closed (mobile browsers may kill it) and on unmount.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
      flush();
    };
  }, [flush]);

  // Same draft changed in another tab (edited, sent or cleared): take that version, drop the pending save here.
  useEffect(() => {
    if (!key) return;
    let storage: Storage;
    try {
      storage = window.localStorage;
    } catch {
      return; // storage blocked: nothing is shared between tabs
    }
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== storage || (e.key !== null && e.key !== key)) return;
      if (pending.current?.key === key) pending.current = null;
      const value =
        e.key === null || e.newValue === null
          ? initialRef.current
          : readDraft(key, initialRef.current, validateRef.current);
      setState({ key, value, dirty: false });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  const set = useCallback<SetDraft<T>>((v) => {
    setState((s) => ({
      key: s.key,
      value: typeof v === "function" ? (v as (prev: T) => T)(s.value) : v,
      dirty: true,
    }));
  }, []);

  const clear = useCallback(() => {
    pending.current = null;
    if (key) removeDraft(key);
    setState({ key, value: initialRef.current, dirty: false });
  }, [key]);

  const reload = useCallback(() => {
    flush();
    setState({ key, value: readDraft(key, initialRef.current, validateRef.current), dirty: false });
  }, [key, flush]);

  return [current.value, set, clear, reload];
}

const subscribeNothing = () => () => {};

/** true on the client after hydration, false on the server and during hydration. No effect, no extra state. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}
