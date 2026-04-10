import type { Metadata } from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about ZapFile - free, private, browser-based file tools. No uploads, no servers, no accounts needed.",
};

export default function AboutPage() {
  return <AboutClient />;
}
