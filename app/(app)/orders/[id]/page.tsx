import { getOrder } from "@/lib/actions/orders"
import { getAllCustomers } from "@/lib/actions/customers"
import { OrderBuilder } from "@/features/orders/order-builder"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const [order, customers] = await Promise.all([getOrder(id), getAllCustomers()])

  if (!order) notFound()

  return <OrderBuilder customers={customers} order={order} />
}
