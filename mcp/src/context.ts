import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"

export type UserRole = "admin" | "sales" | "viewer"

export interface McpContext {
  userId: string
  role: UserRole
  keyId: string
  keyName: string
}

export function requireRole(ctx: McpContext, minRole: UserRole): void {
  const order: Record<UserRole, number> = { viewer: 0, sales: 1, admin: 2 }
  if (order[ctx.role] < order[minRole]) {
    throw new Error(`Insufficient permissions. Required: ${minRole}, your role: ${ctx.role}`)
  }
}

export function buildContextFromAuthInfo(authInfo: AuthInfo): McpContext {
  const extra = authInfo.extra ?? {}
  return {
    userId: (extra.userId as string) ?? "",
    role: ((extra.role as UserRole) ?? "viewer"),
    keyId: (extra.keyId as string) ?? authInfo.clientId,
    keyName: (extra.keyName as string) ?? "unknown",
  }
}
