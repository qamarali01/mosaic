-- ─── Extend audit_action enum with MCP-tagged values ─────────────────────────
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'mcp_create';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'mcp_update';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'mcp_archive';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'mcp_restore';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'mcp_delete';

-- ─── MCP API Keys ──────────────────────────────────────────────────────────────
CREATE TABLE mcp_api_keys (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  key_hash      text        UNIQUE NOT NULL,   -- SHA-256 of the raw key
  role          user_role   NOT NULL,
  last_used_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcp_api_keys_user ON mcp_api_keys(user_id);
CREATE INDEX idx_mcp_api_keys_hash ON mcp_api_keys(key_hash);

ALTER TABLE mcp_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can manage their own keys
CREATE POLICY "Users can manage own keys" ON mcp_api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Admins can manage all keys
CREATE POLICY "Admins can manage all keys" ON mcp_api_keys
  FOR ALL USING (get_jwt_role() = 'admin');
