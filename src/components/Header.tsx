"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronDown,
  CornerDownLeft,
  Menu,
  Moon,
  Search,
  Star,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { tools, type Tool, type ToolCategory } from "@/lib/tools";
import { useI18n } from "@/lib/i18n";
import { parseLocalizedToolPath } from "@/lib/localized-routes";
import { toolField } from "@/lib/tool-i18n";
import { useFavoriteTools } from "@/hooks/useFavoriteTools";
import { useRecentTools } from "@/hooks/useRecentTools";
import { searchTools } from "@/lib/search";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import ToolIcon, { CategoryIcon } from "@/components/ToolIcon";
import Illustration from "@/components/Illustration";
import { useTheme } from "@/components/ClientProviders";

function isTypingElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

const categories: ToolCategory[] = ["pdf", "image", "video", "utility"];
const catKeys: Record<ToolCategory, string> = {
  pdf: "cat.pdf",
  image: "cat.image",
  video: "cat.video",
  utility: "cat.utility",
};

/** Shown straight in the header (desktop) and on top of the mobile menu: what most people come for. */
const POPULAR = ["merge-pdf", "split-pdf", "pdf-compress", "compress-image"];
/** How many of POPULAR fit in the desktop header next to the menus and search. */
const POPULAR_IN_HEADER = 3;
const CONVERT_TO_PDF = ["image-to-pdf", "word-to-pdf", "powerpoint-to-pdf", "excel-to-pdf", "html-to-pdf"];
const CONVERT_FROM_PDF = ["pdf-to-images", "pdf-to-word", "pdf-to-powerpoint", "pdf-to-excel", "pdf-to-markdown", "ocr-pdf"];
/** PDF tools in the all-tools menu, in groups like the competition uses (task first, not A-Z). */
const PDF_GROUPS: { key: string; slugs: string[] }[] = [
  { key: "nav.grp.organize", slugs: ["merge-pdf", "split-pdf", "organize-pdf", "rotate-pdf", "pdf-page-numbers", "crop-pdf"] },
  { key: "nav.grp.optimize", slugs: ["pdf-compress", "repair-pdf", "ocr-pdf"] },
  { key: "nav.convertTo", slugs: CONVERT_TO_PDF },
  { key: "nav.convertFrom", slugs: [...CONVERT_FROM_PDF.filter((s) => s !== "ocr-pdf"), "pdf-text-extractor"] },
  { key: "nav.grp.edit", slugs: ["fill-pdf", "sign-pdf", "watermark-pdf", "compare-pdf", "redact-pdf"] },
  { key: "nav.grp.security", slugs: ["pdf-encrypt"] },
];
const toolBySlug = (slug: string) => tools.find((tool) => tool.slug === slug);

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="volt-mark flex items-center justify-center rounded-[9px] shadow-sm"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <Zap
          style={{ width: size * 0.56, height: size * 0.56 }}
          strokeWidth={2.25}
          fill="currentColor"
        />
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.03em] text-t-primary">
        ZapFile
      </span>
    </span>
  );
}

