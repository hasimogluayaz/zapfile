import type { Tool } from "./tools";

/**
 * Resolve tool title/description: i18n string, or stable English from catalog if key missing.
 * Never mixes locales — `t` must come from the same I18nProvider as the active locale.
 */
export function toolField(
  t: (key: string) => string,
  slug: string,
  tool: Tool,
  field: "name" | "desc",
): string {
  const key = `tool.${slug}.${field}`;
  const value = t(key);
  if (value === key) {
    return field === "name" ? tool.name : tool.description;
  }
  return value;
}
