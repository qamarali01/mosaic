import { z } from "zod"

export const mappingSchema = z.object({
  customer_sku: z.string().min(1, "Customer SKU is required").max(100),
  customer_description: z.string().max(500).nullable().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  currency: z.string().min(3).max(3).default("USD"),
  moq: z.coerce.number().int().min(0).nullable().optional(),
  lead_time: z.string().max(100).nullable().optional(),
  packaging_notes: z.string().max(500).nullable().optional(),
})

export type MappingFormValues = z.infer<typeof mappingSchema>
