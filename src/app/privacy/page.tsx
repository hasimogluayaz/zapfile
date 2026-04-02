import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ZapFile privacy policy. Your files never leave your browser.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-brand-text mb-8">
            Privacy Policy
          </h1>

          <div className="prose prose-invert max-w-none space-y-6 text-brand-muted">
            <p>Last updated: January 2025</p>

            <h2 className="text-xl font-semibold text-brand-text mt-8">
              Your Privacy Matters
            </h2>
            <p>
              ZapFile is designed with privacy as a core principle. All file
              processing happens entirely in your web browser. Your files are
              never uploaded to any server.
            </p>

            <h2 className="text-xl font-semibold text-brand-text mt-8">
              Data We Don&apos;t Collect
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We do not upload, store, or access your files</li>
              <li>We do not track the content of files you process</li>
              <li>
                We do not require account creation or personal information
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-brand-text mt-8">
              Data We May Collect
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Anonymous usage analytics (page views, tool usage counts) to
                improve our service
              </li>
              <li>
                Standard web server logs (IP address, browser type) for security
                purposes
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-brand-text mt-8">
              Third-Party Services
            </h2>
            <p>
              We may use Google AdSense for advertising, which uses cookies to
              serve relevant ads. You can manage your ad preferences through
              Google&apos;s ad settings.
            </p>

            <h2 className="text-xl font-semibold text-brand-text mt-8">
              Contact
            </h2>
            <p>
              If you have questions about this privacy policy, please contact us
              at privacy@zapfile.xyz.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
