"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { ActionResult, UserProfile, UserRole } from "@/types"

export interface UserWithEmail extends UserProfile {
  email: string | null
}

export async function getUsers(): Promise<UserWithEmail[]> {
  const supabase = await createClient()

  // Verify caller is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") return []

  // Fetch profiles
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: true })

  if (!profiles?.length) return []

  // Fetch auth users for emails using service role
  const adminClient = await createAdminClient()
  const { data: authUsers } = await adminClient.auth.admin.listUsers()

  const emailMap = new Map(authUsers?.users?.map((u) => [u.id, u.email ?? null]) ?? [])

  return profiles.map((p) => ({
    id: p.id,
    role: p.role,
    full_name: p.full_name,
    email: emailMap.get(p.id) ?? null,
    created_at: p.created_at,
  }))
}

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  // Verify caller is admin
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") return { success: false, error: "Insufficient permissions" }

  const { error } = await supabase
    .from("user_profiles")
    .update({ role })
    .eq("id", userId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/settings/users")
  return { success: true, data: undefined }
}
