"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-5 py-16">
        <p className="text-8xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent mb-4">
          404
        </p>
        <h1 className="text-2xl font-bold text-t-primary mb-2">
          Page Not Found
        </h1>
        <p className="text-t-secondary text-[15px] mb-8 text-center max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg text-[13px] font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-opacity"
          >
            Go Home
          </Link>
          <Link
            href="/tools"
            className="px-5 py-2.5 rounded-lg text-[13px] font-medium text-t-secondary bg-bg-secondary border border-border hover:text-t-primary hover:bg-bg-tertiary transition-colors"
          >
            Browse Tools
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
