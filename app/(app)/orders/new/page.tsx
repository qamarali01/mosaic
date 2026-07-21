import { getAllCustomers } from "@/lib/actions/customers"
import { OrderBuilder } from "@/features/orders/order-builder"

export default async function NewOrderPage() {
  const customers = await getAllCustomers()
  return <OrderBuilder customers={customers} />
}
