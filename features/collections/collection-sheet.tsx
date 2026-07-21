"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Collection } from "@/types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploader } from "@/components/shared/image-uploader"
import { createCollection, updateCollection } from "@/lib/actions/collections"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface CollectionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collection?: Collection | null
  onSuccess: () => void
}

export function CollectionSheet({
  open,
  onOpenChange,
  collection,
  onSuccess,
}: CollectionSheetProps) {
  const [coverImageUrl, setCoverImageUrl] = useState(collection?.cover_image_url ?? "")
  const [coverImagePath, setCoverImagePath] = useState(collection?.cover_image_path ?? "")
  const [isPending, startTransition] = useTransition()
  const isEditing = !!collection

  // Reset image state when collection changes
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setCoverImageUrl(collection?.cover_image_url ?? "")
      setCoverImagePath(collection?.cover_image_path ?? "")
    }
    onOpenChange(open)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    if (coverImageUrl) formData.set("cover_image_url", coverImageUrl)
    if (coverImagePath) formData.set("cover_image_path", coverImagePath)

    startTransition(async () => {
      const result = isEditing
        ? await updateCollection(collection.id, formData)
        : await createCollection(formData)

      if (result.success) {
        toast.success(isEditing ? "Collection updated" : "Collection created")
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
          <SheetTitle>{isEditing ? "Edit Collection" : "New Collection"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update collection details." : "Create a new product collection."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={collection?.name ?? ""}
              placeholder="e.g. Summer 2026"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={collection?.description ?? ""}
              placeholder="Optional description..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cover Image</Label>
            <ImageUploader
              bucket="collection-images"
              folder="covers"
              value={coverImageUrl || null}
              onChange={(url, path) => { setCoverImageUrl(url); setCoverImagePath(path) }}
              onRemove={() => { setCoverImageUrl(""); setCoverImagePath("") }}
              aspectRatio="landscape"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
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
