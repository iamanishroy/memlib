"use client";

import {
  Brain,
  ChevronRight,
  Copy,
  Database,
  FileText,
  Folder,
  Loader2,
  RefreshCw,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProject } from "../layout";
import { authClient } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────

interface NamespaceItem {
  namespace: string;
  count: number;
}

interface EntityItem {
  entity: string;
  count: number;
}

interface MemoryRow {
  id: string;
  namespace: string;
  content: string;
  importance: number;
  tags: string[] | null;
  memory_type: string | null;
  archived: boolean;
  expires_at: string | null;
  created_at: string;
  last_accessed: string;
  metadata: Record<string, unknown> | null;
}

// ─── Helpers ──────────────────────────────────────────────────────

function truncate(str: string, len: number) {
  if (str.length <= len) return str;
  return str.slice(0, len) + "…";
}

function importanceColor(score: number) {
  if (score >= 0.8)
    return "bg-rose-500/15 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-0";
  if (score >= 0.5)
    return "bg-amber-500/15 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border-0";
  return "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-0";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────

export default function MemoriesPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projectId } = useProject();

  // ── Data state ─────────────────────────────────────────────────
  const [namespaces, setNamespaces] = useState<NamespaceItem[]>([]);
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [totalMemories, setTotalMemories] = useState(0);

  // ── Selection state (derived from URL) ─────────────────────────
  const selectedNs = searchParams.get("ns");
  const selectedEntity = searchParams.get("entity");
  const selectedMemoryId = searchParams.get("memory");
  const [selectedMemory, setSelectedMemory] = useState<MemoryRow | null>(null);

  // ── Loading state ──────────────────────────────────────────────
  const [loadingNs, setLoadingNs] = useState(true);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── URL helpers ────────────────────────────────────────────────
  const basePath = `/dash/${projectId}/memories`;

  const updateUrl = useCallback(
    (params: { ns?: string | null; entity?: string | null; memory?: string | null }) => {
      const sp = new URLSearchParams();
      if (params.ns) sp.set("ns", params.ns);
      if (params.ns && params.entity) sp.set("entity", params.entity);
      if (params.ns && params.entity && params.memory) sp.set("memory", params.memory);
      const qs = sp.toString();
      router.replace(`${basePath}${qs ? `?${qs}` : ""}` as any);
    },
    [router, basePath],
  );

  useEffect(() => {
    if (!sessionPending && !session) {
      router.push("/auth");
    }
  }, [sessionPending, session, router]);

  // ── Fetch namespaces ───────────────────────────────────────────
  const fetchNamespaces = useCallback(async () => {
    setLoadingNs(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/memories?action=namespaces`,
      );
      if (!res.ok) throw new Error("Failed to fetch namespaces");
      const data: NamespaceItem[] = await res.json();
      setNamespaces(data);
      return data;
    } catch {
      toast.error("Failed to load namespaces");
      return [];
    } finally {
      setLoadingNs(false);
    }
  }, [projectId]);

  // ── Fetch entities ─────────────────────────────────────────────
  const fetchEntities = useCallback(
    async (namespace: string) => {
      setLoadingEntities(true);
      setEntities([]);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/memories?action=entities&namespace=${encodeURIComponent(namespace)}`,
        );
        if (!res.ok) throw new Error("Failed to fetch entities");
        const data: EntityItem[] = await res.json();
        setEntities(data);
        return data;
      } catch {
        toast.error("Failed to load entities");
        return [];
      } finally {
        setLoadingEntities(false);
      }
    },
    [projectId],
  );

  // ── Fetch memories ─────────────────────────────────────────────
  const fetchMemories = useCallback(
    async (namespace: string, entity: string) => {
      setLoadingMemories(true);
      setMemories([]);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/memories?action=list&namespace=${encodeURIComponent(namespace)}&entity=${encodeURIComponent(entity)}`,
        );
        if (!res.ok) throw new Error("Failed to fetch memories");
        const data: { memories: MemoryRow[]; total: number } = await res.json();
        setMemories(data.memories);
        setTotalMemories(data.total);
        return data.memories;
      } catch {
        toast.error("Failed to load memories");
        return [];
      } finally {
        setLoadingMemories(false);
      }
    },
    [projectId],
  );

  // ── Restore state from URL on initial load ─────────────────────
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!session || restoredRef.current) return;
    restoredRef.current = true;

    (async () => {
      await fetchNamespaces();
      if (selectedNs) {
        const ents = await fetchEntities(selectedNs);
        if (selectedEntity && ents.length > 0) {
          const mems = await fetchMemories(selectedNs, selectedEntity);
          if (selectedMemoryId && mems.length > 0) {
            const found = mems.find((m: MemoryRow) => m.id === selectedMemoryId);
            if (found) setSelectedMemory(found);
          }
        }
      }
    })();
  }, [session, selectedNs, selectedEntity, selectedMemoryId, fetchNamespaces, fetchEntities, fetchMemories]);

  // ── Sync selected memory object when URL memoryId changes ──────
  useEffect(() => {
    if (!selectedMemoryId) {
      setSelectedMemory(null);
      return;
    }
    const found = memories.find((m) => m.id === selectedMemoryId);
    if (found) setSelectedMemory(found);
  }, [selectedMemoryId, memories]);

  // ── Handlers ───────────────────────────────────────────────────
  const handleSelectNamespace = (ns: string) => {
    updateUrl({ ns });
    setEntities([]);
    setMemories([]);
    setSelectedMemory(null);
    fetchEntities(ns);
  };

  const handleSelectEntity = (entity: string) => {
    if (!selectedNs) return;
    updateUrl({ ns: selectedNs, entity });
    setMemories([]);
    setSelectedMemory(null);
    fetchMemories(selectedNs, entity);
  };

  const handleSelectMemory = (memory: MemoryRow) => {
    updateUrl({ ns: selectedNs, entity: selectedEntity, memory: memory.id });
    setSelectedMemory(memory);
  };

  const handleDelete = async (memoryId: string) => {
    setDeleting(memoryId);
    try {
      const res = await fetch(`/api/projects/${projectId}/memories`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryId }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Memory deleted");
      setConfirmDelete(null);

      // ── Optimistic local updates (no re-fetches) ───────────
      // 1. Remove from memories list
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      setTotalMemories((prev) => prev - 1);

      // 2. Clear selection if this memory was selected
      if (selectedMemory?.id === memoryId) {
        setSelectedMemory(null);
        updateUrl({ ns: selectedNs, entity: selectedEntity });
      }

      // 3. Decrement entity count
      setEntities((prev) =>
        prev
          .map((e) =>
            e.entity === selectedEntity ? { ...e, count: e.count - 1 } : e,
          )
          .filter((e) => e.count > 0),
      );

      // 4. Decrement namespace count
      setNamespaces((prev) =>
        prev
          .map((ns) =>
            ns.namespace === selectedNs ? { ...ns, count: ns.count - 1 } : ns,
          )
          .filter((ns) => ns.count > 0),
      );
    } catch {
      toast.error("Failed to delete memory");
    } finally {
      setDeleting(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (sessionPending || !session) return null;

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 h-[calc(100dvh-3.5rem)]">
      {/* Header */}
      <div className="mb-4 shrink-0 flex items-center gap-3">
        <div className="flex items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 p-2">
          <Brain className="size-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Memories</h1>
          <p className="text-muted-foreground text-xs">
            Browse your stored memories — namespace → entity → content
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="mb-3 flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <button
          className={cn(
            "rounded px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground",
            !selectedNs && "text-foreground font-medium",
          )}
          onClick={() => {
            updateUrl({});
            setEntities([]);
            setMemories([]);
            setSelectedMemory(null);
          }}
        >
          All Namespaces
        </button>
        {selectedNs && (
          <>
            <ChevronRight className="size-3" />
            <button
              className={cn(
                "rounded px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground",
                selectedNs && !selectedEntity && "text-foreground font-medium",
              )}
              onClick={() => {
                updateUrl({ ns: selectedNs });
                setMemories([]);
                setSelectedMemory(null);
              }}
            >
              {selectedNs}
            </button>
          </>
        )}
        {selectedEntity && (
          <>
            <ChevronRight className="size-3" />
            <button
              className={cn(
                "rounded px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground",
                selectedEntity && !selectedMemory && "text-foreground font-medium",
              )}
              onClick={() => {
                updateUrl({ ns: selectedNs, entity: selectedEntity });
                setSelectedMemory(null);
              }}
            >
              {selectedEntity}
            </button>
          </>
        )}
        {selectedMemory && (
          <>
            <ChevronRight className="size-3" />
            <span className="text-foreground font-medium font-mono text-[11px]">
              {selectedMemory.id.slice(0, 8)}
            </span>
          </>
        )}
      </div>

      {/* 3-Panel Layout */}
      <div className="flex flex-1 min-h-0 rounded-xl border bg-card overflow-hidden">
        {/* ── Panel 1: Namespaces ─────────────────────────────── */}
        <div className="w-[220px] shrink-0 border-r flex flex-col">
          <div className="px-3 h-10 border-b bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Namespaces
              </span>
            </div>
            <button
              onClick={() => fetchNamespaces()}
              disabled={loadingNs}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh namespaces"
            >
              <RefreshCw className={cn("size-3", loadingNs && "animate-spin")} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingNs ? (
              <div className="p-3 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded-lg" />
                ))}
              </div>
            ) : namespaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                <div className="rounded-full bg-muted p-3">
                  <Database className="size-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  No namespaces found
                </p>
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {namespaces.map((ns) => (
                  <button
                    key={ns.namespace}
                    onClick={() => handleSelectNamespace(ns.namespace)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all group cursor-pointer",
                      selectedNs === ns.namespace
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/60 text-foreground",
                    )}
                  >
                    <Folder
                      className={cn(
                        "size-3.5 shrink-0 transition-colors",
                        selectedNs === ns.namespace
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span className="flex-1 truncate">{ns.namespace}</span>
                    <span
                      className={cn(
                        "text-[10px] tabular-nums rounded-full px-1.5 py-0.5 font-medium",
                        selectedNs === ns.namespace
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {ns.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Panel 2: Entities ───────────────────────────────── */}
        <div className="w-[220px] shrink-0 border-r flex flex-col">
          <div className="px-3 h-10 border-b bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Entities
              </span>
            </div>
            {selectedNs && (
              <button
                onClick={() => fetchEntities(selectedNs)}
                disabled={loadingEntities}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
                title="Refresh entities"
              >
                <RefreshCw className={cn("size-3", loadingEntities && "animate-spin")} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selectedNs ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Select a namespace
                </p>
              </div>
            ) : loadingEntities ? (
              <div className="p-3 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded-lg" />
                ))}
              </div>
            ) : entities.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                <div className="rounded-full bg-muted p-3">
                  <User className="size-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  No entities found
                </p>
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {entities.map((ent) => (
                  <button
                    key={ent.entity}
                    onClick={() => handleSelectEntity(ent.entity)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all group cursor-pointer",
                      selectedEntity === ent.entity
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/60 text-foreground",
                    )}
                  >
                    <User
                      className={cn(
                        "size-3.5 shrink-0 transition-colors",
                        selectedEntity === ent.entity
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span className="flex-1 truncate">{ent.entity}</span>
                    <span
                      className={cn(
                        "text-[10px] tabular-nums rounded-full px-1.5 py-0.5 font-medium",
                        selectedEntity === ent.entity
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {ent.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Panel 3: Memories ───────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-3 h-10 border-b bg-muted/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Brain className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Memories
              </span>
              {selectedEntity && (
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({totalMemories})
                </span>
              )}
            </div>
            {selectedNs && selectedEntity && (
              <button
                onClick={() => fetchMemories(selectedNs, selectedEntity)}
                disabled={loadingMemories}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
                title="Refresh memories"
              >
                <RefreshCw className={cn("size-3", loadingMemories && "animate-spin")} />
              </button>
            )}
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Memory list */}
            <div
              className={cn(
                "flex flex-col border-r overflow-y-auto",
                selectedMemory ? "w-[340px] shrink-0" : "flex-1",
              )}
            >
              {!selectedEntity ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center flex-1">
                  <div className="rounded-full bg-muted p-4">
                    <Brain className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select a namespace and entity to browse memories
                  </p>
                </div>
              ) : loadingMemories ? (
                <div className="p-3 space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : memories.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center flex-1">
                  <div className="rounded-full bg-muted p-4">
                    <FileText className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No memories</p>
                  <p className="text-xs text-muted-foreground">
                    This entity has no stored memories yet.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {memories.map((mem) => (
                    <button
                      key={mem.id}
                      onClick={() => handleSelectMemory(mem)}
                      className={cn(
                        "flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors cursor-pointer",
                        selectedMemory?.id === mem.id
                          ? "bg-primary/5"
                          : "hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] font-mono text-muted-foreground">
                          {mem.id.slice(0, 8)}
                        </code>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-4",
                            importanceColor(mem.importance),
                          )}
                        >
                          {mem.importance.toFixed(2)}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                        {truncate(mem.content, 120)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(mem.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {mem.tags && mem.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="size-2.5 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">
                              {mem.tags.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Memory detail panel */}
            {selectedMemory && (
              <div className="flex-1 overflow-y-auto min-w-0">
                <div className="p-4 space-y-5">
                  {/* ID + actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                        Memory ID
                      </p>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {selectedMemory.id}
                        </code>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    copyToClipboard(selectedMemory.id)
                                  }
                                />
                              }
                            >
                              <Copy className="size-3" />
                            </TooltipTrigger>
                            <TooltipContent>Copy ID</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <div>
                      {confirmDelete === selectedMemory.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleDelete(selectedMemory.id)}
                            disabled={deleting === selectedMemory.id}
                          >
                            {deleting === selectedMemory.id && (
                              <Loader2 className="mr-1 size-3 animate-spin" />
                            )}
                            Delete
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setConfirmDelete(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive hover:text-white"
                                  onClick={() =>
                                    setConfirmDelete(selectedMemory.id)
                                  }
                                />
                              }
                            >
                              <Trash2 className="size-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>Delete memory</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                      Content
                    </p>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedMemory.content}
                      </p>
                    </div>
                  </div>

                  {/* Properties grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Importance */}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                        Importance
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              selectedMemory.importance >= 0.8
                                ? "bg-rose-500"
                                : selectedMemory.importance >= 0.5
                                  ? "bg-amber-500"
                                  : "bg-emerald-500",
                            )}
                            style={{
                              width: `${selectedMemory.importance * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono font-medium">
                          {selectedMemory.importance.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Type */}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                        Type
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {selectedMemory.memory_type ?? "—"}
                      </Badge>
                    </div>

                    {/* Created */}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                        Created
                      </p>
                      <span className="text-xs text-foreground">
                        {formatDate(selectedMemory.created_at)}
                      </span>
                    </div>

                    {/* Last accessed */}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                        Last Accessed
                      </p>
                      <span className="text-xs text-foreground">
                        {formatDate(selectedMemory.last_accessed)}
                      </span>
                    </div>

                    {/* Expires */}
                    {selectedMemory.expires_at && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                          Expires
                        </p>
                        <span className="text-xs text-foreground">
                          {formatDate(selectedMemory.expires_at)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {selectedMemory.tags && selectedMemory.tags.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                        Tags
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMemory.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-0 text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  {selectedMemory.metadata &&
                    Object.keys(selectedMemory.metadata).length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                          Metadata
                        </p>
                        <div className="rounded-lg border bg-muted/30 p-3 overflow-x-auto">
                          <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                            {JSON.stringify(selectedMemory.metadata, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
