"use client";

import { useI18n } from "@/lib/i18n";

export default function ErrorFallback() {
  const { t } = useI18n();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
        background: "var(--bg, #f7f8fc)",
        color: "var(--text-primary, #1a1d2e)",
      }}
    >
      <span style={{ fontSize: "2.5rem" }}>⚠️</span>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
        {t("error.boundary.title")}
      </h2>
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--text-secondary, #555a6e)",
          margin: 0,
        }}
      >
        {t("error.boundary.message")}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          marginTop: "0.5rem",
          padding: "0.5rem 1.5rem",
          background: "#6366f1",
          color: "#fff",
          border: "none",
          borderRadius: "0.75rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {t("error.boundary.refresh")}
      </button>
    </div>
  );
}
