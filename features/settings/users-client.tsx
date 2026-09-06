"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserRole } from "@/types"
import { UserWithEmail } from "@/lib/actions/users"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { updateUserRole } from "@/lib/actions/users"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Full access including user management" },
  { value: "sales", label: "Sales", description: "Products, customers, quotes, orders" },
  { value: "viewer", label: "Viewer", description: "Read-only access" },
]

interface UsersClientProps {
  users: UserWithEmail[]
  currentUserId: string
}

export function UsersClient({ users, currentUserId }: UsersClientProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleRoleChange(userId: string, role: UserRole) {
    startTransition(async () => {
      const result = await updateUserRole(userId, role)
      if (result.success) {
        toast.success("Role updated")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-sm font-medium mb-1">Team Members</h2>
        <p className="text-sm text-muted-foreground">Manage team members and their access levels.</p>
      </div>

      <div className="space-y-2">
        {users.map((user) => {
          const initials = user.full_name
            ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
            : user.email?.slice(0, 2).toUpperCase() ?? "U"

          const isCurrentUser = user.id === currentUserId

          return (
            <div
              key={user.id}
              className="flex items-center gap-4 p-4 rounded-lg border border-border"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {user.full_name ?? user.email ?? "Unknown"}
                  </p>
                  {isCurrentUser && (
                    <span className="text-xs text-muted-foreground">(you)</span>
                  )}
                </div>
                {user.email && (
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                )}
                <p className="text-xs text-muted-foreground">Joined {formatDate(user.created_at)}</p>
              </div>

              <Select
                value={user.role}
                onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}
                disabled={isPending || isCurrentUser}
              >
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <p className="text-xs font-medium capitalize">{r.label}</p>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        To invite new users, go to your Supabase project → Authentication → Users.
        New users are assigned the Viewer role by default.
      </p>
    </div>
  )
}
