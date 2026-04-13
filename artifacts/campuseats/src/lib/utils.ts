import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKES(amount: number | string): string {
  const num = Number(amount);
  return `KES ${num.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "pending": return "bg-gray-100 text-gray-700";
    case "paid": return "bg-blue-100 text-blue-700";
    case "preparing": return "bg-yellow-100 text-yellow-700";
    case "ready": return "bg-green-100 text-green-700";
    case "completed": return "bg-gray-100 text-gray-500";
    case "cancelled": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "Pending";
    case "paid": return "Paid";
    case "preparing": return "Preparing";
    case "ready": return "Ready for pickup";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}
