"use client"

import { useState, useTransition } from "react"
import { Artisan } from "@/types"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createArtisan, updateArtisan } from "@/lib/actions/artisans"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface ArtisanSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artisan?: Artisan | null
  onSuccess: () => void
}

export function ArtisanSheet({ open, onOpenChange, artisan, onSuccess }: ArtisanSheetProps) {
  const [isPending, startTransition] = useTransition()
  const isEditing = !!artisan

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = isEditing
        ? await updateArtisan(artisan.id, formData)
        : await createArtisan(formData)

      if (result.success) {
        toast.success(isEditing ? "Artisan updated" : "Artisan created")
        onSuccess()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEditing ? "Edit Artisan" : "New Artisan"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update artisan details." : "Add a new artisan to your network."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={artisan?.name ?? ""}
              placeholder="e.g. Ravi Kumar"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={artisan?.phone ?? ""}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={artisan?.email ?? ""}
                placeholder="ravi@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Location / Workshop</Label>
            <Input
              id="location"
              name="location"
              defaultValue={artisan?.location ?? ""}
              placeholder="e.g. Jaipur, Rajasthan"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="specializations">Specializations</Label>
            <Input
              id="specializations"
              name="specializations"
              defaultValue={artisan?.specializations ?? ""}
              placeholder="e.g. Block printing, Embroidery"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={artisan?.notes ?? ""}
              placeholder="Capacity, materials, payment preferences..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Artisan"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
