import { z } from "zod"
import { uuidish } from "./uuid"

export const quoteItemSchema = z.object({
  product_id: uuidish("Product is required"),
  customer_sku: z.string().min(1, "Customer SKU is required"),
  customer_description: z.string().nullable().optional(),
  unit_price: z.coerce.number().min(0),
  currency: z.string().min(3).max(3),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  moq: z.coerce.number().int().min(0).nullable().optional(),
  lead_time: z.string().max(100).nullable().optional(),
})

export const quoteSchema = z.object({
  customer_id: uuidish("Customer is required"),
  notes: z.string().max(2000).nullable().optional(),
  valid_until: z.string().nullable().optional(),
  items: z.array(quoteItemSchema).min(1, "At least one item is required"),
})

export type QuoteItemFormValues = z.infer<typeof quoteItemSchema>
export type QuoteFormValues = z.infer<typeof quoteSchema>
