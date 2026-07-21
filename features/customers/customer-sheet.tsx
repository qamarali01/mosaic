"use client"

import { useTransition } from "react"
import { Customer } from "@/types"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createCustomer, updateCustomer } from "@/lib/actions/customers"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useState } from "react"

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "CAD", "AUD", "JPY", "CNY", "SGD"]

interface CustomerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  onSuccess: () => void
}

export function CustomerSheet({ open, onOpenChange, customer, onSuccess }: CustomerSheetProps) {
  const [currency, setCurrency] = useState(customer?.currency ?? "USD")
  const [isPending, startTransition] = useTransition()
  const isEditing = !!customer

  const handleOpenChange = (open: boolean) => {
    if (open) setCurrency(customer?.currency ?? "USD")
    onOpenChange(open)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("currency", currency)

    startTransition(async () => {
      const result = isEditing
        ? await updateCustomer(customer.id, formData)
        : await createCustomer(formData)

      if (result.success) {
        toast.success(isEditing ? "Customer updated" : "Customer created")
        onSuccess()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEditing ? "Edit Customer" : "New Customer"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update customer details." : "Add a new customer."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">Company Name *</Label>
            <Input id="name" name="name" defaultValue={customer?.name ?? ""} placeholder="e.g. Acme Corp" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Input id="payment_terms" name="payment_terms" defaultValue={customer?.payment_terms ?? ""} placeholder="e.g. Net 30" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={customer?.notes ?? ""} placeholder="Internal notes..." rows={3} className="resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save changes" : "Create"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
