import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about ZapFile - free, private, browser-based file tools. No uploads, no servers, no accounts needed.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-3xl mx-auto px-5 py-16">
          <h1 className="text-3xl font-bold text-t-primary mb-4">
            About ZapFile
          </h1>
          <p className="text-t-secondary leading-relaxed mb-4">
            ZapFile is a collection of free, fast, and private file tools that
            run entirely in your browser. No uploads, no servers, no accounts
            needed. Just open a tool and start working.
          </p>

          <h2 className="text-xl font-semibold text-t-primary mt-12 mb-4">
            Our Mission
          </h2>
          <p className="text-t-secondary leading-relaxed mb-4">
            We believe everyone should have access to powerful file tools without
            sacrificing their privacy or paying for subscriptions. ZapFile provides
            a comprehensive suite of tools for working with PDFs, images, videos,
            and more &mdash; completely free and accessible to everyone.
          </p>

          <h2 className="text-xl font-semibold text-t-primary mt-12 mb-4">
            How It Works
          </h2>
          <p className="text-t-secondary leading-relaxed mb-4">
            Everything processes directly in your browser using modern web
            technologies. When you compress an image or merge PDFs, your files
            never leave your device. There are no uploads to remote servers and
            no waiting for server-side processing. This means your files stay
            private, and tools work even without an internet connection after the
            page loads.
          </p>

          <h2 className="text-xl font-semibold text-t-primary mt-12 mb-4">
            Privacy First
          </h2>
          <p className="text-t-secondary leading-relaxed mb-4">
            Privacy is not just a feature &mdash; it&apos;s the foundation of
            ZapFile. We don&apos;t collect your data, we don&apos;t process your
            files on our servers, and we don&apos;t require you to create an
            account. Your files are yours and they stay on your device.
          </p>

          <h2 className="text-xl font-semibold text-t-primary mt-12 mb-4">
            Built With
          </h2>
          <p className="text-t-secondary leading-relaxed mb-4">
            ZapFile is built with Next.js and leverages powerful browser APIs
            including Canvas, Web Audio, and WebAssembly-powered libraries like
            FFmpeg WASM. These technologies enable us to perform complex file
            operations &mdash; from video conversion to PDF manipulation &mdash;
            entirely client-side.
          </p>

          <h2 className="text-xl font-semibold text-t-primary mt-12 mb-4">
            Open Source
          </h2>
          <p className="text-t-secondary leading-relaxed mb-4">
            ZapFile is an open-source project. We believe in transparency and
            community-driven development. You can review the code, suggest
            improvements, or contribute new tools. Building in the open ensures
            that our privacy promises are verifiable by anyone.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
