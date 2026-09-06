import { getArtisans } from "@/lib/actions/artisans"
import { ArtisansClient } from "@/features/artisans/artisans-client"

export default async function ArtisansPage() {
  const result = await getArtisans({ pageSize: 25, status: "all" })
  return <ArtisansClient artisans={result.data} />
}
