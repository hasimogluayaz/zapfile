"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** Sortable, searchable table preview of parsed CSV rows (first row = header). */
export default function CsvTable({ rows }: { rows: string[][] }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const headers = rows[0] ?? [];

  const body = useMemo(() => {
    let out = rows.slice(1);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((row) => row.some((cell) => cell.toLowerCase().includes(q)));
    }
    if (sortCol !== null) {
      out = [...out].sort((a, b) => {
        const cmp = (a[sortCol] ?? "").localeCompare(b[sortCol] ?? "", undefined, {
          numeric: true,
        });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, search, sortCol, sortDir]);

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
      toast.error(t("ui.copyFailed"));
    }
  };

  if (headers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("csvview.search")}
          aria-label={t("csvview.search")}
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-t-primary"
        />
        <span className="text-xs text-t-tertiary">
          {t("csvview.rows", { count: body.length })}
        </span>
      </div>

      <div className="max-h-[480px] overflow-auto rounded-xl border border-border">
        <table className="min-w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-bg-secondary">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  aria-sort={sortCol === i ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  className="border-b border-border p-0 text-start font-semibold text-t-primary"
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(i)}
                    className="flex w-full items-center gap-1 px-3 py-2 text-start hover:bg-bg-tertiary"
                  >
                    {h || "—"}
                    {sortCol === i &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="h-3 w-3" aria-hidden="true" />
                      ))}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="hover:bg-bg-secondary/80">
                {headers.map((_, ci) => (
                  <td key={ci} className="max-w-[260px] border-b border-border/60 p-0 text-t-secondary">
                    <button
                      type="button"
                      onClick={() => copyCell(row[ci] ?? "")}
                      className="block w-full truncate px-3 py-2 text-start hover:text-t-primary"
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
    </div>
  );
}
