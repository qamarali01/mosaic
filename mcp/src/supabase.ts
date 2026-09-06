import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
}

// Single service-role client — bypasses RLS, so the MCP server enforces its own auth
export const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})
