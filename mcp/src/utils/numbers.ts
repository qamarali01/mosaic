import { supabase } from "../supabase.js"

/** Generate a quote number in Q-YYYY-NNNN format, retrying on collision. */
export async function generateQuoteNumber(maxRetries = 3): Promise<string> {
  const year = new Date().getFullYear()
  for (let i = 0; i < maxRetries; i++) {
    const num = Math.floor(1000 + Math.random() * 9000)
    const candidate = `Q-${year}-${num}`
    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("quote_number", candidate)
    if (count === 0) return candidate
  }
  throw new Error("Failed to generate a unique quote number after retries")
}

/** Generate an order number in O-YYYY-NNNN format, retrying on collision. */
export async function generateOrderNumber(maxRetries = 3): Promise<string> {
  const year = new Date().getFullYear()
  for (let i = 0; i < maxRetries; i++) {
    const num = Math.floor(1000 + Math.random() * 9000)
    const candidate = `O-${year}-${num}`
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("order_number", candidate)
    if (count === 0) return candidate
  }
  throw new Error("Failed to generate a unique order number after retries")
}
