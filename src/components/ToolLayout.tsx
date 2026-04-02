import Link from "next/link";
import Header from "./Header";
import Footer from "./Footer";
import AdPlaceholder from "./AdPlaceholder";

interface ToolLayoutProps {
  children: React.ReactNode;
  toolName: string;
  toolDescription: string;
}

export default function ToolLayout({ children, toolName, toolDescription }: ToolLayoutProps) {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-5 py-8">
          <nav className="flex items-center gap-1.5 text-[12px] text-t-tertiary mb-6">
            <Link href="/" className="hover:text-t-secondary transition-colors">Home</Link>
            <span className="text-t-tertiary/40">/</span>
            <Link href="/tools" className="hover:text-t-secondary transition-colors">Tools</Link>
            <span className="text-t-tertiary/40">/</span>
            <span className="text-t-secondary">{toolName}</span>
          </nav>

          <AdPlaceholder position="top" />

          <div className="mb-6">
            <h1 className="text-xl font-semibold text-t-primary">{toolName}</h1>
            <p className="text-[13px] text-t-secondary mt-1">{toolDescription}</p>
          </div>

          <div className="animate-fade-up">{children}</div>

          <p className="mt-10 text-center text-[11px] text-t-tertiary">
            &#x26A1; Your files never leave your browser
          </p>

          <AdPlaceholder position="bottom" />
        </div>
      </main>
      <Footer />
    </>
  );
}
