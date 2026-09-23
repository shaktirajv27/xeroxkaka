// Database Entities and Types for Xerox/Printing Shop Platform

export type UserRole = 'shop_owner' | 'shop_staff' | 'platform_admin';
export type MemberRole = 'owner' | 'staff';

export type PaperSize = 'A4' | 'A3' | 'A5' | 'Legal' | 'Letter';
export type PrintColor = 'bw' | 'color';
export type PrintSide = 'single' | 'double';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'printing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type OrderPriority = 'normal' | 'urgent';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type PaymentMethod = 'cash' | 'upi' | 'other';

export interface Profile {
  id: string;
  user_id?: string;
  full_name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  owner_id?: string;
  shop_name: string;
  slug: string;
  phone: string;
  whatsapp_number?: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopMember {
  id: string;
  shop_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface PricingRule {
  id: string;
  shop_id: string;
  paper_size: PaperSize;
  print_color: PrintColor;
  print_side: PrintSide;
  price_per_page: number;
  created_at: string;
  updated_at: string;
}

export interface ShopService {
  id: string;
  shop_id: string;
  service_name: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopSettings {
  id: string;
  shop_id: string;
  auto_confirm: boolean;
  sound_enabled: boolean;
  retention_hours: number;
  opening_time: string;
  closing_time: string;
  currency_symbol: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  file_id?: string;
  file_name?: string;
  file_size?: number;
  paper_size: PaperSize;
  print_color: PrintColor;
  print_side: PrintSide;
  copies: number;
  page_range: string;
  calculated_pages: number;
  orientation: 'auto' | 'portrait' | 'landscape';
  scaling: 'fit' | 'actual';
  pages_per_sheet: number;
  binding_type?: string;
  binding_price: number;
  lamination_type?: string;
  lamination_price: number;
  price_per_page: number;
  item_total: number;
  created_at: string;
}

export interface UploadedFile {
  id: string;
  order_id?: string;
  shop_id: string;
  customer_id?: string;
  original_filename: string;
  storage_path: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  page_count: number;
  status: 'active' | 'deleted' | 'expired';
  preview_url?: string;
  data_url?: string; // For local/demo preview
  expires_at?: string;
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status?: OrderStatus;
  new_status: OrderStatus;
  changed_by: string;
  note?: string;
  timestamp: string;
}

export interface Order {
  id: string;
  shop_id: string;
  customer_id?: string;
  order_number: string;
  status: OrderStatus;
  priority: OrderPriority;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  customer_note?: string;
  shop_note?: string;
  estimated_ready_at?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  // Hydrated joins
  customer?: Customer;
  items?: OrderItem[];
  files?: UploadedFile[];
  history?: OrderStatusHistory[];
  shop?: Shop;
}
