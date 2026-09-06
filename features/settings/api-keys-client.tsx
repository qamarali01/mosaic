"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { McpApiKey, UserRole } from "@/types"
import { createMcpKey, revokeMcpKey } from "@/lib/actions/mcp-keys"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { Plus, Trash2, Copy, Check, Key, AlertTriangle } from "lucide-react"

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Full access" },
  { value: "sales", label: "Sales", description: "Read + write (no user mgmt)" },
  { value: "viewer", label: "Viewer", description: "Read-only" },
]

interface ApiKeysClientProps {
  keys: McpApiKey[]
  callerRole: UserRole
}

export function ApiKeysClient({ keys, callerRole }: ApiKeysClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // New key dialog
  const [newKeyOpen, setNewKeyOpen] = useState(false)
  const [keyName, setKeyName] = useState("")
  const [keyRole, setKeyRole] = useState<UserRole>(callerRole)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Revoke confirm
  const [revokeTarget, setRevokeTarget] = useState<McpApiKey | null>(null)

  const ROLE_ORDER: Record<UserRole, number> = { viewer: 0, sales: 1, admin: 2 }
  const availableRoles = ROLE_OPTIONS.filter((r) => ROLE_ORDER[r.value] <= ROLE_ORDER[callerRole])

  function handleGenerate() {
    if (!keyName.trim()) { toast.error("Enter a key name"); return }
    startTransition(async () => {
      const result = await createMcpKey(keyName.trim(), keyRole)
      if (result.success) {
        setGeneratedKey(result.data.key)
        setKeyName("")
        setKeyRole(callerRole)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleCopy() {
    if (!generatedKey) return
    navigator.clipboard.writeText(generatedKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleRevoke() {
    if (!revokeTarget) return
    startTransition(async () => {
      const result = await revokeMcpKey(revokeTarget.id)
      if (result.success) {
        toast.success("Key revoked")
        router.refresh()
      } else {
        toast.error(result.error)
      }
      setRevokeTarget(null)
    })
  }

  function formatLastUsed(lastUsed: string | null) {
    if (!lastUsed) return "Never"
    const d = new Date(lastUsed)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return formatDate(lastUsed)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium mb-1">MCP API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Connect Mosaic to Claude or other AI assistants via the Model Context Protocol.
          </p>
        </div>
        <Button size="sm" onClick={() => setNewKeyOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New Key
        </Button>
      </div>

      {/* Keys table */}
      {keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-lg border border-dashed border-border text-center">
          <Key className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No API keys yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a key to connect Claude to Mosaic.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-4 p-4 rounded-lg border border-border">
              <Key className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{k.name}</p>
                <p className="text-xs text-muted-foreground">
                  Created {formatDate(k.created_at)} · Last used: {formatLastUsed(k.last_used_at)}
                </p>
              </div>
              <StatusBadge status={k.role} className="capitalize" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => setRevokeTarget(k)}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Claude.ai setup instructions */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How to connect Claude.ai</p>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Go to <strong>Claude.ai → Settings → Integrations → Add MCP Server</strong></li>
          <li>Server URL: <code className="bg-muted px-1 rounded font-mono">https://mcp.yourdomain.com/mcp</code></li>
          <li>Auth Header: <code className="bg-muted px-1 rounded font-mono">Bearer &lt;your-key&gt;</code></li>
        </ol>
      </div>

      {/* New Key Dialog */}
      <Dialog open={newKeyOpen} onOpenChange={(o) => { setNewKeyOpen(o); if (!o) { setGeneratedKey(null); setKeyName("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{generatedKey ? "Your New API Key" : "Create API Key"}</DialogTitle>
            <DialogDescription>
              {generatedKey
                ? "Copy this key now — it will not be shown again."
                : "Give your key a name and choose its access level."}
            </DialogDescription>
          </DialogHeader>

          {!generatedKey ? (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Key Name</Label>
                <Input
                  placeholder="e.g. Claude Desktop"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Role</Label>
                <Select value={keyRole} onValueChange={(v) => setKeyRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <div>
                          <span className="font-medium capitalize">{r.label}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{r.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setNewKeyOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleGenerate} disabled={isPending || !keyName.trim()}>
                  Generate Key
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  This key will only be shown once. Store it securely.
                </p>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/40">
                <code className="flex-1 text-xs font-mono break-all">{generatedKey}</code>
                <Button size="sm" variant="outline" className="shrink-0 h-8" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <Button className="w-full" onClick={() => { setNewKeyOpen(false); setGeneratedKey(null) }}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirm */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title="Revoke API key?"
        description={`"${revokeTarget?.name}" will be permanently revoked. Any AI assistant using this key will lose access immediately.`}
        confirmLabel="Revoke"
        variant="destructive"
        onConfirm={handleRevoke}
      />
    </div>
  )
}
