import { getAllCustomers } from "@/lib/actions/customers"
import { QuoteBuilder } from "@/features/quotes/quote-builder"

export default async function NewQuotePage() {
  const customers = await getAllCustomers()
  return <QuoteBuilder customers={customers} />
}