// ─── Search Modal ──────────────────────────────────────────────
function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t, toolHref } = useI18n();
  const { recentSlugs } = useRecentTools();
  const { favorites } = useFavoriteTools();

  const hasQuery = query.trim().length > 0;

  // Empty query → favorites first, then recently used (deduped).
  const results = useMemo(() => {
    if (hasQuery) return searchTools(tools, query, t).slice(0, 30);
    const slugs = Array.from(new Set([...favorites, ...recentSlugs]));
    return slugs
      .map((slug) => tools.find((tool) => tool.slug === slug))
      .filter((tool): tool is Tool => Boolean(tool))
      .slice(0, 8);
  }, [hasQuery, query, t, favorites, recentSlugs]);

  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (slug: string) => {
    onClose();
    router.push(toolHref(slug));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length) setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length)
        setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      const tool = results[active];
      if (tool) {
        e.preventDefault();
        go(tool.slug);
      }
    }
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 px-3 pt-[10vh] backdrop-blur-[6px] animate-fade-in sm:pt-[16vh] dark:bg-black/50"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("a11y.searchTools")}
        className="w-full max-w-[600px] overflow-hidden rounded-[20px] border border-border bg-surface shadow-float animate-pop-in"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-t-tertiary" strokeWidth={2} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("search.placeholder")}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={
              results[active] ? `search-opt-${results[active].slug}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent text-[16px] text-t-primary outline-none placeholder:text-t-tertiary focus-visible:shadow-none focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium text-t-tertiary hover:text-t-primary"
          >
            Esc
          </button>
        </div>

        <div
          ref={listRef}
          id="search-results"
          role="listbox"
          className="max-h-[min(440px,58vh)] overflow-y-auto p-2"
        >
          {!hasQuery && results.length > 0 && (
            <p className="px-3 pb-1.5 pt-1 text-[12px] font-medium text-t-tertiary">
              {t("search.quickAccess")}
            </p>
          )}
          {results.length > 0 ? (
            results.map((tool, index) => {
              const selected = index === active;
              return (
                <Link
                  key={tool.slug}
                  id={`search-opt-${tool.slug}`}
                  data-index={index}
                  role="option"
                  aria-selected={selected}
                  href={toolHref(tool.slug)}
                  onClick={onClose}
                  onMouseMove={() => setActive(index)}
                  className={`flex items-center gap-3 rounded-xl px-2.5 py-2 ${
                    selected ? "bg-bg-secondary" : ""
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors ${
                      selected
                        ? "bg-t-primary text-bg"
                        : "bg-bg-secondary text-t-primary"
                    }`}
                  >
                    <ToolIcon slug={tool.slug} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-t-primary">
                      {toolField(t, tool.slug, tool, "name")}
                    </span>
                    <span className="block truncate text-[12.5px] text-t-tertiary">
                      {toolField(t, tool.slug, tool, "desc")}
                    </span>
                  </span>
                  {selected && (
                    <CornerDownLeft
                      className="hidden h-4 w-4 shrink-0 text-t-tertiary sm:block"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })
          ) : (
            <div className="px-3 py-8 text-center">
              {hasQuery && <Illustration name="no-results" size={96} className="mb-3" />}
              <p className="text-[13px] text-t-tertiary">
                {hasQuery ? t("nav.noResults") : t("search.emptyHint")}
              </p>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-4 border-t border-border bg-bg-secondary/60 px-4 py-2.5 text-[11.5px] text-t-tertiary sm:flex">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-sans">↑</kbd>
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-sans">↓</kbd>
            {t("search.navigate")}
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-sans">↵</kbd>
            {t("search.open")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Menu ───────────────────────────────────────────────
function MobileMenu({
  onClose,
  onSearch,
}: {
  onClose: () => void;
  onSearch: () => void;
}) {
  const [expandedCat, setExpandedCat] = useState<ToolCategory | null>(null);
  const { t, toolHref, blogHref } = useI18n();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={t("nav.menu")}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <Logo />
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
          aria-label={t("a11y.closeMenu")}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <button
          type="button"
          onClick={() => {
            onClose();
            onSearch();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 text-[15px] text-t-tertiary"
        >
          <Search className="h-[18px] w-[18px]" aria-hidden="true" />
          {t("nav.searchShort")}
        </button>

        <div className="grid grid-cols-2 gap-2">
          {POPULAR.map((slug) => {
            const tool = toolBySlug(slug);
            if (!tool) return null;
            return (
              <Link
                key={slug}
                href={toolHref(slug)}
                onClick={onClose}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-3 text-[14px] font-medium text-t-primary"
              >
                <ToolIcon slug={slug} className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{toolField(t, slug, tool, "name")}</span>
              </Link>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {categories.map((cat, i) => {
            const catTools = tools.filter((tool) => tool.category === cat);
            const isExpanded = expandedCat === cat;
            return (
              <div key={cat} className={i > 0 ? "border-t border-border" : ""}>
                <button
                  onClick={() => setExpandedCat(isExpanded ? null : cat)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-[15px] font-medium text-t-primary"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-bg-secondary">
                    <CategoryIcon category={cat} />
                  </span>
                  <span className="flex-1 text-start">{t(catKeys[cat])}</span>
                  <span className="text-[13px] text-t-tertiary">{catTools.length}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-t-tertiary transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                {isExpanded && (
                  <div className="pb-2">
                    {catTools.map((tool) => (
                      <Link
                        key={tool.slug}
                        href={toolHref(tool.slug)}
                        onClick={onClose}
                        className="flex items-center gap-3 px-4 py-2.5 ps-[60px] text-[14px] text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
                      >
                        <ToolIcon slug={tool.slug} className="h-4 w-4 shrink-0" />
                        {toolField(t, tool.slug, tool, "name")}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <nav className="overflow-hidden rounded-2xl border border-border bg-surface">
          {[
            { href: "/tools", key: "nav.browseAll" },
            { href: "/workflows", key: "nav.workflows" },
            { href: "/blog", key: "nav.blog" },
            { href: "/changelog", key: "nav.changelog" },
            { href: "/about", key: "nav.about" },
          ].map((link, i) => (
            <Link
              key={link.href}
              href={link.href === "/blog" ? blogHref() : link.href}
              onClick={onClose}
              className={`block px-4 py-3.5 text-[15px] text-t-primary hover:bg-bg-secondary ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <LanguageSwitcher fullWidth />
      </div>
    </div>
  );
}

