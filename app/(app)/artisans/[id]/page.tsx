import { getArtisan } from "@/lib/actions/artisans"
import { ArtisanDetailClient } from "@/features/artisans/artisan-detail-client"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ArtisanDetailPage({ params }: Props) {
  const { id } = await params
  const artisan = await getArtisan(id)
  if (!artisan) notFound()
  return <ArtisanDetailClient artisan={artisan} />
}
