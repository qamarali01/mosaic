import { getProduct } from "@/lib/actions/products"
import { getMappingsByProduct } from "@/lib/actions/customers"
import { getAllCollections } from "@/lib/actions/collections"
import { ProductDetailClient } from "@/features/products/product-detail-client"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const [product, mappings, collections] = await Promise.all([
    getProduct(id),
    getMappingsByProduct(id),
    getAllCollections(),
  ])

  if (!product) notFound()

  return <ProductDetailClient product={product} mappings={mappings} collections={collections} />
}
