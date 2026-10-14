"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PackageCheck, Plus, Search } from "lucide-react"
import type { OrderWithRelations } from "@/types"
import type { ShipmentListItem } from "@/lib/actions/shipment-ui"
import { getOrders } from "@/lib/actions/orders"
import { createShipment } from "@/lib/actions/shipment-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { toast } from "sonner"

type CustomerOption = { id: string; name: string }

export function ShipmentsClient({ shipments, customers }: { shipments: ShipmentListItem[]; customers: CustomerOption[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const filtered = useMemo(() => shipments.filter((shipment) => `${shipment.shipment_number} ${shipment.customer?.name ?? ""}`.toLowerCase().includes(search.toLowerCase())), [shipments, search])
  return <>
    <PageHeader title="Shipments" description="Group orders for one consignee and prepare export documents.">
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New shipment</Button>
    </PageHeader>
    <div className="px-6 py-4 border-b border-border"><div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search shipments..." className="pl-9" /></div></div>
    {filtered.length === 0 ? <EmptyState icon={PackageCheck} title="No shipments yet" description="Create a shipment when one or more orders are ready to dispatch." action={{ label: "New shipment", onClick: () => setOpen(true) }} /> : <div className="p-6 grid gap-3">{filtered.map((shipment) => <button key={shipment.id} onClick={() => router.push(`/shipments/${shipment.id}`)} className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"><div className="flex items-center justify-between gap-3"><div><p className="font-mono font-medium">{shipment.shipment_number}</p><p className="text-sm text-muted-foreground mt-1">{shipment.customer?.name} · {shipment.order_count} order{shipment.order_count === 1 ? "" : "s"} · {shipment.carton_count} carton{shipment.carton_count === 1 ? "" : "s"}</p></div><StatusBadge status={shipment.status} /></div></button>)}</div>}
    <CreateShipmentDialog open={open} onOpenChange={setOpen} customers={customers} />
  </>
}

function CreateShipmentDialog({ open, onOpenChange, customers }: { open: boolean; onOpenChange: (open: boolean) => void; customers: CustomerOption[] }) {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderWithRelations[]>([])
  const [customerId, setCustomerId] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [pending, startTransition] = useTransition()
  async function selectCustomer(value: string) { setCustomerId(value); setSelected([]); const result = await getOrders({ pageSize: 100, status: "all" }); setOrders(result.data.filter((order) => order.customer_id === value && !order.shipments?.length)) }
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(async () => { const result = await createShipment({ shipment_number: String(data.get("shipment_number")), customer_id: customerId, order_ids: selected, transport_mode: String(data.get("transport_mode") || "") || null, shipment_date: String(data.get("shipment_date") || "") || null, place_of_receipt: String(data.get("place_of_receipt") || "") || null, port_of_loading: String(data.get("port_of_loading") || "") || null, port_of_discharge: String(data.get("port_of_discharge") || "") || null, final_destination: String(data.get("final_destination") || "") || null }); if (!result.success) { toast.error(result.error); return } toast.success("Shipment created"); onOpenChange(false); router.push(`/shipments/${result.data.id}`) }) }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Create shipment</DialogTitle><DialogDescription>Choose one consignee and the orders travelling together.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><div className="grid sm:grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor="shipment_number">Shipment number *</Label><Input id="shipment_number" name="shipment_number" placeholder="e.g. SH-2026-001" required /></div><div className="space-y-1.5"><Label>Consignee *</Label><Select value={customerId} onValueChange={selectCustomer} required><SelectTrigger><SelectValue placeholder="Choose consignee" /></SelectTrigger><SelectContent>{customers.length > 0 ? customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>) : <SelectItem value="no-customers" disabled>No active customers found</SelectItem>}</SelectContent></Select>{customers.length > 0 && <p className="text-xs text-muted-foreground">{customers.length} active customers available</p>}</div></div><div className="space-y-2"><Label>Orders in this shipment *</Label>{!customerId ? <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">Choose a consignee to see eligible orders.</p> : orders.length === 0 ? <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No unassigned orders for this consignee.</p> : <div className="max-h-48 overflow-auto rounded-lg border border-border divide-y divide-border">{orders.map((order) => <label key={order.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/30"><input type="checkbox" checked={selected.includes(order.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, order.id] : current.filter((id) => id !== order.id))} /><span className="flex-1"><span className="block text-sm font-mono font-medium">{order.order_number}</span><span className="block text-xs text-muted-foreground">{order.items?.length ?? 0} line items · {order.status.replace("_", " ")}</span></span><StatusBadge status={order.status} /></label>)}</div>}</div><div className="grid sm:grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor="transport_mode">Transport mode</Label><Input id="transport_mode" name="transport_mode" placeholder="Sea, air, courier..." /></div><div className="space-y-1.5"><Label htmlFor="shipment_date">Shipment date</Label><Input id="shipment_date" name="shipment_date" type="date" /></div></div><details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-medium">More shipment details</summary><div className="grid sm:grid-cols-2 gap-4 pt-4"><Input name="place_of_receipt" placeholder="Place of receipt" /><Input name="port_of_loading" placeholder="Port of loading" /><Input name="port_of_discharge" placeholder="Port of discharge" /><Input name="final_destination" placeholder="Final destination" /></div></details><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={pending || !customerId || selected.length === 0}>{pending ? "Creating..." : "Create shipment"}</Button></DialogFooter></form></DialogContent></Dialog>
}
