import { getOrder } from "@/lib/actions/orders"
import { getAllCustomers } from "@/lib/actions/customers"
import { getAllArtisans } from "@/lib/actions/artisans"
import { getActiveProducts } from "@/lib/actions/products"
import { getOrderActivity } from "@/lib/actions/export-documents"
import { OrderBuilder } from "@/features/orders/order-builder"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const [order, customers, artisans, activeProducts, activity] = await Promise.all([
    getOrder(id),
    getAllCustomers(),
    getAllArtisans(),
    getActiveProducts(),
    getOrderActivity(id),
  ])

  if (!order) notFound()

  return <OrderBuilder customers={customers} activeProducts={activeProducts} order={order} artisans={artisans} activity={activity} />
}
