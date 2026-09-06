// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "sales" | "viewer"
export type RecordStatus = "active" | "archived"
export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected"
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled"
export type AddressType = "billing" | "shipping"
export type AuditAction = "create" | "update" | "archive" | "restore"

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  role: UserRole
  full_name: string | null
  email: string | null
  created_at: string
}

// ─── Collection ──────────────────────────────────────────────────────────────

export interface Collection {
  id: string
  name: string
  description: string | null
  cover_image_url: string | null
  cover_image_path: string | null
  status: RecordStatus
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface CollectionWithCount extends Collection {
  product_count: number
}

// ─── Product ─────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  internal_sku: string
  name: string
  description: string | null
  collection_id: string | null
  status: RecordStatus
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface ProductWithRelations extends Product {
  collection: Collection | null
  images: ProductImage[]
  documents: ProductDocument[]
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  storage_path: string
  sort_order: number
  created_at: string
}

export interface ProductDocument {
  id: string
  product_id: string
  name: string
  url: string
  storage_path: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

// ─── Customer ────────────────────────────────────────────────────────────────

export interface Customer {
  id: string
  name: string
  currency: string
  payment_terms: string | null
  notes: string | null
  status: RecordStatus
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface CustomerContact {
  id: string
  customer_id: string
  name: string
  email: string | null
  phone: string | null
  title: string | null
  is_primary: boolean
  created_at: string
}

export interface CustomerAddress {
  id: string
  customer_id: string
  type: AddressType
  address_line1: string
  address_line2: string | null
  city: string
  state: string | null
  postal_code: string | null
  country: string
  created_at: string
}

export interface CustomerWithRelations extends Customer {
  contacts: CustomerContact[]
  addresses: CustomerAddress[]
}

// ─── Customer Product Mapping ─────────────────────────────────────────────────

export interface CustomerProductMapping {
  id: string
  customer_id: string
  product_id: string
  customer_sku: string
  customer_description: string | null
  price: number
  currency: string
  moq: number | null
  lead_time: string | null
  packaging_notes: string | null
  created_at: string
  updated_at: string
}

export interface CustomerProductMappingWithRelations
  extends CustomerProductMapping {
  customer: Customer
  product: Product
}

// ─── Quote ───────────────────────────────────────────────────────────────────

export interface Quote {
  id: string
  quote_number: string
  customer_id: string
  status: QuoteStatus
  notes: string | null
  valid_until: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface QuoteItem {
  id: string
  quote_id: string
  product_id: string
  customer_sku: string
  customer_description: string | null
  unit_price: number
  currency: string
  quantity: number
  moq: number | null
  lead_time: string | null
  sort_order: number
}

export interface QuoteWithRelations extends Quote {
  customer: Customer
  items: QuoteItemWithProduct[]
}

export interface QuoteItemWithProduct extends QuoteItem {
  product: Product
}

// ─── Order ───────────────────────────────────────────────────────────────────

export interface Order {
  id: string
  order_number: string
  customer_id: string
  quote_id: string | null
  status: OrderStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  customer_sku: string
  customer_description: string | null
  quantity: number
  unit_price: number
  currency: string
  sort_order: number
}

export interface OrderWithRelations extends Order {
  customer: Customer
  quote: Quote | null
  items: OrderItemWithProduct[]
}

export interface OrderItemWithProduct extends OrderItem {
  product: Product
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: AuditAction
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  performed_by: string | null
  performed_by_name: string | null
  performed_at: string
}

// ─── Artisan ─────────────────────────────────────────────────────────────────

export type AssignmentStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled"

export interface Artisan {
  id: string
  name: string
  phone: string | null
  email: string | null
  location: string | null
  specializations: string | null
  notes: string | null
  status: RecordStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ArtisanAssignment {
  id: string
  order_id: string
  order_item_id: string
  artisan_id: string
  quantity: number
  rate: number | null
  status: AssignmentStatus
  expected_delivery_date: string | null
  actual_delivery_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ArtisanAssignmentWithRelations extends ArtisanAssignment {
  artisan: Artisan
  order: Pick<Order, "id" | "order_number" | "status">
  order_item: OrderItemWithProduct
}

// ─── Server Action Result ─────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  search?: string
  status?: RecordStatus | "all"
}

// ─── MCP API Keys ─────────────────────────────────────────────────────────────

export interface McpApiKey {
  id: string
  user_id: string
  name: string
  key_hash: string
  role: UserRole
  last_used_at: string | null
  created_at: string
}
