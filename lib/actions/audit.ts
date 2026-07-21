"use server"

import { createClient } from "@/lib/supabase/server"
import { AuditLog } from "@/types"

export async function getAuditLogs(
  tableName: string,
  recordId: string
): Promise<AuditLog[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("table_name", tableName)
    .eq("record_id", recordId)
    .order("performed_at", { ascending: false })
    .limit(50)
  return (data ?? []) as AuditLog[]
}
