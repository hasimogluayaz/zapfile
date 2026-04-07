"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import { tools, categoryEmojis, type ToolCategory } from "@/lib/tools";
import { useI18n } from "@/lib/i18n";
import { toolField } from "@/lib/tool-i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTheme } from "@/components/ClientProviders";

const categories: ToolCategory[] = ["pdf", "image", "video", "utility"];
const catKeys: Record<ToolCategory, string> = {
  pdf: "cat.pdf",
  image: "cat.image",
  video: "cat.video",
  utility: "cat.utility",
};

// ─── Search Modal ──────────────────────────────────────────────
function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return tools.filter((tool) => {
      const tn = toolField(t, tool.slug, tool, "name").toLowerCase();
      const td = toolField(t, tool.slug, tool, "desc").toLowerCase();
      return (
        tn.includes(q) ||
        td.includes(q) ||
        tool.slug.toLowerCase().includes(q) ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q)
      );
    });
  }, [query, t]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-bg/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="w-full max-w-lg mx-4 bg-surface border border-border rounded-2xl shadow-lg overflow-hidden animate-fade-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <svg
            className="w-5 h-5 text-t-tertiary shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("tools.search")}
            className="flex-1 bg-transparent text-t-primary text-[15px] placeholder:text-t-tertiary outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium text-t-tertiary bg-bg-secondary border border-border rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {query.trim() && (
          <div className="max-h-[300px] overflow-y-auto p-2">
            {results.length > 0 ? (
              results.map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-t-secondary hover:text-accent hover:bg-accent-light transition-colors"
                >
                  <span className="text-lg shrink-0">{tool.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-t-primary truncate">
                      {toolField(t, tool.slug, tool, "name")}
                    </p>
                    <p className="text-[12px] text-t-tertiary truncate">
                      {toolField(t, tool.slug, tool, "desc")}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="px-3 py-6 text-center text-[13px] text-t-tertiary">
                {t("nav.noResults")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mobile Menu ───────────────────────────────────────────────
function MobileMenu({ onClose }: { onClose: () => void }) {
  const [expandedCat, setExpandedCat] = useState<ToolCategory | null>(null);
  const { t } = useI18n();

  // Prevent body scroll while menu is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-xl flex flex-col animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-border">
        <span className="text-[18px] font-bold text-t-primary">{t("nav.menu")}</span>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-t-secondary hover:text-t-primary hover:bg-bg-secondary transition-colors"
          aria-label="Close menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        <div className="mb-4">
          <LanguageSwitcher fullWidth />
        </div>

        {/* All Tools expandable sections */}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-t-tertiary px-1 pt-2">
          {t("nav.allTools")}
        </p>
        {categories.map((cat) => {
          const catTools = tools.filter((tool) => tool.category === cat);
          const isExpanded = expandedCat === cat;
          return (
            <div key={cat}>
              <button
                onClick={() => setExpandedCat(isExpanded ? null : cat)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-[14px] font-medium text-t-secondary hover:text-t-primary hover:bg-bg-secondary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>{categoryEmojis[cat]}</span>
                  {t(catKeys[cat])}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {isExpanded && (
                <div className="ml-4 space-y-0.5 mt-1 animate-fade-in">
                  {catTools.map((tool) => (
                    <Link
                      key={tool.slug}
                      href={`/tools/${tool.slug}`}
                      onClick={onClose}
                      className="block px-3 py-2 rounded-lg text-[13px] text-t-secondary hover:text-accent hover:bg-accent-light transition-colors"
                    >
                      <span className="mr-1.5">{tool.emoji}</span>
                      {toolField(t, tool.slug, tool, "name")}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Browse All */}
        <Link
          href="/tools"
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[14px] font-medium text-accent hover:bg-accent-light transition-colors"
        >
          {t("nav.browseAll")}
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>

        {/* Divider */}
        <div className="border-t border-border my-2" />

        {/* Extra links */}
        {[
          { href: "/about", key: "nav.about" },
          { href: "/blog", key: "nav.blog" },
          { href: "/changelog", key: "nav.changelog" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="block px-3 py-2.5 rounded-xl text-[14px] font-medium text-t-secondary hover:text-t-primary hover:bg-bg-secondary transition-colors"
          >
            {t(link.key)}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Header ────────────────────────────────────────────────────
export default function Header() {
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();

  // Ctrl+K / Cmd+K to open search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 focus-ring rounded"
            >
              <Image
                src="/android-chrome-192x192.png"
                alt="ZapFile"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="text-[18px] font-bold text-t-primary">
                ZapFile
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              <div className="mr-2">
                <LanguageSwitcher />
              </div>

              {/* Search button */}
              <button
                onClick={() => setShowSearch(true)}
                className="flex items-center gap-2 text-[13px] font-medium px-3 py-2 rounded-lg text-t-secondary hover:text-t-primary hover:bg-bg-secondary transition-colors"
                aria-label="Search tools"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                  />
                </svg>
                <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium text-t-tertiary bg-bg-secondary border border-border rounded">
                  Ctrl K
                </kbd>
              </button>

              {/* Tools Dropdown */}
              <div className="relative">
                <button
                  onMouseEnter={() => setShowDropdown(true)}
                  onMouseLeave={() => setShowDropdown(false)}
                  onClick={() => setShowDropdown(!showDropdown)}
                  className={`text-[13px] font-medium px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    showDropdown
                      ? "bg-accent-light text-accent"
                      : "text-t-secondary hover:text-t-primary hover:bg-bg-secondary"
                  }`}
                >
                  {t("nav.allTools")}
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${showDropdown ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown */}
                {showDropdown && (
                  <div
                    onMouseEnter={() => setShowDropdown(true)}
                    onMouseLeave={() => setShowDropdown(false)}
                    className="absolute right-0 top-full pt-2 animate-fade-in"
                  >
                    <div className="bg-surface border border-border rounded-2xl shadow-lg p-5 min-w-[560px] max-h-[70vh] overflow-y-auto">
                      <div className="grid grid-cols-2 gap-6">
                        {categories.map((cat) => {
                          const catTools = tools.filter(
                            (t2) => t2.category === cat,
                          );
                          return (
                            <div key={cat}>
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-t-tertiary mb-2.5 flex items-center gap-1.5">
                                <span>{categoryEmojis[cat]}</span>
                                {t(catKeys[cat])}
                              </p>
                              <div className="space-y-0.5">
                                {catTools.map((tool) => (
                                  <Link
                                    key={tool.slug}
                                    href={`/tools/${tool.slug}`}
                                    onClick={() => setShowDropdown(false)}
                                    className="block px-2.5 py-1.5 rounded-lg text-[13px] text-t-secondary hover:text-accent hover:bg-accent-light transition-colors"
                                  >
                                    <span className="mr-1.5">
                                      {tool.emoji}
                                    </span>
                                    {toolField(t, tool.slug, tool, "name")}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 pt-3 border-t border-border">
                        <Link
                          href="/tools"
                          onClick={() => setShowDropdown(false)}
                          className="text-[13px] font-medium text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
                        >
                          {t("nav.viewAll", { count: tools.length })}
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Browse All link */}
              <Link
                href="/tools"
                className={`text-[13px] font-medium px-3.5 py-2 rounded-lg transition-colors ${
                  pathname === "/tools"
                    ? "bg-accent-light text-accent"
                    : "text-t-secondary hover:text-t-primary hover:bg-bg-secondary"
                }`}
              >
                {t("nav.browseAll")}
              </Link>

              {/* Blog & Changelog */}
              {[
                { href: "/blog", key: "nav.blog" },
                { href: "/changelog", key: "nav.changelog" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[13px] font-medium px-3.5 py-2 rounded-lg transition-colors ${
                    pathname === link.href
                      ? "bg-accent-light text-accent"
                      : "text-t-secondary hover:text-t-primary hover:bg-bg-secondary"
                  }`}
                >
                  {t(link.key)}
                </Link>
              ))}

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-t-secondary hover:text-t-primary hover:bg-bg-secondary transition-colors ml-1"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <svg
                    className="w-[18px] h-[18px]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 7.66l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-[18px] h-[18px]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Mobile controls */}
            <div className="flex items-center gap-1 md:hidden">
              {/* Mobile search button */}
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 rounded-lg text-t-secondary hover:text-t-primary hover:bg-bg-secondary transition-colors"
                aria-label="Search tools"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                  />
                </svg>
              </button>

              {/* Mobile theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-t-secondary hover:text-t-primary hover:bg-bg-secondary transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 7.66l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
                    />
                  </svg>
                )}
              </button>

              {/* Hamburger button */}
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-lg text-t-secondary hover:text-t-primary hover:bg-bg-secondary transition-colors"
                aria-label="Open menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}

      {/* Mobile Menu */}
      {showMobileMenu && (
        <MobileMenu onClose={() => setShowMobileMenu(false)} />
      )}
    </>
  );
}
