import { z } from "zod"
import { uuidish } from "./uuid"

export const orderItemSchema = z.object({
  product_id: uuidish("Product is required"),
  customer_sku: z.string().min(1),
  customer_description: z.string().nullable().optional(),
  quantity: z.coerce.number().int().min(1),
  unit_price: z.coerce.number().min(0),
  currency: z.string().min(3).max(3),
})

export const orderSchema = z.object({
  customer_id: uuidish("Customer is required"),
  quote_id: uuidish().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
})

export type OrderItemFormValues = z.infer<typeof orderItemSchema>
export type OrderFormValues = z.infer<typeof orderSchema>
