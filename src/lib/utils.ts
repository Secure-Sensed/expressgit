import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Not scheduled";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function formatRelativeTime(value?: string | null) {
  if (!value) return "Unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 60) {
    return diffMinutes >= 0 ? `in ${absMinutes} min` : `${absMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  const absHours = Math.abs(diffHours);
  if (absHours < 48) {
    return diffHours >= 0 ? `in ${absHours} hr` : `${absHours} hr ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  const absDays = Math.abs(diffDays);
  return diffDays >= 0 ? `in ${absDays} day${absDays === 1 ? "" : "s"}` : `${absDays} day${absDays === 1 ? "" : "s"} ago`;
}

export function formatStatusLabel(value?: string | null) {
  const normalized = String(value || "").replace(/[_-]+/g, " ").trim();
  if (!normalized) return "Unknown";
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function statusTone(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.includes("deliver")) return "success";
  if (normalized.includes("exception")) return "danger";
  if (normalized.includes("out for delivery")) return "accent";
  if (normalized.includes("pending") || normalized.includes("created")) return "muted";
  return "default";
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function formatPercent(value: number) {
  return `${Math.round(clamp(value, 0, 100))}%`;
}
