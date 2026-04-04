"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "zapfile-recent-tools";
const MAX_RECENT = 8;

export function useRecentTools() {
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setRecentSlugs(JSON.parse(stored));
    } catch {}
  }, []);

  const trackTool = useCallback((slug: string) => {
    setRecentSlugs((prev) => {
      const updated = [slug, ...prev.filter((s) => s !== slug)].slice(0, MAX_RECENT);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  return { recentSlugs, trackTool };
}
