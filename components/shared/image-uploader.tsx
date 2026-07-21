"use client"

import { useCallback, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

interface ImageUploaderProps {
  bucket: string
  folder?: string
  value?: string | null
  onChange: (url: string, path: string) => void
  onRemove?: () => void
  className?: string
  aspectRatio?: "square" | "landscape"
}

export function ImageUploader({
  bucket,
  folder = "",
  value,
  onChange,
  onRemove,
  className,
  aspectRatio = "landscape",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file")
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image must be less than 10MB")
        return
      }

      setUploading(true)

      const ext = file.name.split(".").pop()
      const path = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage.from(bucket).upload(path, file)

      if (error) {
        toast.error("Upload failed: " + error.message)
        setUploading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(publicUrl, path)
      setUploading(false)
    },
    [bucket, folder, onChange, supabase]
  )

  return (
    <div className={cn("relative", className)}>
      {value ? (
        <div className={cn(
          "relative group overflow-hidden rounded-lg border border-border bg-muted",
          aspectRatio === "square" ? "aspect-square" : "aspect-video"
        )}>
          <Image src={value} alt="Upload" fill className="object-cover" />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 p-1 rounded-md bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <label className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border cursor-pointer hover:border-foreground/30 hover:bg-muted/50 transition-colors",
          aspectRatio === "square" ? "aspect-square" : "aspect-video",
          uploading && "pointer-events-none opacity-60"
        )}>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleUpload}
            disabled={uploading}
          />
          {uploading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Click to upload</span>
            </>
          )}
        </label>
      )}
    </div>
  )
}

// ─── Multi-image uploader ─────────────────────────────────────────────────────

interface MultiImageUploaderProps {
  bucket: string
  folder?: string
  images: Array<{ id?: string; url: string; storage_path: string; sort_order: number }>
  onAdd: (url: string, path: string) => void
  onRemove: (index: number) => void
}

export function MultiImageUploader({
  bucket,
  folder = "",
  images,
  onAdd,
  onRemove,
}: MultiImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue
      if (file.size > 10 * 1024 * 1024) continue

      const ext = file.name.split(".").pop()
      const path = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage.from(bucket).upload(path, file)
      if (error) { toast.error("Upload failed: " + error.message); continue }

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
      onAdd(publicUrl, path)
    }

    setUploading(false)
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {images.map((img, i) => (
        <div key={i} className="relative group aspect-square overflow-hidden rounded-lg border border-border bg-muted">
          <Image src={img.url} alt="" fill className="object-cover" />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute top-1 right-1 p-1 rounded-md bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      <label className={cn(
        "flex flex-col items-center justify-center aspect-square rounded-lg border border-dashed border-border cursor-pointer hover:border-foreground/30 hover:bg-muted/50 transition-colors",
        uploading && "pointer-events-none opacity-60"
      )}>
        <input type="file" accept="image/*" multiple className="sr-only" onChange={handleUpload} disabled={uploading} />
        {uploading ? (
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Upload className="h-4 w-4 text-muted-foreground" />
        )}
      </label>
    </div>
  )
}
