"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  tools,
  categoryLabels,
  categoryEmojis,
  type ToolCategory,
} from "@/lib/tools";

const categories: ToolCategory[] = ["pdf", "image", "video", "utility"];

export default function Header() {
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur-xl border-b border-border">
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

          {/* Nav */}
          <div className="flex items-center gap-1">
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
                All Tools
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
                  <div className="bg-surface border border-border rounded-2xl shadow-lg p-5 min-w-[560px]">
                    <div className="grid grid-cols-2 gap-6">
                      {categories.map((cat) => {
                        const catTools = tools.filter(
                          (t) => t.category === cat,
                        );
                        return (
                          <div key={cat}>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-t-tertiary mb-2.5 flex items-center gap-1.5">
                              <span>{categoryEmojis[cat]}</span>
                              {categoryLabels[cat]}
                            </p>
                            <div className="space-y-0.5">
                              {catTools.map((tool) => (
                                <Link
                                  key={tool.slug}
                                  href={`/tools/${tool.slug}`}
                                  onClick={() => setShowDropdown(false)}
                                  className="block px-2.5 py-1.5 rounded-lg text-[13px] text-t-secondary hover:text-accent hover:bg-accent-light transition-colors"
                                >
                                  <span className="mr-1.5">{tool.emoji}</span>
                                  {tool.name}
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
                        View all {tools.length} tools
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

            {/* Individual category links on desktop */}
            <Link
              href="/tools"
              className={`hidden md:block text-[13px] font-medium px-3.5 py-2 rounded-lg transition-colors ${
                pathname === "/tools"
                  ? "bg-accent-light text-accent"
                  : "text-t-secondary hover:text-t-primary hover:bg-bg-secondary"
              }`}
            >
              Browse All
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
