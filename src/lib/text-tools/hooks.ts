"use client";

import { useEffect, useRef, useState } from "react";
import { CancelledError, TaskRunner, WORKER_THRESHOLD } from "./worker-rpc";

/** One TaskRunner per component, disposed on unmount. `factory` must call `new Worker(new URL(...))`. */
export function useTaskRunner<Req, Res>(
  factory: () => Worker,
  inline: (req: Req) => Res | Promise<Res>,
): TaskRunner<Req, Res> {
  const ref = useRef<TaskRunner<Req, Res> | null>(null);
  if (!ref.current) ref.current = new TaskRunner(factory, inline);
  useEffect(() => {
    const runner = ref.current;
    return () => runner?.dispose();
  }, []);
  return ref.current;
}

export interface LiveTaskState<Res> {
  result: Res | null;
  /** True while a newer request is debouncing or running: `result` belongs to older input. */
  pending: boolean;
  /** Unexpected failure (worker crash etc.), not a validation error. */
  failure: string | null;
}

/**
 * Debounced live processing. `req` must be memoised (a new object = a new run); `null` clears.
 * Big inputs run in the worker; late results from superseded requests are dropped.
 */
export function useLiveTask<Req, Res>(
  runner: TaskRunner<Req, Res>,
  req: Req | null,
  size: number,
): LiveTaskState<Res> {
  const [state, setState] = useState<LiveTaskState<Res>>({ result: null, pending: false, failure: null });

  useEffect(() => {
    if (req === null) {
      runner.cancel();
      setState({ result: null, pending: false, failure: null });
      return;
    }
    let alive = true;
    setState((s) => (s.pending ? s : { ...s, pending: true }));
    const delay = size > 1_000_000 ? 450 : size > 50_000 ? 250 : 160;
    const timer = setTimeout(() => {
      runner.run(req, size > WORKER_THRESHOLD).then(
        (result) => {
          if (alive) setState({ result, pending: false, failure: null });
        },
        (e: unknown) => {
          if (!alive || e instanceof CancelledError) return;
          setState({ result: null, pending: false, failure: e instanceof Error ? e.message : String(e) });
        },
      );
    }, delay);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [runner, req, size]);

  return state;
}

const STORE_PREFIX = "zapfile:text:";
const STORE_MAX = 1_000_000; // characters; larger inputs are not persisted (localStorage is ~5 MB)

/**
 * Text state that survives a refresh (stored in this browser only).
 * Inputs above ~1 MB are not stored; clearing the text removes the stored copy.
 */
export function useStoredText(key: string): [string, (v: string) => void, { tooBigToStore: boolean }] {
  const [value, setValue] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORE_PREFIX + key);
      if (v) setValue(v);
    } catch {
      /* storage blocked */
    }
    loaded.current = true;
  }, [key]);

  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(() => {
      try {
        if (!value || value.length > STORE_MAX) localStorage.removeItem(STORE_PREFIX + key);
        else localStorage.setItem(STORE_PREFIX + key, value);
      } catch {
        /* quota or blocked: ignore */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [key, value]);

  return [value, setValue, { tooBigToStore: value.length > STORE_MAX }];
}

/** Small persisted preference (option toggles etc.). */
export function useStoredPref<T extends string | number | boolean>(
  key: string,
  initial: T,
  allowed?: readonly T[],
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_PREFIX + "pref:" + key);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as unknown;
        if (typeof parsed === typeof initial && (!allowed || allowed.includes(parsed as T))) setValue(parsed as T);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(STORE_PREFIX + "pref:" + key, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  };
  return [value, set];
}

export function useDebouncedValue<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setV(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return v;
}
