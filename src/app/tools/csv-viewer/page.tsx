"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";
import { parseCsvSimple } from "@/lib/parse-csv-simple";

export default function CsvViewerPage() {
  const { t } = useI18n();
  const [raw, setRaw] = useState("");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const parsed = useMemo(() => {
    if (!raw.trim()) return { rows: [] as string[][] };
    return { rows: parseCsvSimple(raw) };
  }, [raw]);

  const filtered = useMemo(() => {
    const rows = parsed.rows;
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(q)),
    );
  }, [parsed.rows, search]);

  const displayRows = useMemo(() => {
    if (sortCol === null || filtered.length === 0) return filtered;
    const head = filtered[0];
    const rest = filtered.slice(1);
    const idx = sortCol;
    const sorted = [...rest].sort((a, b) => {
      const va = a[idx] ?? "";
      const vb = b[idx] ?? "";
      const cmp = va.localeCompare(vb, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return [head, ...sorted];
  }, [filtered, sortCol, sortDir]);

  const toggleSort = (col: number) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const copyCell = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("csvview.copyCell"));
    } catch {
      toast.error("Copy failed");
    }
  };

  const headers = displayRows[0] ?? [];
  const body = displayRows.slice(1);

  return (
    <ToolLayout
      toolName="CSV Table Viewer"
      toolDescription="Paste CSV and browse it as a sortable table"
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-t-secondary mb-2" htmlFor="csv-in">
            {t("csvview.paste")}
          </label>
          <textarea
            id="csv-in"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={8}
            spellCheck={false}
            className="w-full font-mono text-xs px-3 py-2 rounded-lg bg-bg-secondary border border-border text-t-primary"
            placeholder="name,email&#10;Ada,ada@example.com"
          />
        </div>

        {parsed.rows.length > 0 && (
          <>
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <label className="text-sm text-t-secondary sr-only" htmlFor="csv-search">
                {t("csvview.search")}
              </label>
              <input
                id="csv-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("csvview.search")}
                className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-bg-secondary border border-border text-sm"
              />
              <span className="text-xs text-t-tertiary">
                {t("csvview.rows", { count: body.length })}
              </span>
            </div>

            <div className="rounded-xl border border-border overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-bg-secondary z-10">
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="text-left p-2 border-b border-border font-semibold text-t-primary">
                        <button
                          type="button"
                          onClick={() => toggleSort(i)}
                          className="hover:text-accent underline-offset-2 hover:underline text-left w-full"
                        >
                          {h || `—`}
                          {sortCol === i ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, ri) => (
                    <tr key={ri} className="hover:bg-bg-secondary/80">
                      {headers.map((_, ci) => (
                        <td key={ci} className="p-2 border-b border-border/60 text-t-secondary max-w-[240px] truncate">
                          <button
                            type="button"
                            onClick={() => copyCell(row[ci] ?? "")}
                            className="text-left w-full truncate hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded"
                            title={row[ci] ?? ""}
                          >
                            {row[ci] ?? ""}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!raw.trim() && (
          <p className="text-sm text-t-tertiary">{t("csvview.empty")}</p>
        )}
      </div>
    </ToolLayout>
  );
}
