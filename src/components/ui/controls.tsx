"use client";

/**
 * Shared form controls in the Voltage style, so every tool feels the same.
 */
import type { ReactNode } from "react";

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  value: T;
  options: { value: T; label: ReactNode; icon?: ReactNode; disabled?: boolean; title?: string }[];
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div className="segmented max-w-full overflow-x-auto" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] font-medium transition-colors disabled:opacity-40 ${
            size === "sm" ? "px-2.5 py-1.5 text-[13px]" : "px-3.5 py-2 text-[14px]"
          } ${value === o.value ? "bg-surface text-t-primary shadow-sm" : "text-t-secondary hover:text-t-primary"}`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-6 w-10 rounded-full bg-bg-tertiary transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-volt" />
        <span className="absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-t-primary">{label}</span>
        {description && <span className="mt-0.5 block text-[12.5px] leading-snug text-t-tertiary">{description}</span>}
      </span>
    </label>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
  hints,
  className = "",
  disabled,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display?: ReactNode;
  hints?: [ReactNode, ReactNode];
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-50" : ""} ${className}`}>
      <span className="mb-1.5 flex items-center justify-between gap-3 text-[13px] text-t-secondary">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-t-primary">{display ?? value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
      {hints && (
        <span className="mt-0.5 flex justify-between text-[11.5px] text-t-tertiary">
          <span>{hints[0]}</span>
          <span>{hints[1]}</span>
        </span>
      )}
    </label>
  );
}

export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-[15px] font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40";
export const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[14px] font-medium text-t-primary transition hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-40";
export const sectionTitle = "text-[12.5px] font-semibold uppercase tracking-[0.06em] text-t-tertiary";
