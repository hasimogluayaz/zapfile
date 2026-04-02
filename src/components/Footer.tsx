import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-t-tertiary">
            All processing happens in your browser. Files never leave your device.
          </p>
          <div className="flex items-center gap-5 text-[12px] text-t-tertiary">
            <Link href="/privacy" className="hover:text-t-secondary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-t-secondary transition-colors">Terms</Link>
            <span>&copy; {new Date().getFullYear()} ZapFile</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
