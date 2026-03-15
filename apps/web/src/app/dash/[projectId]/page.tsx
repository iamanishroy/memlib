"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useProject } from "./layout";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Database,
  Hash,
  Home,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  User,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────

interface NamespaceItem {
  namespace: string;
  count: number;
}

interface EntityItem {
  entity: string;
  count: number;
}

interface RecallResult {
  id: string;
  content: string;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  similarity: number;
  recency: number;
  importance: number;
  score: number;
}

type ActiveTab = "recall" | "store";

// ─── Component ────────────────────────────────────────────────────

export default function HomePage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();
  const { projectId } = useProject();

  // ── Data ──────────────────────────────────────────────────────
  const [namespaces, setNamespaces] = useState<NamespaceItem[]>([]);
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [entityCount, setEntityCount] = useState(0);
  const [results, setResults] = useState<RecallResult[]>([]);

  // ── Recall inputs ──────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [selectedNs, setSelectedNs] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");

  // ── Store inputs ───────────────────────────────────────────────
  const [storeContent, setStoreContent] = useState("");
  const [storeNs, setStoreNs] = useState("");
  const [storeEntity, setStoreEntity] = useState("");
  const [storeTags, setStoreTags] = useState("");

  // ── State ──────────────────────────────────────────────────────
  const [loadingNs, setLoadingNs] = useState(true);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [searching, setSearching] = useState(false);
  const [storing, setStoring] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("recall");
  const statsCached = useRef(false);

  useEffect(() => {
    if (!sessionPending && !session) router.push("/auth");
  }, [sessionPending, session, router]);

  // ── Fetch namespaces + entity count ─────────────────────────────
  const fetchNamespaces = useCallback(async () => {
    setLoadingNs(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/memories?action=namespaces`,
      );
      if (!res.ok) throw new Error();
      const data: NamespaceItem[] = await res.json();
      setNamespaces(data);

      // Count unique entities across all namespaces
      const allEnts = new Set<string>();
      await Promise.all(
        data.map(async (ns) => {
          try {
            const r = await fetch(
              `/api/projects/${projectId}/memories?action=entities&namespace=${encodeURIComponent(ns.namespace)}`,
            );
            if (r.ok) {
              const ents: EntityItem[] = await r.json();
              ents.forEach((e) => allEnts.add(e.entity));
            }
          } catch {
            /* skip */
          }
        }),
      );
      setEntityCount(allEnts.size);
    } catch {
      toast.error("Failed to load namespaces");
    } finally {
      setLoadingNs(false);
    }
  }, [projectId]);

  // ── Fetch entities ──────────────────────────────────────────────
  const fetchEntities = useCallback(
    async (ns: string) => {
      setLoadingEntities(true);
      setEntities([]);
      setSelectedEntity("");
      try {
        const res = await fetch(
          `/api/projects/${projectId}/memories?action=entities&namespace=${encodeURIComponent(ns)}`,
        );
        if (!res.ok) throw new Error();
        const data: EntityItem[] = await res.json();
        setEntities(data);
      } catch {
        toast.error("Failed to load entities");
      } finally {
        setLoadingEntities(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    if (session && !statsCached.current) {
      fetchNamespaces();
      statsCached.current = true;
    }
  }, [session, fetchNamespaces]);

  /** Force refresh stats */
  const handleRefreshStats = () => {
    fetchNamespaces();
  };

  // ── Handle namespace change ─────────────────────────────────────
  const handleNsChange = (ns: string) => {
    setSelectedNs(ns);
    setResults([]);
    if (ns) fetchEntities(ns);
    else {
      setEntities([]);
      setSelectedEntity("");
    }
  };

  // ── Recall ──────────────────────────────────────────────────────
  const handleRecall = async () => {
    if (!query.trim() || !selectedNs || !selectedEntity) {
      toast.error("Select a namespace, entity, and enter a query");
      return;
    }
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(`/api/projects/${projectId}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recall",
          namespace: selectedNs,
          entity: selectedEntity,
          query: query.trim(),
          limit: 10,
        }),
      });
      if (!res.ok) throw new Error();
      const data: RecallResult[] = await res.json();
      setResults(data);
      if (data.length === 0) toast.info("No matching memories found");
    } catch {
      toast.error("Recall failed");
    } finally {
      setSearching(false);
    }
  };

  // ── Store ───────────────────────────────────────────────────────
  const handleStore = async () => {
    if (!storeContent.trim() || !storeNs.trim() || !storeEntity.trim()) {
      toast.error("Namespace, entity, and content are required");
      return;
    }
    setStoring(true);
    try {
      const tags = storeTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch(`/api/projects/${projectId}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "store",
          namespace: storeNs.trim(),
          entity: storeEntity.trim(),
          content: storeContent.trim(),
          tags: tags.length > 0 ? tags : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Memory stored successfully");
      setStoreContent("");
      setStoreTags("");
    } catch {
      toast.error("Failed to store memory");
    } finally {
      setStoring(false);
    }
  };

  if (sessionPending || !session) return null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-600/20 p-2">
          <Home className="size-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Home</h1>
          <p className="text-muted-foreground text-xs">
            Store and recall memories
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          {loadingNs ? (
            <>
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </>
          ) : (
            namespaces.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3 text-violet-500" />
                  <span className="font-semibold text-foreground tabular-nums">
                    {namespaces.reduce((s, n) => s + n.count, 0).toLocaleString()}
                  </span>
                  memories
                </span>
                <span className="h-3.5 w-px bg-border" />
                <span className="flex items-center gap-1.5">
                  <Database className="size-3 text-blue-500" />
                  <span className="font-semibold text-foreground tabular-nums">
                    {namespaces.length}
                  </span>
                  namespaces
                </span>
                <span className="h-3.5 w-px bg-border" />
                <span className="flex items-center gap-1.5">
                  <User className="size-3 text-emerald-500" />
                  <span className="font-semibold text-foreground tabular-nums">
                    {entityCount}
                  </span>
                  entities
                </span>
              </div>
            )
          )}
          <button
            onClick={handleRefreshStats}
            disabled={loadingNs}
            className={cn(
              "ml-1 p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
              loadingNs && "opacity-50 cursor-not-allowed",
            )}
            title="Refresh stats"
          >
            <RefreshCw className={cn("size-3", loadingNs && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── Tabbed Card ────────────────────────────────────────────── */}
      <Card className="border-dashed">
        <CardContent className="p-0">
          {/* Tab selector — card style */}
          <div className="p-4 border-b border-dashed">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab("recall")}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all cursor-pointer",
                  activeTab === "recall"
                    ? "border-primary/50 bg-primary/5 shadow-[0_0_12px_-3px] shadow-primary/20"
                    : "border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-border",
                )}
              >
                {activeTab === "recall" && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Active
                  </span>
                )}
                <div
                  className={cn(
                    "flex items-center justify-center rounded-md p-2",
                    activeTab === "recall" ? "bg-primary/10" : "bg-muted",
                  )}
                >
                  <Search
                    className={cn(
                      "size-5",
                      activeTab === "recall"
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                </div>
                <div>
                  <div
                    className={cn(
                      "text-sm font-semibold",
                      activeTab !== "recall" && "text-muted-foreground",
                    )}
                  >
                    Recall
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Semantic search across memories
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("store")}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all cursor-pointer",
                  activeTab === "store"
                    ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_12px_-3px] shadow-emerald-500/20"
                    : "border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-border",
                )}
              >
                {activeTab === "store" && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white">
                    Active
                  </span>
                )}
                <div
                  className={cn(
                    "flex items-center justify-center rounded-md p-2",
                    activeTab === "store" ? "bg-emerald-500/10" : "bg-muted",
                  )}
                >
                  <Plus
                    className={cn(
                      "size-5",
                      activeTab === "store"
                        ? "text-emerald-500"
                        : "text-muted-foreground",
                    )}
                  />
                </div>
                <div>
                  <div
                    className={cn(
                      "text-sm font-semibold",
                      activeTab !== "store" && "text-muted-foreground",
                    )}
                  >
                    Store
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Add a new memory to the project
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* ── Recall Tab ───────────────────────────────────────── */}
          {activeTab === "recall" && (
            <>
              <div className="p-4 space-y-3">
                {/* Namespace / Entity selectors */}
                <div className="flex gap-2 flex-wrap">
                  <Select
                    value={selectedNs}
                    onValueChange={(val) => handleNsChange(val as string)}
                  >
                    <SelectTrigger className="min-w-[180px]">
                      <SelectValue
                        placeholder={
                          loadingNs ? "Loading..." : "Select namespace"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {namespaces.map((ns) => (
                        <SelectItem key={ns.namespace} value={ns.namespace}>
                          <Database className="size-3.5 text-muted-foreground" />
                          {ns.namespace}
                          <span className="text-muted-foreground">
                            ({ns.count})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedEntity}
                    onValueChange={(val) => {
                      setSelectedEntity(val as string);
                      setResults([]);
                    }}
                    disabled={!selectedNs || loadingEntities}
                  >
                    <SelectTrigger className="min-w-[180px]">
                      <SelectValue
                        placeholder={
                          loadingEntities
                            ? "Loading..."
                            : !selectedNs
                              ? "Select namespace first"
                              : "Select entity"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map((ent) => (
                        <SelectItem key={ent.entity} value={ent.entity}>
                          <User className="size-3.5 text-muted-foreground" />
                          {ent.entity}
                          <span className="text-muted-foreground">
                            ({ent.count})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="What do you remember about..."
                    className="flex-1 h-9 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRecall();
                    }}
                    disabled={!selectedNs || !selectedEntity}
                  />
                  <Button
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={handleRecall}
                    disabled={searching || !query.trim() || !selectedEntity}
                  >
                    {searching ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    Recall
                  </Button>
                </div>
              </div>

              {/* ── Results ──────────────────────────────────────── */}
              {results.length > 0 ? (
                <div className="border-t border-dashed">
                  <div className="px-4 py-2 text-xs text-muted-foreground font-medium">
                    {results.length} result{results.length !== 1 ? "s" : ""}{" "}
                    found
                  </div>
                  <div className="divide-y max-h-[400px] overflow-y-auto">
                    {results.map((r) => (
                      <div
                        key={r.id}
                        className="px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <p className="text-sm leading-relaxed">{r.content}</p>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Sparkles className="size-3" />
                            {(r.score * 100).toFixed(0)}% match
                          </span>
                          <span>
                            Similarity: {(r.similarity * 100).toFixed(0)}%
                          </span>
                          <span>
                            Importance: {(r.importance * 100).toFixed(0)}%
                          </span>
                          {r.tags && r.tags.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Hash className="size-3" />
                              {r.tags.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                !searching && (
                  <div className="border-t border-dashed">
                    <div className="px-4 py-2 text-xs text-muted-foreground font-medium">
                      Example results
                    </div>
                    <div className="divide-y opacity-50">
                      {[
                        {
                          content:
                            "User prefers dark mode and uses TypeScript for all projects",
                          score: 94,
                          similarity: 92,
                          importance: 80,
                          tags: ["preference", "dev"],
                        },
                        {
                          content:
                            "Scheduled a meeting for next Friday to discuss the API redesign",
                          score: 87,
                          similarity: 85,
                          importance: 70,
                          tags: ["meeting", "api"],
                        },
                        {
                          content:
                            "Favorite framework is Next.js with App Router, prefers server components",
                          score: 76,
                          similarity: 78,
                          importance: 60,
                          tags: ["preference"],
                        },
                      ].map((r, i) => (
                        <div key={i} className="px-4 py-3">
                          <p className="text-sm leading-relaxed">{r.content}</p>
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Sparkles className="size-3" />
                              {r.score}% match
                            </span>
                            <span>Similarity: {r.similarity}%</span>
                            <span>Importance: {r.importance}%</span>
                            <span className="flex items-center gap-1">
                              <Hash className="size-3" />
                              {r.tags.join(", ")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </>
          )}

          {/* ── Store Tab ────────────────────────────────────────── */}
          {activeTab === "store" && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="store-ns" className="text-xs">
                    Namespace
                  </Label>
                  <Input
                    id="store-ns"
                    placeholder="e.g. chat, notes"
                    value={storeNs}
                    onChange={(e) => setStoreNs(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="store-entity" className="text-xs">
                    Entity
                  </Label>
                  <Input
                    id="store-entity"
                    placeholder="e.g. user-123, session-abc"
                    value={storeEntity}
                    onChange={(e) => setStoreEntity(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="store-content" className="text-xs">
                  Content
                </Label>
                <textarea
                  id="store-content"
                  placeholder="Enter memory content..."
                  className="flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  value={storeContent}
                  onChange={(e) => setStoreContent(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="store-tags" className="text-xs">
                  Tags{" "}
                  <span className="text-muted-foreground font-normal">
                    (comma separated, optional)
                  </span>
                </Label>
                <Input
                  id="store-tags"
                  placeholder="e.g. preference, important"
                  value={storeTags}
                  onChange={(e) => setStoreTags(e.target.value)}
                />
              </div>

              <Button
                className="gap-1.5"
                onClick={handleStore}
                disabled={
                  storing ||
                  !storeContent.trim() ||
                  !storeNs.trim() ||
                  !storeEntity.trim()
                }
              >
                {storing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                Store Memory
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
