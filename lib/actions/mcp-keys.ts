"use server"

import crypto from "crypto"
import { createClient } from "@/lib/supabase/server"
import { ActionResult, McpApiKey, UserRole } from "@/types"

const ROLE_ORDER: Record<UserRole, number> = { viewer: 0, sales: 1, admin: 2 }

function generateRawKey(): string {
  return "msc_" + crypto.randomBytes(20).toString("hex")
}

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

// ─── List keys visible to the caller ─────────────────────────────────────────

export async function listMcpKeys(): Promise<McpApiKey[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("mcp_api_keys")
    .select("id, user_id, name, role, last_used_at, created_at")
    .order("created_at", { ascending: false })

  // Return without key_hash (never expose hash to client)
  return (data ?? []).map((k) => ({ ...k, key_hash: "" })) as McpApiKey[]
}

// ─── Create a new key ─────────────────────────────────────────────────────────

export async function createMcpKey(
  name: string,
  role: UserRole
): Promise<ActionResult<{ key: string; record: Omit<McpApiKey, "key_hash"> }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  // Caller's role
  const callerRole = (user.app_metadata?.role as UserRole) ?? "viewer"

  // Can't create a key with a higher role than your own
  if (ROLE_ORDER[role] > ROLE_ORDER[callerRole]) {
    return { success: false, error: `Cannot create a key with role "${role}" — your role is "${callerRole}"` }
  }

  if (!name.trim()) return { success: false, error: "Key name is required" }

  const rawKey = generateRawKey()
  const keyHash = hashKey(rawKey)

  const { data, error } = await supabase
    .from("mcp_api_keys")
    .insert({ user_id: user.id, name: name.trim(), key_hash: keyHash, role })
    .select("id, user_id, name, role, last_used_at, created_at")
    .single()

  if (error) return { success: false, error: error.message }

  return {
    success: true,
    data: {
      key: rawKey, // shown once to the user
      record: data as Omit<McpApiKey, "key_hash">,
    },
  }
}

// ─── Revoke a key ─────────────────────────────────────────────────────────────

export async function revokeMcpKey(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const callerRole = (user.app_metadata?.role as UserRole) ?? "viewer"

  // Fetch the key to verify ownership
  const { data: key } = await supabase
    .from("mcp_api_keys")
    .select("user_id")
    .eq("id", id)
    .single()

  if (!key) return { success: false, error: "Key not found" }

  // Only the owner or an admin can revoke
  if (key.user_id !== user.id && callerRole !== "admin") {
    return { success: false, error: "Insufficient permissions" }
  }

  const { error } = await supabase.from("mcp_api_keys").delete().eq("id", id)
  if (error) return { success: false, error: error.message }

  return { success: true, data: undefined }
}
