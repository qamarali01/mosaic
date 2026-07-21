import { z } from "zod"

export const customerSchema = z.object({
  name: z.string().min(1, "Company name is required").max(200),
  currency: z.string().min(3).max(3).default("USD"),
  payment_terms: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(50).nullable().optional(),
  title: z.string().max(100).nullable().optional(),
  is_primary: z.boolean().default(false),
})

export const addressSchema = z.object({
  type: z.enum(["billing", "shipping"]),
  address_line1: z.string().min(1).max(200),
  address_line2: z.string().max(200).nullable().optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).nullable().optional(),
  postal_code: z.string().max(20).nullable().optional(),
  country: z.string().min(1).max(100),
})

export type CustomerFormValues = z.infer<typeof customerSchema>
export type ContactFormValues = z.infer<typeof contactSchema>
export type AddressFormValues = z.infer<typeof addressSchema>
