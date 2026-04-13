export type Role = "student" | "vendor" | "admin";

export type OrderStatus = "pending" | "paid" | "preparing" | "ready" | "completed";

export interface SessionProfile {
  role: Role;
  userId: number;
  vendorId?: number;
  name: string;
  email: string;
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
  status: OrderStatus;
  total_amount: string;
  pickup_code: string;
  notes: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
  vendor_name: string;
  vendor_location: string | null;
  pickup_time_min: number;
  pickup_time_max: number;
  items: OrderItem[];
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
