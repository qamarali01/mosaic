"use client"

import { useCallback, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Upload, X, Loader2, FileText, File } from "lucide-react"
import { toast } from "sonner"

interface FileEntry {
  id?: string
  name: string
  url: string
  storage_path: string
  file_size: number | null
  mime_type: string | null
}

interface FileUploaderProps {
  bucket: string
  folder?: string
  files: FileEntry[]
  onAdd: (file: FileEntry) => void
  onRemove: (index: number) => void
  accept?: string
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUploader({
  bucket,
  folder = "",
  files,
  onAdd,
  onRemove,
  accept = "*/*",
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return

    setUploading(true)

    for (const file of selected) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 50MB limit`)
        continue
      }

      const path = `${folder ? folder + "/" : ""}${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from(bucket).upload(path, file)

      if (error) { toast.error("Upload failed: " + error.message); continue }

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
      onAdd({ name: file.name, url: publicUrl, storage_path: path, file_size: file.size, mime_type: file.type })
    }

    setUploading(false)
  }

  return (
    <div className="space-y-2">
      {files.map((file, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border group">
          <File className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{file.name}</p>
            {file.file_size && (
              <p className="text-xs text-muted-foreground">{formatBytes(file.file_size)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      ))}

      <label className={cn(
        "flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-border cursor-pointer hover:border-foreground/30 hover:bg-muted/50 transition-colors text-sm text-muted-foreground",
        uploading && "pointer-events-none opacity-60"
      )}>
        <input type="file" accept={accept} multiple className="sr-only" onChange={handleUpload} disabled={uploading} />
        {uploading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
        ) : (
          <><Upload className="h-4 w-4" /> Attach files</>
        )}
      </label>
    </div>
  )
}
