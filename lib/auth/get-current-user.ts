import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { UserProfile, UserRole } from "@/types"

/**
 * Fetches the current authenticated user + their profile.
 * Wrapped in React cache() so repeated calls within the same request
 * (layout + page + server actions) share a single Supabase round-trip.
 */
export const getCurrentUser = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, created_at")
    .eq("id", user.id)
    .single()

  return {
    id: user.id,
    role: (user.app_metadata?.role as UserRole) ?? "viewer",
    full_name: profile?.full_name ?? null,
    email: user.email ?? null,
    created_at: profile?.created_at ?? new Date().toISOString(),
  }
})
