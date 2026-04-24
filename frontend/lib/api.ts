import {
  AuthResponse,
  ForgotPasswordPayload,
  PaymentModeInfo,
  LoginPayload,
  MenuItemRecord,
  Hostel,
  ServiceArea,
  OrderRecord,
  DeliveryDetailsPayload,
  RegisterPayload,
  UpdateProfilePayload,
  UpdateVendorProfilePayload,
  VendorBusinessProfile,
  VendorDeliveryLocation,
  VendorDeliveryLocationRecommendation,
  VendorServiceArea,
  VendorRecord,
  MarketplaceItem,
  AdminMenuReviewRecord,
  AdminMenuReviewResponse
} from "@/lib/types";

function resolveApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }

  return "http://localhost:4000";
}

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("campuseats_token");
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const apiUrl = resolveApiUrl();

  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
        ...(init?.headers ?? {})
      },
      cache: "no-store"
    });
  } catch (_error) {
    throw new Error("Unable to reach CampusEats right now. Check your connection and try again.");
  }

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
  register: (payload: RegisterPayload) => api<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: LoginPayload) => api<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  adminLogin: (payload: LoginPayload) => api<AuthResponse>("/api/auth/admin/login", { method: "POST", body: JSON.stringify(payload) }),
  forgotPassword: (payload: ForgotPasswordPayload) =>
    api<{ success: boolean; message: string }>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify(payload) }),
  me: () =>
    api<{ profile: { role: "student" | "vendor" | "admin"; userId: number; vendorId?: number; name: string; email: string; phone?: string | null } }>(
      "/api/auth/me"
    ),
  updateProfile: (payload: UpdateProfilePayload) => api<{ profile: AuthResponse["profile"] }>("/api/auth/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  marketplaceFeed: (search?: string, category?: string, serviceAreaId?: number) =>
    api<{ items: MarketplaceItem[]; stats: { totalItems: number; totalVendors: number; avgPickupTime: number } }>(
      `/api/orders/marketplace/feed?${new URLSearchParams(
        Object.entries({ search: search ?? "", category: category ?? "", serviceAreaId: serviceAreaId ? String(serviceAreaId) : "" }).filter(([, value]) => value)
      ).toString()}`
    ),
  popularMeals: () => api<MarketplaceItem[]>("/api/orders/marketplace/popular"),
  categories: () => api<string[]>("/api/orders/marketplace/categories"),
  checkout: (payload: {
    vendorId: number;
    studentName?: string;
    notes?: string;
    items: Array<{ menuItemId: number; quantity: number }>;
    orderType?: "dine_in" | "delivery";
    deliveryDetails?: DeliveryDetailsPayload | null;
  }) => api<OrderRecord>("/api/payments/checkout", { method: "POST", body: JSON.stringify(payload) }),
    paymentMode: () => api<PaymentModeInfo>("/api/payments/mode"),
  studentOrders: () => api<OrderRecord[]>("/api/orders"),
  order: (orderId: number | string) => api<OrderRecord>(`/api/orders/${orderId}`),
  updateOrderStatus: (orderId: number, status: string) =>
    api<OrderRecord>(`/api/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  vendorOrders: (vendorId: number) => api<OrderRecord[]>(`/api/vendors/${vendorId}/orders`),
  vendorProfile: (vendorId: number) => api<VendorBusinessProfile>(`/api/vendors/${vendorId}/profile`),
  vendorServiceAreas: (vendorId: number) => api<VendorServiceArea[]>(`/api/vendors/${vendorId}/service-areas`),
  updateVendorServiceAreas: (vendorId: number, serviceAreaIds: number[]) =>
    api<VendorServiceArea[]>(`/api/vendors/${vendorId}/service-areas`, { method: "PUT", body: JSON.stringify({ serviceAreaIds }) }),
  vendorDeliveryLocations: (vendorId: number, serviceAreaId?: number) =>
    api<VendorDeliveryLocation[]>(
      `/api/vendors/${vendorId}/delivery-locations${serviceAreaId ? `?serviceAreaId=${serviceAreaId}` : ""}`
    ),
  vendorDeliveryLocationRecommendations: (vendorId: number) =>
    api<VendorDeliveryLocationRecommendation[]>(`/api/vendors/${vendorId}/delivery-location-recommendations`),
  acceptVendorDeliveryLocationRecommendation: (recommendationId: number, serviceAreaId: number) =>
    api<{ success: boolean; acceptedLocationId: number }>(`/api/vendors/delivery-location-recommendations/${recommendationId}/accept`, {
      method: "POST",
      body: JSON.stringify({ serviceAreaId })
    }),
  ignoreVendorDeliveryLocationRecommendation: (recommendationId: number) =>
    api<{ success: boolean }>(`/api/vendors/delivery-location-recommendations/${recommendationId}/ignore`, { method: "POST" }),
  createVendorDeliveryLocation: (vendorId: number, payload: { serviceAreaId: number; label: string; location: string; isDefault?: boolean }) =>
    api<VendorDeliveryLocation>(`/api/vendors/${vendorId}/delivery-locations`, { method: "POST", body: JSON.stringify(payload) }),
  updateVendorDeliveryLocation: (locationId: number, payload: { serviceAreaId: number; label: string; location: string; isDefault?: boolean }) =>
    api<VendorDeliveryLocation>(`/api/vendors/delivery-locations/${locationId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteVendorDeliveryLocation: (locationId: number) => api<{ success: boolean }>(`/api/vendors/delivery-locations/${locationId}`, { method: "DELETE" }),
  updateVendorProfile: (vendorId: number, payload: UpdateVendorProfilePayload) =>
    api<VendorBusinessProfile>(`/api/vendors/${vendorId}/profile`, { method: "PATCH", body: JSON.stringify(payload) }),
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
  serviceAreas: () => api<ServiceArea[]>('/api/locations/service-areas'),
  hostels: () => api<Hostel[]>('/api/locations/hostels'),
  adminServiceAreas: () => api<ServiceArea[]>('/api/admin/service-areas'),
  createServiceArea: (name: string) => api<ServiceArea>('/api/admin/service-areas', { method: 'POST', body: JSON.stringify({ name }) }),
  updateServiceArea: (id: number, payload: { name: string; isActive?: boolean }) =>
    api<ServiceArea>(`/api/admin/service-areas/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteServiceArea: (id: number) => api<{ success: boolean }>(`/api/admin/service-areas/${id}`, { method: 'DELETE' }),
  adminHostels: () => api<Hostel[]>('/api/admin/hostels'),
  createHostel: (name: string) => api<Hostel>('/api/admin/hostels', { method: 'POST', body: JSON.stringify({ name }) }),
  updateHostel: (id: number, payload: { name: string; isActive?: boolean }) =>
    api<Hostel>(`/api/admin/hostels/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteHostel: (id: number) => api<{ success: boolean }>(`/api/admin/hostels/${id}`, { method: 'DELETE' }),
  vendors: () => api<VendorRecord[]>("/api/vendors"),
  toggleVendor: (vendorId: number) => api<VendorRecord>(`/api/vendors/${vendorId}/toggle`, { method: "PATCH" }),
  updateVendorVerification: (vendorId: number, payload: { status: "pending" | "approved" | "rejected"; notes?: string }) =>
    api<VendorRecord>(`/api/vendors/${vendorId}/verification`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminMenuReview: (
    search?: string,
    status?: "all" | "pending" | "approved" | "rejected",
    vendorId?: number,
    page = 1,
    pageSize = 12
  ) =>
    api<AdminMenuReviewResponse>(
      `/api/vendors/menu/review?${new URLSearchParams(
        Object.entries({
          search: search ?? "",
          status: status ?? "all",
          vendorId: vendorId ? String(vendorId) : "",
          page: String(page),
          pageSize: String(pageSize)
        }).filter(([, value]) => value)
      ).toString()}`
    ),
  updateMenuVerification: (itemId: number, payload: { status: "pending" | "approved" | "rejected"; notes?: string }) =>
    api<MenuItemRecord>(`/api/vendors/menu/${itemId}/verification`, { method: "PATCH", body: JSON.stringify(payload) }),
  publicContactInfo: () =>
    api<{ supportEmail: string; supportPhone: string; supportHours: string }>("/api/meta/contact"),
  adminSummary: () =>
    api<{ totalOrders: number; activeVendors: number; totalRevenue: number; totalCommission: number; ordersToday: number; transactionsToday: number }>(
      "/api/orders/admin/summary"
    ),
  adminOrders: () => api<OrderRecord[]>("/api/orders/admin/list"),
  ordersReport: (vendorId?: string | number, period?: "all" | "today" | "week" | "month" | "year") =>
    api<{
      orders: Array<{
        id: number;
        public_id: string;
        student_name: string;
        vendor_id: number;
        vendor_name: string;
        total_amount: string;
        transaction_amount: string;
        commission: string;
        vendor_payout: string;
        status: string;
        transaction_status: string;
        created_at: string;
        item_count: number;
      }>;
      summary: {
        total_orders: number;
        vendor_count: number;
        total_amount: string;
        total_revenue: string;
        total_commission: string;
        total_payout: string;
      };
    }>(
      `/api/orders/admin/reports?${new URLSearchParams(
        Object.entries({
          vendorId: vendorId ? String(vendorId) : "all",
          period: period ?? "all"
        }).filter(([, value]) => value)
      ).toString()}`
    ),
  transactions: () => api<Array<{ id: number; amount: string; commission: string; vendor_payout: string; status: string; created_at: string }>>("/api/payments/transactions")
};
