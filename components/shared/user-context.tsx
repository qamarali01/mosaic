"use client"

import { createContext, useContext } from "react"
import { UserProfile, UserRole } from "@/types"

const UserContext = createContext<UserProfile | null>(null)

export function UserProvider({
  user,
  children,
}: {
  user: UserProfile
  children: React.ReactNode
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useUser(): UserProfile {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useUser must be used within UserProvider")
  return ctx
}

export function useCanEdit(): boolean {
  const user = useUser()
  return user.role === "admin" || user.role === "sales"
}

export function useIsAdmin(): boolean {
  const user = useUser()
  return user.role === "admin"
}
