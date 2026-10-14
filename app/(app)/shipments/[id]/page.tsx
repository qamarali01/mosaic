import { notFound } from "next/navigation"
import { getShipmentWorkspace } from "@/lib/actions/shipment-ui"
import { ShipmentWorkspaceClient } from "@/features/shipments/shipment-workspace-client"

export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const shipment = await getShipmentWorkspace(id)
  if (!shipment) notFound()
  return <ShipmentWorkspaceClient shipment={shipment} />
}
