import { getUsers } from "@/lib/actions/users"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UsersClient } from "@/features/settings/users-client"

export default async function SettingsUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/dashboard")

  const users = await getUsers()

  return <UsersClient users={users} currentUserId={user.id} />
}