// ─── Convert menu (to PDF / from PDF) ─────────────────────────
function ConvertMenu({ onNavigate }: { onNavigate: () => void }) {
  const { t, toolHref } = useI18n();
  const column = (title: string, slugs: string[]) => (
    <div className="min-w-0">
      <p className="mb-1.5 px-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-t-tertiary">{title}</p>
      {slugs.map((slug) => {
        const tool = toolBySlug(slug);
        if (!tool) return null;
        return (
          <Link
            key={slug}
            href={toolHref(slug)}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13.5px] font-medium text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-bg-secondary text-t-primary">
              <ToolIcon slug={slug} className="h-[15px] w-[15px]" />
            </span>
            <span className="truncate">{toolField(t, slug, tool, "name")}</span>
          </Link>
        );
      })}
    </div>
  );
  return (
    <div className="grid w-[min(520px,calc(100vw-2rem))] grid-cols-2 gap-3 rounded-[20px] border border-border bg-surface p-3 shadow-float animate-pop-in">
      {column(t("nav.convertTo"), CONVERT_TO_PDF)}
      {column(t("nav.convertFrom"), CONVERT_FROM_PDF)}
    </div>
  );
}

// ─── Tools mega menu ───────────────────────────────────────────
function ToolsMenu({ onNavigate }: { onNavigate: () => void }) {
  const { t, toolHref, blogHref } = useI18n();
  const { favorites, ready } = useFavoriteTools();
  const favoriteTools = tools.filter((tool) => favorites.includes(tool.slug));
  const menuLink = (slug: string) => {
    const tool = toolBySlug(slug);
    if (!tool) return null;
    return (
      <Link
        key={slug}
        href={toolHref(slug)}
        onClick={onNavigate}
        className="flex items-center gap-2 truncate rounded-lg px-2 py-1.5 text-[13px] text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
      >
        <ToolIcon slug={slug} className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{toolField(t, slug, tool, "name")}</span>
      </Link>
    );
  };

  return (
    <div className="w-[min(1060px,calc(100vw-2rem))] rounded-[20px] border border-border bg-surface p-2 shadow-float animate-pop-in">
      {ready && favoriteTools.length > 0 && (
        <div className="mb-1 flex flex-wrap items-center gap-1.5 rounded-2xl bg-bg-secondary/70 p-2.5">
          <Star className="mx-1 h-4 w-4 fill-volt text-volt-ink" aria-label={t("nav.favorites")} />
          {favoriteTools.map((tool) => (
            <Link
              key={tool.slug}
              href={toolHref(tool.slug)}
              onClick={onNavigate}
              className="flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-[12.5px] font-medium text-t-primary shadow-sm hover:bg-surface-hover"
            >
              <ToolIcon slug={tool.slug} className="h-3.5 w-3.5" />
              {toolField(t, tool.slug, tool, "name")}
            </Link>
          ))}
        </div>
      )}
      <div className="grid max-h-[min(72vh,600px)] grid-cols-3 gap-x-1 gap-y-3 overflow-y-auto p-2 lg:grid-cols-5">
        {[PDF_GROUPS.slice(0, 2), PDF_GROUPS.slice(2, 4), PDF_GROUPS.slice(4)].map((col, i) => (
          <div key={i} className="min-w-0 space-y-3">
            {col.map((g) => (
              <div key={g.key}>
                <p className="mb-1 px-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-t-tertiary">{t(g.key)}</p>
                {g.slugs.map((slug) => menuLink(slug))}
              </div>
            ))}
          </div>
        ))}
        {(["image", "video", "utility"] as ToolCategory[]).map((cat) => (
          <div key={cat} className={`min-w-0 ${cat === "video" ? "lg:hidden" : ""}`}>
            <p className="mb-1 flex items-center gap-2 px-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-t-tertiary">
              <CategoryIcon category={cat} className="h-3.5 w-3.5" />
              {t(catKeys[cat])}
            </p>
            {tools.filter((tool) => tool.category === cat).map((tool) => menuLink(tool.slug))}
            {cat === "utility" && (
              <div className="mt-3 hidden lg:block">
                <p className="mb-1 flex items-center gap-2 px-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-t-tertiary">
                  <CategoryIcon category="video" className="h-3.5 w-3.5" />
                  {t(catKeys.video)}
                </p>
                {tools.filter((tool) => tool.category === "video").map((tool) => menuLink(tool.slug))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 pb-1 pt-2.5">
        <Link
          href="/tools"
          onClick={onNavigate}
          className="text-[13px] font-medium text-t-primary hover:underline"
        >
          {t("nav.viewAll", { count: tools.length })}
        </Link>
        <span className="flex items-center gap-4 text-[13px]">
          <Link href="/workflows" onClick={onNavigate} className="text-t-secondary hover:text-t-primary hover:underline">
            {t("nav.workflows")}
          </Link>
          <Link href={blogHref()} onClick={onNavigate} className="text-t-secondary hover:text-t-primary hover:underline">
            {t("nav.blog")}
          </Link>
        </span>
      </div>
    </div>
  );
}

// ─── Header ────────────────────────────────────────────────────
export default function Header() {
  const pathname = usePathname();
  // Open dropdown: the tools mega menu, the convert menu, or none.
  const [openMenu, setOpenMenu] = useState<"tools" | "convert" | null>(null);
  const showMenu = openMenu !== null;
  const hoverTimer = useRef<number | undefined>(undefined);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const { t, toolHref } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [searchModKey, setSearchModKey] = useState("Ctrl");

  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/Mac|iPhone|iPod|iPad/i.test(navigator.platform || "") || ua.includes("Mac OS")) {
      setSearchModKey("⌘");
    }
  }, []);

  // Ctrl+K / Cmd+K or "/" → search; ? → shortcuts (when not typing)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
        return;
      }
      if (
        e.key === "/" &&
        !e.shiftKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        !isTypingElement(e.target)
      ) {
        e.preventDefault();
        setShowSearch(true);
        return;
      }
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        if (isTypingElement(e.target)) return;
        e.preventDefault();
        setShowShortcuts(true);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Close the tools menu on outside click / Escape.
  useEffect(() => {
    if (!showMenu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showMenu]);

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  const navLink = (href: string, label: string) => {
    const active = pathname === href || pathname?.startsWith(`${href}/`);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[13.5px] font-medium transition-colors ${
          active
            ? "bg-bg-secondary text-t-primary"
            : "text-t-secondary hover:text-t-primary"
        }`}
      >
        {label}
      </Link>
    );
  };

  const isToolPage = pathname?.startsWith("/tools/") || parseLocalizedToolPath(pathname) !== null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-xl backdrop-saturate-150">
        <div className={`mx-auto px-4 sm:px-6 ${isToolPage ? "max-w-[1780px]" : "max-w-6xl"}`}>
          <div className="flex h-14 items-center gap-2">
            <Link href="/" className="me-3 shrink-0 rounded-lg" aria-label="ZapFile">
              <Logo />
            </Link>

            {/* Desktop nav: popular tools first, then the convert and all-tools menus (hover or click). */}
            <nav ref={menuRef} className="hidden items-center gap-0.5 md:flex" aria-label={t("nav.primaryLabel")}>
              {POPULAR.slice(0, POPULAR_IN_HEADER).map((slug) => {
                const tool = toolBySlug(slug);
                return tool ? <span key={slug} className="hidden xl:inline-flex">{navLink(toolHref(slug), toolField(t, slug, tool, "name"))}</span> : null;
              })}
              {(["convert", "tools"] as const).map((key) => {
                const open = openMenu === key;
                const active = key === "tools" && pathname === "/tools";
                return (
                  <div
                    key={key}
                    className="relative"
                    onMouseEnter={() => {
                      window.clearTimeout(hoverTimer.current);
                      hoverTimer.current = window.setTimeout(() => setOpenMenu(key), 80);
                    }}
                    onMouseLeave={() => {
                      window.clearTimeout(hoverTimer.current);
                      hoverTimer.current = window.setTimeout(() => setOpenMenu((m) => (m === key ? null : m)), 180);
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenMenu(open ? null : key)}
                      aria-expanded={open}
                      aria-haspopup="true"
                      className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[13.5px] font-medium transition-colors ${
                        open || active ? "bg-bg-secondary text-t-primary" : "text-t-secondary hover:text-t-primary"
                      }`}
                    >
                      {t(key === "convert" ? "nav.convert" : "nav.allTools")}
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                    {open && (
                      <div
                        className={
                          key === "convert"
                            ? "absolute start-0 top-full z-50 pt-2"
                            : // The big menu is centred under the header; still a child here, so hovering it keeps it open.
                              "fixed inset-x-0 top-14 z-50 flex justify-center px-4 pt-2"
                        }
                      >
                        {key === "convert" ? <ConvertMenu onNavigate={() => setOpenMenu(null)} /> : <ToolsMenu onNavigate={() => setOpenMenu(null)} />}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="ms-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="hidden h-9 items-center gap-2 rounded-full border border-border bg-surface pe-1.5 ps-3 text-[13px] text-t-tertiary shadow-sm transition-colors hover:border-t-primary/25 hover:text-t-secondary sm:flex lg:w-48"
                aria-label={t("a11y.searchTools")}
              >
                <Search className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                <span className="flex-1 text-start">{t("nav.searchShort")}</span>
                <kbd className="hidden rounded-md border border-border bg-bg-secondary px-1.5 py-0.5 font-sans text-[11px] font-medium lg:inline">
                  {searchModKey} K
                </kbd>
              </button>
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-t-secondary hover:bg-bg-secondary hover:text-t-primary sm:hidden"
                aria-label={t("a11y.searchTools")}
              >
                <Search className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>

              <div className="hidden md:block">
                <LanguageSwitcher compact />
              </div>

              <button
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-full text-t-secondary transition-colors hover:bg-bg-secondary hover:text-t-primary"
                aria-label={t("a11y.toggleTheme")}
              >
                {theme === "dark" ? (
                  <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
                ) : (
                  <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
                )}
              </button>

              <button
                onClick={() => setShowMobileMenu(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-t-secondary hover:bg-bg-secondary hover:text-t-primary md:hidden"
                aria-label={t("a11y.openMenu")}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}

      <KeyboardShortcutsModal
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {showMobileMenu && (
        <MobileMenu
          onClose={() => setShowMobileMenu(false)}
          onSearch={() => setShowSearch(true)}
        />
      )}
    </>
  );
}
