import { supabase } from "../supabase.js"
import type { McpContext } from "../context.js"

type AuditAction =
  | "mcp_create"
  | "mcp_update"
  | "mcp_archive"
  | "mcp_restore"
  | "mcp_delete"

interface AuditParams {
  tableName: string
  recordId: string
  action: AuditAction
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  ctx: McpContext
}

export async function logMcpAudit(params: AuditParams): Promise<void> {
  const { tableName, recordId, action, oldData, newData, ctx } = params

  await supabase.from("audit_logs").insert({
    table_name: tableName,
    record_id: recordId,
    action,
    old_data: oldData ?? null,
    new_data: newData ?? null,
    performed_by: ctx.userId,
    performed_by_name: `MCP:${ctx.keyName}`,
  })
}
