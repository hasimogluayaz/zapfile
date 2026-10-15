import { parseLocalizedToolPath } from "./localized-routes";

/**
 * Tool catalog slug from pathname: always the first segment after `/tools/`.
 * Handles nested routes like `/tools/convert-image/jpg-to-png` → `convert-image`
 * and localized ones like `/tr/pdf-birlestir` → `merge-pdf`.
 */
export function toolSlugFromPathname(pathname: string | null | undefined): string {
  if (!pathname) return "";
  const localized = parseLocalizedToolPath(pathname);
  if (localized) return localized.slug;
  const parts = pathname.split("/").filter(Boolean);
  const i = parts.indexOf("tools");
  if (i === -1) return parts[parts.length - 1] ?? "";
  return parts[i + 1] ?? "";
}
