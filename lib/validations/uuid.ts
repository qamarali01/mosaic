import { z } from "zod"

/**
 * Permissive UUID validator — accepts any 8-4-4-4-12 hex string.
 *
 * Zod v4 enforces strict RFC 4122 (version bits must be 1-8, variant bits
 * must be 8-b). Our seed data and some DB records use sequential fake UUIDs
 * like 00000000-0000-0000-0007-000000000002 which fail that strict check.
 * This regex matches the shape only, not the version/variant nibbles.
 */
export const uuidish = (message = "Invalid ID") =>
  z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      message
    )
