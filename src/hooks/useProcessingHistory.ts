"use client";

import { useState, useEffect, useCallback } from "react";

interface HistoryEntry {
  id: string;
  toolSlug: string;
  toolName: string;
  fileName: string;
  timestamp: number;
  inputSize?: number;
  outputSize?: number;
}

const STORAGE_KEY = "zapfile-history";
const MAX_ENTRIES = 50;

export function useProcessingHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  const addEntry = useCallback((entry: Omit<HistoryEntry, "id" | "timestamp">) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setHistory((prev) => {
      const updated = [newEntry, ...prev].slice(0, MAX_ENTRIES);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return { history, addEntry, clearHistory };
}
