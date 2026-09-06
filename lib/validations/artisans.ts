import { z } from "zod"
import { uuidish } from "./uuid"

export const assignmentSchema = z.object({
  artisan_id: uuidish("Artisan is required"),
  order_item_id: uuidish("Order item is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  rate: z.coerce.number().min(0, "Rate must be 0 or more").nullable().optional(),
  expected_delivery_date: z.string().nullable().optional(),
  actual_delivery_date: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export const artisanSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email("Invalid email").nullable().optional().or(z.literal("")),
  location: z.string().max(200).nullable().optional(),
  specializations: z.string().max(500).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export type ArtisanFormValues = z.infer<typeof artisanSchema>
export type AssignmentFormValues = z.infer<typeof assignmentSchema>
