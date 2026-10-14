"use server"

import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/types"

export async function getGeneratedDocumentDownloadUrls(id: string): Promise<ActionResult<{ xlsx: string | null; pdf: string | null }>> {
  const supabase = await createClient()
  const { data: document } = await supabase.from("generated_documents").select("xlsx_storage_path,pdf_storage_path").eq("id", id).single()
  if (!document) return { success: false, error: "Document not found" }
  const [xlsx, pdf] = await Promise.all([
    document.xlsx_storage_path ? supabase.storage.from("export-documents").createSignedUrl(document.xlsx_storage_path, 300) : Promise.resolve({ data: null }),
    document.pdf_storage_path ? supabase.storage.from("export-documents").createSignedUrl(document.pdf_storage_path, 300) : Promise.resolve({ data: null }),
  ])
  return { success: true, data: { xlsx: xlsx.data?.signedUrl ?? null, pdf: pdf.data?.signedUrl ?? null } }
}
