"use client";

import { useState, useEffect, useCallback } from "react";
import { tools } from "@/lib/tools";

const STORAGE_KEY = "zapfile-recent-tools";
const MAX_RECENT = 8;

const VALID_SLUGS = new Set(tools.map((x) => x.slug));

export function useRecentTools() {
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          const cleaned = parsed
            .filter((s): s is string => typeof s === "string" && VALID_SLUGS.has(s))
            .slice(0, MAX_RECENT);
          setRecentSlugs(cleaned);
        }
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const trackTool = useCallback((slug: string) => {
    if (!VALID_SLUGS.has(slug)) return;
    setRecentSlugs((prev) => {
      const updated = [slug, ...prev.filter((s) => s !== slug)].slice(
        0,
        MAX_RECENT,
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  }, []);

  return { recentSlugs, trackTool, ready };
}
