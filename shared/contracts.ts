export const CAMPUS_EATS_COLORS = {
  primary: "#F97316",
  secondary: "#16A34A",
  accent: "#FACC15",
  danger: "#EF4444",
  background: "#F9FAFB",
  card: "#FFFFFF",
  text: "#111827",
  textMuted: "#6B7280",
} as const;

export const ORDER_STATUSES = ["pending", "paid", "preparing", "ready", "completed"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type DemoRole = "student" | "vendor" | "admin";

export interface MarketplaceItem {
  id: number;
  vendor_id: number;
  name: string;
  description: string | null;
  price: string;
  category: string;
  image_url: string | null;
  is_available: boolean;
  order_count: number;
  vendor_name: string;
  vendor_location: string | null;
  pickup_time_min: number;
  pickup_time_max: number;
}
