"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "zapfile-favorite-tools";
const CHANGE_EVENT = "zapfile-favorites-change";
const MAX = 12;

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((s): s is string => typeof s === "string")
          .slice(0, MAX);
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function useFavoriteTools() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFavorites(readFavorites());
    setReady(true);

    // Keep every mounted instance (header, cards, tool page) and other tabs in sync.
    const sync = () => setFavorites(readFavorites());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const toggleFavorite = useCallback((slug: string) => {
    const prev = readFavorites();
    const has = prev.includes(slug);
    const next = has
      ? prev.filter((s) => s !== slug)
      : prev.length >= MAX
        ? [...prev.slice(1), slug]
        : [...prev, slug];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setFavorites(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const isFavorite = useCallback(
    (slug: string) => favorites.includes(slug),
    [favorites],
  );

  return { favorites, toggleFavorite, isFavorite, ready };
}
