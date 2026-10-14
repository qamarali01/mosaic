import { supabase } from "./supabase.js"
import { generateQueuedDocument } from "./tools/export-documents.js"

const POLL_MS = 2_000

async function processNextDocument(): Promise<boolean> {
  const { data: document } = await supabase
    .from("generated_documents")
    .select("id, kind, quote_id, shipment_id, proposal_id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!document) return false

  const { data: claimed } = await supabase
    .from("generated_documents")
    .update({ status: "processing" })
    .eq("id", document.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle()

  if (!claimed) return false

  await generateQueuedDocument(
    document.id,
    document.kind,
    document.quote_id ?? undefined,
    document.shipment_id ?? undefined,
    document.proposal_id ?? undefined,
  )
  return true
}

async function run() {
  console.log("Mosaic document worker started")
  for (;;) {
    try {
      const processed = await processNextDocument()
      if (!processed) await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    } catch (error) {
      console.error("Document worker error", error)
      await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    }
  }
}

void run()
