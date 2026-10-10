import type { Config } from "tailwindcss";

const config: Config = {
  // Follow the app's theme toggle (data-theme on <html>), not the OS setting.
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg-rgb) / <alpha-value>)",
        "bg-secondary": "rgb(var(--bg-secondary-rgb) / <alpha-value>)",
        "bg-tertiary": "rgb(var(--bg-tertiary-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        "surface-hover": "rgb(var(--surface-hover-rgb) / <alpha-value>)",
        border: "rgb(var(--border-rgb) / <alpha-value>)",
        "border-light": "rgb(var(--border-light-rgb) / <alpha-value>)",
        "t-primary": "rgb(var(--text-primary-rgb) / <alpha-value>)",
        "t-secondary": "rgb(var(--text-secondary-rgb) / <alpha-value>)",
        "t-tertiary": "rgb(var(--text-tertiary-rgb) / <alpha-value>)",
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        "accent-hover": "rgb(var(--accent-hover-rgb) / <alpha-value>)",
        "accent-light": "var(--accent-light)",
        "accent-muted": "var(--accent-muted)",
        "on-accent": "rgb(var(--on-accent-rgb) / <alpha-value>)",
        volt: "rgb(var(--volt-rgb) / <alpha-value>)",
        "volt-ink": "rgb(var(--volt-ink-rgb) / <alpha-value>)",
        ink: "#16181d",
        // Legacy aliases
        brand: {
          bg: "var(--bg)",
          card: "var(--surface)",
          text: "var(--text-primary)",
          muted: "var(--text-secondary)",
          indigo: "rgb(var(--accent-rgb) / <alpha-value>)",
          purple: "rgb(var(--accent-rgb) / <alpha-value>)",
          yellow: "rgb(var(--volt-rgb) / <alpha-value>)",
        },
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        panel: "var(--shadow-md)",
        float: "var(--shadow-lg)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "fade-up": "fade-up 0.5s ease-out",
        "pop-in": "pop-in 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(-6px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
