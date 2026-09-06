import { z } from "zod"
import { uuidish } from "./uuid"

export const productSchema = z.object({
  internal_sku: z.string().min(1, "SKU is required").max(100),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  collection_id: uuidish().nullable().optional(),
})

export type ProductFormValues = z.infer<typeof productSchema>
