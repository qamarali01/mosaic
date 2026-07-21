import { getProduct } from "@/lib/actions/products"
import { getMappingsByProduct } from "@/lib/actions/customers"
import { getAllCollections } from "@/lib/actions/collections"
import { getAuditLogs } from "@/lib/actions/audit"
import { ProductDetailClient } from "@/features/products/product-detail-client"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const [product, mappings, collections, auditLogs] = await Promise.all([
    getProduct(id),
    getMappingsByProduct(id),
    getAllCollections(),
    getAuditLogs("products", id),
  ])

  if (!product) notFound()

  return <ProductDetailClient product={product} mappings={mappings} collections={collections} auditLogs={auditLogs} />
}
