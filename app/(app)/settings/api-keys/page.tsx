import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { listMcpKeys } from "@/lib/actions/mcp-keys"
import { ApiKeysClient } from "@/features/settings/api-keys-client"
import { UserRole } from "@/types"

export default async function ApiKeysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const callerRole = (user.app_metadata?.role as UserRole) ?? "viewer"

  // Only admin and sales can manage API keys
  if (callerRole === "viewer") redirect("/dashboard")

  const keys = await listMcpKeys()

  return <ApiKeysClient keys={keys} callerRole={callerRole} />
}
