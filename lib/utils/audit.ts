import type { SupabaseClient } from "@supabase/supabase-js"
import type { AuditAction } from "@/types"

interface LogAuditParams {
  tableName: string
  recordId: string
  action: AuditAction
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
  performedBy: string | null
  performedByName?: string | null
}

export async function logAudit(
  supabase: SupabaseClient,
  params: LogAuditParams
): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
      table_name: params.tableName,
      record_id: params.recordId,
      action: params.action,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
      performed_by: params.performedBy,
      performed_by_name: params.performedByName ?? null,
    })
  } catch {
    // Audit logging must never break the main operation
  }
}
