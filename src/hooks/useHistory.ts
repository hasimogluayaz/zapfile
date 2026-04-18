"use client";

import { useReducer, useCallback } from "react";

type State<T> = { past: T[]; present: T; future: T[] };

type Action<T> =
  | { type: "set"; next: T }
  | { type: "replace"; next: T }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; value: T };

function historyReducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case "set":
      return {
        past: [...state.past, state.present],
        present: action.next,
        future: [],
      };
    case "replace":
      return { ...state, present: action.next };
    case "undo": {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1]!;
      return {
        past: state.past.slice(0, -1),
        present: prev,
        future: [state.present, ...state.future],
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0]!;
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
    case "reset":
      return { past: [], present: action.value, future: [] };
    default:
      return state;
  }
}

/** Linear undo/redo for a single value (e.g. crop rect, text items snapshot). */
export function useHistory<T>(initial: T) {
  const [state, dispatch] = useReducer(
    historyReducer<T>,
    { past: [], present: initial, future: [] } as State<T>,
  );

  const set = useCallback((next: T) => {
    dispatch({ type: "set", next });
  }, []);

  const replacePresent = useCallback((next: T) => {
    dispatch({ type: "replace", next });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: "undo" });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: "redo" });
  }, []);

  const reset = useCallback((value: T) => {
    dispatch({ type: "reset", value });
  }, []);

  return {
    present: state.present,
    set,
    replacePresent,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
