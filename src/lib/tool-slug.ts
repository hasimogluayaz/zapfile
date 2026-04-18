/**
 * Tool catalog slug from pathname: always the first segment after `/tools/`.
 * Handles nested routes like `/tools/convert-image/jpg-to-png` → `convert-image`.
 */
export function toolSlugFromPathname(pathname: string | null | undefined): string {
  if (!pathname) return "";
  const parts = pathname.split("/").filter(Boolean);
  const i = parts.indexOf("tools");
  if (i === -1) return parts[parts.length - 1] ?? "";
  return parts[i + 1] ?? "";
}
