import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/shared/app-shell"
import { UserProfile, UserRole } from "@/types"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, created_at")
    .eq("id", user.id)
    .single()

  const userProfile: UserProfile = {
    id: user.id,
    role: (user.app_metadata?.role as UserRole) ?? "viewer",
    full_name: profile?.full_name ?? null,
    email: user.email ?? null,
    created_at: profile?.created_at ?? new Date().toISOString(),
  }

  return <AppShell user={userProfile}>{children}</AppShell>
}
