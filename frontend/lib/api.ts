import { MenuItemRecord, OrderRecord, VendorRecord, MarketplaceItem } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorBody.error ?? "Request failed");
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const client = {
  marketplaceFeed: (search?: string, category?: string) =>
    api<{ items: MarketplaceItem[]; stats: { totalItems: number; totalVendors: number; avgPickupTime: number } }>(
      `/api/orders/marketplace/feed?${new URLSearchParams(
        Object.entries({ search: search ?? "", category: category ?? "" }).filter(([, value]) => value)
      ).toString()}`
    ),
  popularMeals: () => api<MarketplaceItem[]>("/api/orders/marketplace/popular"),
  categories: () => api<string[]>("/api/orders/marketplace/categories"),
  checkout: (payload: object) => api<OrderRecord>("/api/payments/checkout", { method: "POST", body: JSON.stringify(payload) }),
  studentOrders: (studentId: number) => api<OrderRecord[]>(`/api/orders?studentId=${studentId}`),
  order: (orderId: number) => api<OrderRecord>(`/api/orders/${orderId}`),
  updateOrderStatus: (orderId: number, status: string) =>
    api<OrderRecord>(`/api/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  vendorOrders: (vendorId: number) => api<OrderRecord[]>(`/api/vendors/${vendorId}/orders`),
  vendorOverview: (vendorId: number) =>
    api<{ ordersToday: number; earningsToday: number; pendingOrders: number; completedOrders: number; totalPayout: number }>(
      `/api/vendors/${vendorId}/earnings`
    ),
  vendorMenu: (vendorId: number) => api<MenuItemRecord[]>(`/api/vendors/${vendorId}/menu`),
  createMenuItem: (vendorId: number, payload: object) =>
    api<MenuItemRecord>(`/api/vendors/${vendorId}/menu`, { method: "POST", body: JSON.stringify(payload) }),
  updateMenuItem: (itemId: number, payload: object) =>
    api<MenuItemRecord>(`/api/vendors/menu/${itemId}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteMenuItem: (itemId: number) => api<{ success: boolean }>(`/api/vendors/menu/${itemId}`, { method: "DELETE" }),
  vendors: () => api<VendorRecord[]>("/api/vendors"),
  toggleVendor: (vendorId: number) => api<VendorRecord>(`/api/vendors/${vendorId}/toggle`, { method: "PATCH" }),
  adminSummary: () =>
    api<{ totalOrders: number; activeVendors: number; totalRevenue: number; totalCommission: number; ordersToday: number; transactionsToday: number }>(
      "/api/orders/admin/summary"
    ),
  adminOrders: () => api<OrderRecord[]>("/api/orders/admin/list"),
  transactions: () => api<Array<{ id: number; amount: string; commission: string; vendor_payout: string; status: string; created_at: string }>>("/api/payments/transactions")
};
