import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { supabase } from "../supabase.js"
import { requireRole, type McpContext } from "../context.js"
import { mcpSuccess, mcpError } from "../utils/errors.js"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024    // 5 MB
const MAX_DOC_BYTES   = 20 * 1024 * 1024   // 20 MB

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const ALLOWED_DOC_TYPES   = ["application/pdf", "image/jpeg", "image/png"]

export function registerFileTools(server: McpServer, ctx: McpContext) {
  // ── upload_product_image ───────────────────────────────────────────────────
  server.tool(
    "upload_product_image",
    "Upload a product image. Provide the file content as a base64-encoded string. Allowed types: image/jpeg, image/png, image/webp. Max 5 MB.",
    {
      product_id: z.string().uuid(),
      filename: z.string().min(1).max(200),
      mime_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
      content_base64: z.string().min(1),
    },
    async (input) => {
      try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }

      if (!ALLOWED_IMAGE_TYPES.includes(input.mime_type)) {
        return mcpError(`Unsupported image type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`)
      }

      const buffer = Buffer.from(input.content_base64, "base64")
      if (buffer.byteLength > MAX_IMAGE_BYTES) {
        return mcpError(`Image too large: ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB. Maximum is 5 MB.`)
      }

      // Verify product exists
      const { data: product } = await supabase.from("products").select("id").eq("id", input.product_id).single()
      if (!product) return mcpError("Product not found")

      const ext = input.mime_type.split("/")[1]
      const path = `${input.product_id}/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, buffer, { contentType: input.mime_type, upsert: false })

      if (uploadError) return mcpError(`Upload failed: ${uploadError.message}`)

      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path)

      // Get current max sort_order
      const { data: existing } = await supabase
        .from("product_images")
        .select("sort_order")
        .eq("product_id", input.product_id)
        .order("sort_order", { ascending: false })
        .limit(1)
      const sortOrder = (existing?.[0]?.sort_order ?? -1) + 1

      const { data: imageRow, error: dbError } = await supabase
        .from("product_images")
        .insert({ product_id: input.product_id, url: publicUrl, storage_path: path, sort_order: sortOrder })
        .select()
        .single()

      if (dbError) return mcpError(`DB insert failed: ${dbError.message}`)

      return mcpSuccess({ image_id: imageRow.id, url: publicUrl, storage_path: path, sort_order: sortOrder })
    }
  )

  // ── upload_product_document ────────────────────────────────────────────────
  server.tool(
    "upload_product_document",
    "Upload a product document (spec sheet, PDF, etc.). Provide file content as base64. Allowed types: application/pdf, image/jpeg, image/png. Max 20 MB.",
    {
      product_id: z.string().uuid(),
      display_name: z.string().min(1).max(200),
      filename: z.string().min(1).max(200),
      mime_type: z.enum(["application/pdf", "image/jpeg", "image/png"]),
      content_base64: z.string().min(1),
    },
    async (input) => {
      try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }

      if (!ALLOWED_DOC_TYPES.includes(input.mime_type)) {
        return mcpError(`Unsupported document type. Allowed: ${ALLOWED_DOC_TYPES.join(", ")}`)
      }

      const buffer = Buffer.from(input.content_base64, "base64")
      if (buffer.byteLength > MAX_DOC_BYTES) {
        return mcpError(`Document too large: ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB. Maximum is 20 MB.`)
      }

      const { data: product } = await supabase.from("products").select("id").eq("id", input.product_id).single()
      if (!product) return mcpError("Product not found")

      const path = `${input.product_id}/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`

      const { error: uploadError } = await supabase.storage
        .from("product-documents")
        .upload(path, buffer, { contentType: input.mime_type, upsert: false })

      if (uploadError) return mcpError(`Upload failed: ${uploadError.message}`)

      // Documents are private — generate a signed URL (valid 1 hour) rather than public URL
      const { data: signedData, error: signErr } = await supabase.storage
        .from("product-documents")
        .createSignedUrl(path, 3600)

      if (signErr) return mcpError(`Signed URL failed: ${signErr.message}`)

      const { data: docRow, error: dbError } = await supabase
        .from("product_documents")
        .insert({
          product_id: input.product_id,
          name: input.display_name,
          url: signedData.signedUrl,
          storage_path: path,
          file_size: buffer.byteLength,
          mime_type: input.mime_type,
        })
        .select()
        .single()

      if (dbError) return mcpError(`DB insert failed: ${dbError.message}`)

      return mcpSuccess({ document_id: docRow.id, storage_path: path, file_size_bytes: buffer.byteLength })
    }
  )
}
