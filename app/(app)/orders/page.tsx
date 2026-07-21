import { getOrders } from "@/lib/actions/orders"
import { OrdersClient } from "@/features/orders/orders-client"

export default async function OrdersPage() {
  const { data: orders } = await getOrders({ pageSize: 100, status: "all" })
  return <OrdersClient orders={orders} />
}
