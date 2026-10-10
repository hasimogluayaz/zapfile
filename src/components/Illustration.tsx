/* eslint-disable @next/next/no-img-element */

export type IllustrationName = "no-results" | "favorites-empty" | "not-found";

/**
 * Brand spot illustrations (public/illustrations). Each has a light-theme file
 * and a "-dark" variant with light ink lines and the same yellow.
 */
export default function Illustration({
  name,
  size = 160,
  className = "",
}: {
  name: IllustrationName;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    "aria-hidden": true as const,
    loading: "lazy" as const,
    decoding: "async" as const,
  };
  return (
    <>
      <img
        {...common}
        alt=""
        src={`/illustrations/${name}.webp`}
        className={`mx-auto select-none dark:hidden ${className}`}
      />
      <img
        {...common}
        alt=""
        src={`/illustrations/${name}-dark.webp`}
        className={`mx-auto hidden select-none dark:block ${className}`}
      />
    </>
  );
}
