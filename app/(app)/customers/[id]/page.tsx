import { getCustomer, getMappingsByCustomer } from "@/lib/actions/customers"
import { getProducts } from "@/lib/actions/products"
import { CustomerDetailClient } from "@/features/customers/customer-detail-client"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params
  const [customer, mappings, { data: products }] = await Promise.all([
    getCustomer(id),
    getMappingsByCustomer(id),
    getProducts({ pageSize: 500, status: "active" }),
  ])

  if (!customer) notFound()

  return <CustomerDetailClient customer={customer} mappings={mappings} products={products} />
}
