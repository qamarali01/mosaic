import { supabase } from "../supabase.js"

/**
 * When an order is created from a quote, mark the quote as accepted.
 */
export async function onOrderCreated(orderId: string, quoteId: string | null): Promise<void> {
  if (!quoteId) return
  await supabase.from("quotes").update({ status: "accepted" }).eq("id", quoteId)
}

/**
 * When an assignment status transitions to in_progress,
 * auto-promote the parent order from confirmed → in_production.
 */
export async function onAssignmentStatusChanged(
  orderId: string,
  newStatus: string
): Promise<void> {
  if (newStatus !== "in_progress") return

  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single()

  if (order?.status === "confirmed") {
    await supabase
      .from("orders")
      .update({ status: "in_production" })
      .eq("id", orderId)
  }
}
