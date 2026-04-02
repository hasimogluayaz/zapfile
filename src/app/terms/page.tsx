import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "ZapFile terms of service.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-t-primary mb-8">
            Terms of Service
          </h1>

          <div className="prose max-w-none space-y-6 text-t-secondary">
            <p>Last updated: January 2025</p>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              Acceptance of Terms
            </h2>
            <p>
              By accessing and using ZapFile (zapfile.xyz), you accept and agree
              to these terms of service.
            </p>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              Service Description
            </h2>
            <p>
              ZapFile provides free, browser-based file processing tools. All
              file processing occurs locally in your web browser. No files are
              uploaded to our servers.
            </p>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              Disclaimer
            </h2>
            <p>
              The service is provided &quot;as is&quot; without warranties of
              any kind. We do not guarantee the accuracy or reliability of any
              file processing results. Always keep backups of your original
              files.
            </p>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              Limitation of Liability
            </h2>
            <p>
              ZapFile shall not be liable for any damages arising from the use
              of this service, including but not limited to data loss or
              corruption.
            </p>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              Changes
            </h2>
            <p>
              We reserve the right to modify these terms at any time. Continued
              use of the service constitutes acceptance of the updated terms.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
