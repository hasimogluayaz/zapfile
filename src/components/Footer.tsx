import Link from "next/link";
import Image from "next/image";
import { tools } from "@/lib/tools";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "All Tools", href: "/tools" },
      { label: "PDF Tools", href: "/tools#pdf" },
      { label: "Image Tools", href: "/tools#image" },
      { label: "Video & Audio", href: "/tools#video" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border mt-auto bg-bg-secondary">
      <div className="max-w-6xl mx-auto px-5 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <Image
                src="/android-chrome-192x192.png"
                alt="ZapFile"
                width={28}
                height={28}
                className="rounded-sm"
              />
              <span className="text-[15px] font-bold text-t-primary">
                ZapFile
              </span>
            </div>
            <p className="text-[12px] text-t-tertiary leading-relaxed max-w-[220px]">
              Fast, free, and private file tools. Everything runs in your
              browser — your files never leave your device.
            </p>
          </div>

          {/* Link sections */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <p className="text-[12px] font-semibold text-t-primary uppercase tracking-wider mb-3">
                {section.title}
              </p>
              <div className="space-y-2">
                {section.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block text-[13px] text-t-tertiary hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Popular Tools */}
          <div>
            <p className="text-[12px] font-semibold text-t-primary uppercase tracking-wider mb-3">
              Popular Tools
            </p>
            <div className="space-y-2">
              {tools.slice(0, 5).map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="block text-[13px] text-t-tertiary hover:text-accent transition-colors"
                >
                  {tool.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-t-tertiary">
            &copy; {new Date().getFullYear()} ZapFile. All processing happens in
            your browser.
          </p>
          <div className="flex items-center gap-4 text-[12px] text-t-tertiary">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {tools.length} Free Tools
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              No Sign-up Required
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
