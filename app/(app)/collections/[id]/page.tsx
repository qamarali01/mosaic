import { getCollection } from "@/lib/actions/collections"
import { getProducts } from "@/lib/actions/products"
import { CollectionDetailClient } from "@/features/collections/collection-detail-client"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function CollectionDetailPage({ params }: Props) {
  const { id } = await params
  const [collection, { data: products }] = await Promise.all([
    getCollection(id),
    getProducts({ pageSize: 200, status: "all" }),
  ])

  if (!collection) notFound()

  const collectionProducts = products.filter((p) => p.collection_id === id)

  return <CollectionDetailClient collection={collection} products={collectionProducts} />
}
