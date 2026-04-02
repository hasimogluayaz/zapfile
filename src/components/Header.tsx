"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-5xl mx-auto px-5">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 focus-ring rounded">
            <span className="text-lg">&#x26A1;</span>
            <span className="text-[15px] font-semibold text-t-primary">ZapFile</span>
          </Link>

          <Link
            href="/tools"
            className={`text-[13px] font-medium px-3 py-1.5 rounded-md transition-colors ${
              pathname === "/tools"
                ? "bg-accent-light text-accent"
                : "text-t-secondary hover:text-t-primary"
            }`}
          >
            All Tools
          </Link>
        </div>
      </div>
    </header>
  );
}
