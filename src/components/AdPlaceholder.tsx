export default function AdPlaceholder({ position }: { position: "top" | "bottom" | "sidebar" }) {
  return (
    <div
      className="w-full my-4"
      style={{ minHeight: position === "sidebar" ? "250px" : "90px" }}
      data-ad-slot={`zapfile-${position}`}
      aria-hidden="true"
    />
  );
}
