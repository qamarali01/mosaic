"use client"

import { useState, useEffect, useTransition } from "react"
import { ProductWithRelations } from "@/types"

type CollectionOption = { id: string; name: string }
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { MultiImageUploader } from "@/components/shared/image-uploader"
import { FileUploader } from "@/components/shared/file-uploader"
import { createProduct, updateProduct } from "@/lib/actions/products"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface ProductSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: ProductWithRelations | null
  collections: CollectionOption[]
  onSuccess: () => void
}

interface ImageEntry {
  id?: string
  url: string
  storage_path: string
  sort_order: number
}

interface DocEntry {
  id?: string
  name: string
  url: string
  storage_path: string
  file_size: number | null
  mime_type: string | null
}

export function ProductSheet({
  open,
  onOpenChange,
  product,
  collections,
  onSuccess,
}: ProductSheetProps) {
  const [images, setImages] = useState<ImageEntry[]>([])
  const [documents, setDocuments] = useState<DocEntry[]>([])
  const [collectionId, setCollectionId] = useState<string>("none")
  const [isPending, startTransition] = useTransition()
  const isEditing = !!product

  // Sync state whenever the sheet opens or the target product changes
  useEffect(() => {
    const t = setTimeout(() => {
      if (open) {
        setImages(product?.images ?? [])
        setDocuments(product?.documents ?? [])
        setCollectionId(product?.collection_id ?? "none")
      } else {
        setImages([])
        setDocuments([])
        setCollectionId("none")
      }
    }, 0)
    return () => clearTimeout(t)
  }, [open, product])

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const payload = {
        internal_sku: fd.get("internal_sku") as string,
        name: fd.get("name") as string,
        description: (fd.get("description") as string) || null,
        collection_id: collectionId === "none" ? null : collectionId,
        images: images.map((img, i) => ({ url: img.url, storage_path: img.storage_path, sort_order: i })),
        documents,
      }

      const result = isEditing
        ? await updateProduct(product.id, payload)
        : await createProduct(payload)

      if (result.success) {
        toast.success(isEditing ? "Product updated" : "Product created")
        onSuccess()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEditing ? "Edit Product" : "New Product"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update product details." : "Add a new product to your catalog."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="internal_sku">Internal SKU *</Label>
              <Input
                id="internal_sku"
                name="internal_sku"
                defaultValue={product?.internal_sku ?? ""}
                placeholder="e.g. PRD-001"
                required
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Collection</Label>
              <Select value={collectionId} onValueChange={setCollectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={product?.name ?? ""}
              placeholder="e.g. Ceramic Mug — White 350ml"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={product?.description ?? ""}
              placeholder="Optional product description..."
              rows={3}
              className="resize-none"
            />
          </div>

          <Separator />

          {/* Images */}
          <div className="space-y-2">
            <Label>Images</Label>
            <MultiImageUploader
              bucket="product-images"
              folder={product?.id ?? "new"}
              images={images}
              onAdd={(url, path) =>
                setImages((prev) => [
                  ...prev,
                  { url, storage_path: path, sort_order: prev.length },
                ])
              }
              onRemove={(i) =>
                setImages((prev) => prev.filter((_, idx) => idx !== i))
              }
            />
          </div>

          <Separator />

          {/* Documents */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <FileUploader
              bucket="product-documents"
              folder={product?.id ?? "new"}
              files={documents}
              onAdd={(file) => setDocuments((prev) => [...prev, file])}
              onRemove={(i) =>
                setDocuments((prev) => prev.filter((_, idx) => idx !== i))
              }
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
              {isEditing ? "Save changes" : "Create"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
