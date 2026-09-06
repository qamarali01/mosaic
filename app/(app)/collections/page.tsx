import { getCollections } from "@/lib/actions/collections"
import { CollectionsClient } from "@/features/collections/collections-client"

export default async function CollectionsPage() {
  const { data: collections } = await getCollections({ pageSize: 25, status: "all" })

  return <CollectionsClient collections={collections} />
}
