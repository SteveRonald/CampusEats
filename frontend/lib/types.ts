export type Role = "student" | "vendor" | "admin";

export type OrderStatus = "pending" | "paid" | "preparing" | "ready" | "completed";

export interface SessionProfile {
  role: Role;
  userId: number;
  publicId?: string;
  vendorId?: number;
  name: string;
  email: string;
  phone?: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
  newPassword: string;
}

export interface UpdateProfilePayload {
  name: string;
  email: string;
  phone?: string;
}

export interface UpdateVendorProfilePayload {
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  stallName: string;
  description?: string;
  mpesaNumber: string;
  location?: string;
  pickupTimeMin: number;
  pickupTimeMax: number;
}

export interface RegisterPayload {
  role: "student" | "vendor";
  name: string;
  email: string;
  phone?: string;
  password: string;
  stallName?: string;
  description?: string;
  mpesaNumber?: string;
  imageUrl?: string;
  location?: string;
  pickupTimeMin?: number;
  pickupTimeMax?: number;
}

export interface AuthResponse {
  token: string;
  profile: SessionProfile;
}

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

export interface CartItem {
  menuItemId: number;
  vendorId: number;
  vendorName: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  menu_item_name: string;
  quantity: number;
  unit_price: string;
}

export interface OrderRecord {
  id: number;
  student_id: number | null;
  vendor_id: number;
  student_name: string;
  student_phone?: string | null;
  status: OrderStatus;
  total_amount: string;
  pickup_code: string;
  notes: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
  vendor_name: string;
  vendor_phone: string | null;
  vendor_location: string | null;
  pickup_time_min: number;
  pickup_time_max: number;
  items: OrderItem[];
}

export interface VendorBusinessProfile {
  id: number;
  user_id: number;
  stall_name: string;
  description: string | null;
  mpesa_number: string;
  image_url: string | null;
  location: string | null;
  pickup_time_min: number;
  pickup_time_max: number;
  is_active: boolean;
  owner_name: string;
  owner_email: string;
  owner_phone: string | null;
}

export interface VendorRecord {
  id: number;
  user_id: number;
  stall_name: string;
  description: string | null;
  mpesa_number: string;
  image_url: string | null;
  location: string | null;
  pickup_time_min: number;
  pickup_time_max: number;
  is_active: boolean;
}

export interface MenuItemRecord {
  id: number;
  vendor_id: number;
  name: string;
  description: string | null;
  price: string;
  category: string;
  image_url: string | null;
  is_available: boolean;
  order_count: number;
}
