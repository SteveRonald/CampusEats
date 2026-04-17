import { OrderStatus } from "@/lib/types";

export function parseApiDate(value: string): Date {
  if (!value) return new Date(value);

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const hasTimeZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized);

  if (hasTimeZone) {
    return new Date(normalized);
  }

  // Backend timestamps are often stored without timezone but represent Nairobi local time.
  // Convert that local wall clock time to a UTC instant so display stays correct across devices.
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);

  if (match) {
    const [, year, month, day, hour, minute, second = "0", millisecond = "0"] = match;
    const ms = millisecond.padEnd(3, "0");

    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 3, Number(minute), Number(second), Number(ms)));
  }

  return new Date(normalized);
}

export function formatKES(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Nairobi"
  }).format(parseApiDate(value));
}

export function formatRelativeTime(value: string): string {
  const diffMs = Date.now() - parseApiDate(value).getTime();
  const safeDiffMs = Number.isFinite(diffMs) ? Math.max(0, diffMs) : 0;
  const minutes = Math.floor(safeDiffMs / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h ${remMinutes}m ago` : `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric"
  }).format(parseApiDate(value));
}

export function formatOrderDateTime(value: string): string {
  return `${formatRelativeTime(value)} • ${formatDate(value)}`;
}

export function getStatusColor(status: OrderStatus | string): string {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "paid":
      return "bg-orange-100 text-orange-700";
    case "preparing":
      return "bg-amber-100 text-amber-700";
    case "ready":
      return "bg-green-100 text-green-700";
    case "completed":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function getStatusLabel(status: OrderStatus | string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "paid":
      return "Paid";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready for pickup";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}
