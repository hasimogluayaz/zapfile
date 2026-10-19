import { notFound } from "next/navigation";

/** Deeper unknown URLs: without this, they'd get Next's bare 404 (there's no app-wide root layout). */
export default function UnknownPath() {
  notFound();
}
