import { getShipments } from "@/lib/actions/shipment-ui"
import { getAllCustomers } from "@/lib/actions/customers"
import { ShipmentsClient } from "@/features/shipments/shipments-client"

export default async function ShipmentsPage() {
  const [shipments, customers] = await Promise.all([getShipments(), getAllCustomers()])
  return <ShipmentsClient shipments={shipments} customers={customers.map((customer) => ({ id: customer.id, name: customer.name }))} />
}
