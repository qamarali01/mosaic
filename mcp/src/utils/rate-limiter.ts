import type { UserRole } from "../auth.js"

// Requests allowed per minute by role
const RATE_LIMITS: Record<UserRole, number> = {
  viewer: 60,
  sales: 120,
  admin: 300,
}

// Map of keyId → array of request timestamps (ms)
const windows = new Map<string, number[]>()

/**
 * Returns null if allowed, or seconds-until-reset if rate limited.
 */
export function checkRateLimit(keyId: string, role: UserRole): number | null {
  const limit = RATE_LIMITS[role]
  const now = Date.now()
  const windowMs = 60_000 // 1 minute sliding window

  let timestamps = windows.get(keyId) ?? []

  // Remove timestamps older than 1 minute
  timestamps = timestamps.filter((t) => now - t < windowMs)

  if (timestamps.length >= limit) {
    // How many seconds until the oldest timestamp expires
    const oldest = timestamps[0]
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000)
    windows.set(keyId, timestamps)
    return retryAfter
  }

  timestamps.push(now)
  windows.set(keyId, timestamps)
  return null
}

// Clean up old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [keyId, timestamps] of windows.entries()) {
    const fresh = timestamps.filter((t) => now - t < 60_000)
    if (fresh.length === 0) {
      windows.delete(keyId)
    } else {
      windows.set(keyId, fresh)
    }
  }
}, 5 * 60_000)
