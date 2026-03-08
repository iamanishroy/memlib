"use client";

import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2Icon,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProject } from "../../layout";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  permission: number;
  createdAt: string;
  revokedAt: string | null;
}

interface CreatedKeyResponse extends ApiKeyRow {
  key: string;
}

/**
 * Permission levels:
 *   1 = Read
 *   2 = Read & Write
 *   3 = Admin
 */
const PERMISSION_MAP: Record<
  number,
  { label: string; description: string; color: string }
> = {
  1: {
    label: "Read",
    description: "Can only read data",
    color:
      "bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 border-0",
  },
  2: {
    label: "Read & Write",
    description: "Can read and write data",
    color:
      "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20 border-0",
  },
  3: {
    label: "Admin",
    description: "Full access to all operations",
    color:
      "bg-purple-500/15 text-purple-700 hover:bg-purple-500/25 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20 border-0",
  },
};

// ─── Component ────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();
  const { projectId } = useProject();

  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  // create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPermission, setNewPermission] = useState(1);

  // created key reveal
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(true);

  // revoke confirm
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionPending && !session) {
      router.push("/auth");
    }
  }, [sessionPending, session, router]);

  // ─── Fetch keys ──────────────────────────────────────────────────
  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/api-keys`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: ApiKeyRow[] = await res.json();
      setKeys(data);
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (session) fetchKeys();
  }, [session, fetchKeys]);

  // ─── Create key ──────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          permission: newPermission,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
      const created: CreatedKeyResponse = await res.json();
      setRevealedKey(created.key);
      setShowKey(true);
      setDialogOpen(false);
      setNewName("");
      setNewPermission(1);
      toast.success("API key created");
      fetchKeys();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  // ─── Revoke key ──────────────────────────────────────────────────
  const handleRevoke = async (keyId: string) => {
    setRevoking(keyId);
    try {
      const res = await fetch(`/api/projects/${projectId}/api-keys`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: keyId }),
      });
      if (!res.ok) throw new Error("Failed to revoke");
      toast.success("API key revoked");
      setConfirmRevokeId(null);
      fetchKeys();
    } catch {
      toast.error("Failed to revoke API key");
    } finally {
      setRevoking(null);
    }
  };

  // ─── Copy ────────────────────────────────────────────────────────
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (sessionPending || !session) return null;

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground text-sm">
            Manage API keys for programmatic access to your project.
          </p>
        </div>

        {/* ─── Create API Key Dialog ────────────────────────────── */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button className="gap-2">
                <Plus className="size-4" />
                Create API Key
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create new API key</DialogTitle>
              <DialogDescription>
                Give your key a name and select the permission level.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Production Server"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Permission</Label>
                <div className="grid gap-2">
                  {([1, 2, 3] as const).map((p) => {
                    const perm = PERMISSION_MAP[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewPermission(p)}
                        className={`flex flex-col items-start rounded-md border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                          newPermission === p
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {perm.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {perm.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setNewName("");
                  setNewPermission(1);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
              >
                {creating && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ─── Revealed Key Banner ────────────────────────────────── */}
      {revealedKey && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Copy your API key now — you won&apos;t be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm break-all">
                  {showKey ? revealedKey : "•".repeat(revealedKey.length)}
                </code>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => setShowKey(!showKey)}
                        />
                      }
                    >
                      {showKey ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>{showKey ? "Hide" : "Show"}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => copyToClipboard(revealedKey)}
                        />
                      }
                    >
                      <Copy className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>Copy</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setRevealedKey(null)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Table ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : keys.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20">
          <div className="rounded-full bg-muted p-4">
            <KeyRound className="size-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">No API keys yet</p>
            <p className="text-sm text-muted-foreground">
              Create one to start making API requests.
            </p>
          </div>
          <Button
            variant="outline"
            className="mt-2 gap-2"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4" />
            Create API Key
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="h-12 px-4 font-medium">Name</TableHead>
                <TableHead className="h-12 px-4 font-medium">Key</TableHead>
                <TableHead className="h-12 px-4 font-medium w-[140px]">
                  Permission
                </TableHead>
                <TableHead className="h-12 px-4 font-medium">Created</TableHead>
                <TableHead className="h-12 px-4 font-medium w-[100px]">
                  Status
                </TableHead>
                <TableHead className="h-12 px-4 font-medium w-[120px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => {
                const isRevoked = !!k.revokedAt;
                const isRevoking = revoking === k.id;
                const isConfirming = confirmRevokeId === k.id;

                return (
                  <TableRow key={k.id} className="hover:bg-muted/50">
                    <TableCell className="h-14 px-4 font-medium">
                      {k.name}
                    </TableCell>
                    <TableCell className="h-14 px-4">
                      <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                        {k.keyPrefix}
                      </code>
                    </TableCell>
                    <TableCell className="h-14 px-4">
                      <Badge
                        variant="outline"
                        className={PERMISSION_MAP[k.permission]?.color}
                      >
                        {PERMISSION_MAP[k.permission]?.label ?? k.permission}
                      </Badge>
                    </TableCell>
                    <TableCell className="h-14 px-4 text-sm text-muted-foreground">
                      {new Date(k.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="h-14 px-4">
                      {isRevoked ? (
                        <Badge
                          variant="outline"
                          className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 border-0"
                        >
                          Revoked
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-green-500/15 text-green-700 hover:bg-green-500/25 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 border-0"
                        >
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="h-14 px-4">
                      <TooltipProvider>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => copyToClipboard(k.keyPrefix)}
                                  aria-label="Copy key prefix"
                                />
                              }
                            >
                              <Copy className="size-4" />
                            </TooltipTrigger>
                            <TooltipContent>Copy prefix</TooltipContent>
                          </Tooltip>

                          {!isRevoked && (
                            <>
                              {isConfirming ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => handleRevoke(k.id)}
                                    disabled={isRevoking}
                                  >
                                    {isRevoking ? (
                                      <Loader2 className="mr-1 size-3 animate-spin" />
                                    ) : null}
                                    Confirm
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setConfirmRevokeId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white"
                                        onClick={() => setConfirmRevokeId(k.id)}
                                        aria-label="Revoke"
                                      />
                                    }
                                  >
                                    <Trash2Icon className="size-4" />
                                  </TooltipTrigger>
                                  <TooltipContent>Revoke</TooltipContent>
                                </Tooltip>
                              )}
                            </>
                          )}
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
