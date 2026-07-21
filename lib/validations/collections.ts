import { z } from "zod"

export const collectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).nullable().optional(),
  cover_image_url: z.string().url().nullable().optional(),
  cover_image_path: z.string().nullable().optional(),
})

export type CollectionFormValues = z.infer<typeof collectionSchema>
