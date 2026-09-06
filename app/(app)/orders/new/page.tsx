import { getAllCustomers } from "@/lib/actions/customers"
import { getActiveProducts } from "@/lib/actions/products"
import { OrderBuilder } from "@/features/orders/order-builder"

export default async function NewOrderPage() {
  const [customers, activeProducts] = await Promise.all([
    getAllCustomers(),
    getActiveProducts(),
  ])
  return <OrderBuilder customers={customers} activeProducts={activeProducts} />
}
