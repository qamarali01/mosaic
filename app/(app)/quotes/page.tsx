import { getQuotes } from "@/lib/actions/quotes"
import { QuotesClient } from "@/features/quotes/quotes-client"

export default async function QuotesPage() {
  const { data: quotes } = await getQuotes({ pageSize: 100, status: "all" })
  return <QuotesClient quotes={quotes} />
}
