import RootShell, { rootMetadata, rootViewport } from "../root-shell";

/** Root layout of the English pages (`/`, `/tools/…`, `/blog/…`, `/about`, …). */
export const metadata = rootMetadata;
export const viewport = rootViewport;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="en">{children}</RootShell>;
}
