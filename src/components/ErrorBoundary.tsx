"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ZapFile] Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
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
            Something went wrong
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary, #555a6e)", margin: 0 }}>
            An unexpected error occurred. Please refresh the page and try again.
          </p>
          <button
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
            Refresh page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
