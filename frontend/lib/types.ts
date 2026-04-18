export type Role = "student" | "vendor" | "admin";
export type OrderType = "dine_in" | "delivery";
export type DeliveryMode = "hostel" | "off_campus" | "other";

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
  imageUrl?: string;
  locationProofImageUrl?: string;
  pickupTimeMin: number;
  pickupTimeMax: number;
}

export interface DeliveryDetailsPayload {
  mode: DeliveryMode;
  hostelId?: number;
  roomNumber?: string;
  serviceAreaId?: number;
  deliveryLocationId?: number;
  otherLocationName?: string;
  otherLocationDetails?: string;
  hostelName?: string;
  serviceAreaName?: string;
  deliveryLocationLabel?: string;
  deliveryLocation?: string;
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
  vendor_image_url?: string | null;
  pickup_time_min: number;
  pickup_time_max: number;
}

export interface ServiceArea {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Hostel {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface VendorDeliveryLocation {
  id: number;
  vendor_id: number;
  service_area_id: number | null;
  service_area_name: string | null;
  label: string;
  location: string;
  is_default: boolean;
}

export interface VendorDeliveryLocationRecommendation {
  id: number;
  vendor_id: number;
  source_order_id: number | null;
  service_area_id: number | null;
  service_area_name: string | null;
  place_name: string;
  place_details: string;
  status: "pending" | "accepted" | "ignored";
  accepted_location_id: number | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface VendorServiceArea extends ServiceArea {
  selected: boolean;
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
  menu_item_image_url?: string | null;
  quantity: number;
  unit_price: string;
}

export interface OrderRecord {
  id: number;
  public_id?: string;
  student_id: number | null;
  vendor_id: number;
  student_name: string;
  order_type: OrderType;
  student_phone?: string | null;
  status: OrderStatus;
  total_amount: string;
  pickup_code: string;
  pickup_location: string | null;
  delivery_details: DeliveryDetailsPayload | null;
  hostel_id: number | null;
  hostel_name?: string | null;
  room_number: string | null;
  service_area_id: number | null;
  service_area_name?: string | null;
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
  checkout_url?: string | null;
  payment_mode?: "test" | "live";
  last_callback_status?: string | null;
}

export interface PaymentModeInfo {
  mode: "test" | "live";
  configured: boolean;
  provider: "intasend";
}

export interface VendorBusinessProfile {
  id: number;
  user_id: number;
  stall_name: string;
  description: string | null;
  mpesa_number: string;
  image_url: string | null;
  location_proof_image_url: string | null;
  location: string | null;
  pickup_time_min: number;
  pickup_time_max: number;
  is_active: boolean;
  verification_status: "pending" | "approved" | "rejected";
  verification_notes: string | null;
  verified_at: string | null;
  verified_by: number | null;
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
  location_proof_image_url: string | null;
  location: string | null;
  pickup_time_min: number;
  pickup_time_max: number;
  is_active: boolean;
  verification_status: "pending" | "approved" | "rejected";
  verification_notes: string | null;
  verified_at: string | null;
  verified_by: number | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
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
  verification_status?: "pending" | "approved" | "rejected";
  verification_notes?: string | null;
  verified_at?: string | null;
  verified_by?: number | null;
  order_count: number;
}

export interface AdminMenuReviewRecord extends MenuItemRecord {
  vendor_name: string;
  vendor_image_url: string | null;
}

export interface AdminMenuReviewResponse {
  items: AdminMenuReviewRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
