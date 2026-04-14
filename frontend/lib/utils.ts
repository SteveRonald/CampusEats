import { OrderStatus } from "@/lib/types";

export function parseApiDate(value: string): Date {
  if (!value) return new Date(value);

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const hasTimeZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized);

  return new Date(hasTimeZone ? normalized : `${normalized}Z`);
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
