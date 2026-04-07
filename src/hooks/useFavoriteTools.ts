"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "zapfile-favorite-tools";
const MAX = 12;

export function useFavoriteTools() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          setFavorites(parsed.filter((s) => typeof s === "string").slice(0, MAX));
        }
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const toggleFavorite = useCallback(
    (slug: string) => {
      setFavorites((prev) => {
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
        return next;
      });
    },
    [],
  );

  const isFavorite = useCallback(
    (slug: string) => favorites.includes(slug),
    [favorites],
  );

  return { favorites, toggleFavorite, isFavorite, ready };
}
