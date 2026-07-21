import { getQuote } from "@/lib/actions/quotes"
import { getAllCustomers } from "@/lib/actions/customers"
import { QuoteBuilder } from "@/features/quotes/quote-builder"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function QuoteDetailPage({ params }: Props) {
  const { id } = await params
  const [quote, customers] = await Promise.all([getQuote(id), getAllCustomers()])

  if (!quote) notFound()

  return <QuoteBuilder customers={customers} quote={quote} />
}
