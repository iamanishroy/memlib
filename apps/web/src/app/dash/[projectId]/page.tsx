"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useProject } from "./layout";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BadgePlus,
  BrainCircuit,
  Database,
  Hash,
  Home,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  ScanSearch,
  Sparkles,
  Trash2,
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
  category: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  similarity: number;
  recency: number;
  importance: number;
  score: number;
}

interface PrepareResultData {
  context: string;
  memoriesUsed: string[];
  candidatesConsidered: number;
  tokenCount: number;
}

type ActiveTab = "recall" | "store" | "prepare";

// ─── Fetch helpers ────────────────────────────────────────────────

async function fetchNamespacesWithEntityCount(projectId: string) {
  const res = await fetch(
    `/api/projects/${projectId}/memories?action=namespaces`,
  );
  if (!res.ok) throw new Error("Failed to load namespaces");
  const namespaces: NamespaceItem[] = await res.json();

  // Count unique entities across all namespaces
  const allEnts = new Set<string>();
  await Promise.all(
    namespaces.map(async (ns) => {
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

  return { namespaces, entityCount: allEnts.size };
}

async function fetchEntitiesForNamespace(projectId: string, namespace: string) {
  const res = await fetch(
    `/api/projects/${projectId}/memories?action=entities&namespace=${encodeURIComponent(namespace)}`,
  );
  if (!res.ok) throw new Error("Failed to load entities");
  return (await res.json()) as EntityItem[];
}

// ─── Component ────────────────────────────────────────────────────

export default function HomePage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();
  const { projectId } = useProject();

  // ── Recall inputs ──────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [selectedNs, setSelectedNs] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");
  const [results, setResults] = useState<RecallResult[]>([]);

  // ── Store inputs ───────────────────────────────────────────────
  const [storeContent, setStoreContent] = useState("");
  const [storeNs, setStoreNs] = useState("");
  const [storeEntity, setStoreEntity] = useState("");
  const [storeTags, setStoreTags] = useState("");

  // ── Prepare inputs ──────────────────────────────────────────────
  const [prepareMessages, setPrepareMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "user", content: "" },
  ]);
  const [prepareNs, setPrepareNs] = useState("");
  const [prepareEntity, setPrepareEntity] = useState("");
  const [prepareResult, setPrepareResult] = useState<PrepareResultData | null>(null);

  // ── State ──────────────────────────────────────────────────────
  const [searching, setSearching] = useState(false);
  const [storing, setStoring] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("recall");

  useEffect(() => {
    if (!sessionPending && !session) router.push("/auth");
  }, [sessionPending, session, router]);

  // ── React Query: namespaces + entity count ──────────────────────
  const {
    data: nsData,
    isLoading: loadingNs,
    refetch: refetchNs,
    isFetching: fetchingNs,
  } = useQuery({
    queryKey: ["namespaces", projectId],
    queryFn: () => fetchNamespacesWithEntityCount(projectId),
    enabled: !!session,
    staleTime: Infinity, // 5 minutes
  });

  const namespaces = nsData?.namespaces ?? [];
  const entityCount = nsData?.entityCount ?? 0;

  // ── React Query: entities for selected namespace ────────────────
  const { data: entities = [], isLoading: loadingEntities } = useQuery({
    queryKey: ["entities", projectId, selectedNs],
    queryFn: () => fetchEntitiesForNamespace(projectId, selectedNs),
    enabled: !!session && !!selectedNs,
    staleTime: Infinity,
  });

  // ── Handle namespace change ─────────────────────────────────────
  const handleNsChange = (ns: string) => {
    setSelectedNs(ns);
    setSelectedEntity("");
    setResults([]);
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

  // ── Prepare ─────────────────────────────────────────────────────
  const handlePrepare = async () => {
    const validMessages = prepareMessages.filter((m) => m.content.trim());
    if (validMessages.length === 0 || !prepareNs.trim() || !prepareEntity.trim()) {
      toast.error("Add at least one message, namespace, and entity");
      return;
    }
    setPreparing(true);
    setPrepareResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          namespace: prepareNs.trim(),
          entity: prepareEntity.trim(),
          messages: validMessages,
        }),
      });
      if (!res.ok) throw new Error();
      const data: PrepareResultData = await res.json();
      setPrepareResult(data);
      if (!data.context) toast.info("No relevant memories found for this context");
    } catch {
      toast.error("Prepare failed");
    } finally {
      setPreparing(false);
    }
  };

  const addMessage = () => {
    const lastRole = prepareMessages[prepareMessages.length - 1]?.role;
    setPrepareMessages([...prepareMessages, { role: lastRole === "user" ? "assistant" : "user", content: "" }]);
  };

  const updateMessage = (index: number, field: "role" | "content", value: string) => {
    const updated = [...prepareMessages];
    if (field === "role") {
      updated[index] = { ...updated[index]!, role: value as "user" | "assistant" };
    } else {
      updated[index] = { ...updated[index]!, content: value };
    }
    setPrepareMessages(updated);
  };

  const removeMessage = (index: number) => {
    if (prepareMessages.length <= 1) return;
    setPrepareMessages(prepareMessages.filter((_, i) => i !== index));
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
            Store, recall, and prepare memories
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
                    {namespaces
                      .reduce((s, n) => s + n.count, 0)
                      .toLocaleString()}
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
            onClick={() => refetchNs()}
            disabled={fetchingNs}
            className={cn(
              "ml-1 p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
              fetchingNs && "opacity-50 cursor-not-allowed",
            )}
            title="Refresh stats"
          >
            <RefreshCw className={cn("size-3", fetchingNs && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── Tabbed Card ────────────────────────────────────────────── */}
      <Card className="border-dashed">
        <CardContent className="p-0">
          {/* Tab selector — card style */}
          <div className="p-4 border-b border-dashed">
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setActiveTab("recall")}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all cursor-pointer",
                  activeTab === "recall"
                    ? "border-primary/50 bg-primary/5 shadow-[0_0_12px_-3px] shadow-primary/20"
                    : "border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-border",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center rounded-md p-2",
                    activeTab === "recall" ? "bg-primary/10" : "bg-muted",
                  )}
                >
                  <ScanSearch
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
                    Semantic search
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
                <div
                  className={cn(
                    "flex items-center justify-center rounded-md p-2",
                    activeTab === "store" ? "bg-emerald-500/10" : "bg-muted",
                  )}
                >
                  <BadgePlus
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
                    Add new memory
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("prepare")}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all cursor-pointer",
                  activeTab === "prepare"
                    ? "border-violet-500/50 bg-violet-500/5 shadow-[0_0_12px_-3px] shadow-violet-500/20"
                    : "border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-border",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center rounded-md p-2",
                    activeTab === "prepare" ? "bg-violet-500/10" : "bg-muted",
                  )}
                >
                  <BrainCircuit
                    className={cn(
                      "size-5",
                      activeTab === "prepare"
                        ? "text-violet-500"
                        : "text-muted-foreground",
                    )}
                  />
                </div>
                <div>
                  <div
                    className={cn(
                      "text-sm font-semibold",
                      activeTab !== "prepare" && "text-muted-foreground",
                    )}
                  >
                    Prepare
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Context synthesis
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
                  {(() => {
                    const nsItems = namespaces.map((ns) => ({
                      label: ns.namespace,
                      value: ns.namespace,
                      count: ns.count,
                    }));
                    const selectedNsItem =
                      nsItems.find((i) => i.value === selectedNs) ?? null;
                    return (
                      <Select
                        value={selectedNsItem}
                        onValueChange={(item) => {
                          if (item) handleNsChange(item.value);
                        }}
                        items={nsItems}
                      >
                        <SelectTrigger className="min-w-[180px]">
                          <SelectValue>
                            {(item: { label: string; count: number } | null) =>
                              item ? (
                                <span className="flex items-center gap-1.5">
                                  <Database className="size-3.5 text-muted-foreground" />
                                  {item.label}
                                  <span className="text-muted-foreground">
                                    ({item.count})
                                  </span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {loadingNs
                                    ? "Loading..."
                                    : "Select namespace"}
                                </span>
                              )
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          <SelectGroup>
                            {nsItems.map((item) => (
                              <SelectItem key={item.value} value={item}>
                                <Database className="size-3.5 text-muted-foreground" />
                                {item.label}
                                <span className="text-muted-foreground">
                                  ({item.count})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    );
                  })()}

                  {(() => {
                    const entItems = entities.map((ent) => ({
                      label: ent.entity,
                      value: ent.entity,
                      count: ent.count,
                    }));
                    const selectedEntItem =
                      entItems.find((i) => i.value === selectedEntity) ?? null;
                    return (
                      <Select
                        value={selectedEntItem}
                        onValueChange={(item) => {
                          if (item) {
                            setSelectedEntity(item.value);
                            setResults([]);
                          }
                        }}
                        items={entItems}
                        disabled={!selectedNs || loadingEntities}
                      >
                        <SelectTrigger className="min-w-[180px]">
                          <SelectValue>
                            {(item: { label: string; count: number } | null) =>
                              item ? (
                                <span className="flex items-center gap-1.5">
                                  <User className="size-3.5 text-muted-foreground" />
                                  {item.label}
                                  <span className="text-muted-foreground">
                                    ({item.count})
                                  </span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {loadingEntities
                                    ? "Loading..."
                                    : !selectedNs
                                      ? "Select namespace first"
                                      : "Select entity"}
                                </span>
                              )
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          <SelectGroup>
                            {entItems.map((item) => (
                              <SelectItem key={item.value} value={item}>
                                <User className="size-3.5 text-muted-foreground" />
                                {item.label}
                                <span className="text-muted-foreground">
                                  ({item.count})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    );
                  })()}
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
                          {r.category && (
                            <span className="rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-400 px-1.5 py-0.5 text-[10px] font-medium">
                              {r.category}
                            </span>
                          )}
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
          {/* ── Prepare Tab ──────────────────────────────────────── */}
          {activeTab === "prepare" && (
            <>
              <div className="p-4 space-y-4">
                {/* Namespace / Entity */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="prepare-ns" className="text-xs">
                      Namespace
                    </Label>
                    <Input
                      id="prepare-ns"
                      placeholder="e.g. chat, notes"
                      value={prepareNs}
                      onChange={(e) => setPrepareNs(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prepare-entity" className="text-xs">
                      Entity
                    </Label>
                    <Input
                      id="prepare-entity"
                      placeholder="e.g. user-123"
                      value={prepareEntity}
                      onChange={(e) => setPrepareEntity(e.target.value)}
                    />
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Conversation Messages</Label>
                  <div className="space-y-2">
                    {prepareMessages.map((msg, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <button
                          type="button"
                          onClick={() =>
                            updateMessage(i, "role", msg.role === "user" ? "assistant" : "user")
                          }
                          className={cn(
                            "h-9 px-2.5 rounded-md border text-xs font-medium shrink-0 transition-colors cursor-pointer min-w-[80px]",
                            msg.role === "user"
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                              : "bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400",
                          )}
                        >
                          <span className="flex items-center gap-1.5">
                            {msg.role === "user" ? (
                              <User className="size-3" />
                            ) : (
                              <BrainCircuit className="size-3" />
                            )}
                            {msg.role}
                          </span>
                        </button>
                        <input
                          type="text"
                          placeholder={msg.role === "user" ? "What the user said..." : "What the assistant said..."}
                          className="flex-1 h-9 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          value={msg.content}
                          onChange={(e) => updateMessage(i, "content", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && i === prepareMessages.length - 1) {
                              handlePrepare();
                            }
                          }}
                        />
                        {prepareMessages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMessage(i)}
                            className="h-9 px-2 rounded-md text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addMessage}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mt-1"
                  >
                    <Plus className="size-3" />
                    Add message
                  </button>
                </div>

                <Button
                  className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={handlePrepare}
                  disabled={
                    preparing ||
                    !prepareNs.trim() ||
                    !prepareEntity.trim() ||
                    !prepareMessages.some((m) => m.content.trim())
                  }
                >
                  {preparing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <BrainCircuit className="size-3.5" />
                  )}
                  Prepare Context
                </Button>
              </div>

              {/* ── Prepare Result ──────────────────────────────────── */}
              {prepareResult ? (
                <div className="border-t border-dashed">
                  <div className="px-4 py-2 flex items-center gap-3 text-xs text-muted-foreground font-medium">
                    <span>Synthesized context</span>
                    <span className="h-3.5 w-px bg-border" />
                    <span className="flex items-center gap-1">
                      <Sparkles className="size-3 text-violet-500" />
                      {prepareResult.memoriesUsed.length} memories used
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="size-3" />
                      ~{prepareResult.tokenCount} tokens
                    </span>
                    <span>{prepareResult.candidatesConsidered} candidates considered</span>
                  </div>
                  {prepareResult.context ? (
                    <div className="px-4 py-3">
                      <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                        <p className="text-sm leading-relaxed">{prepareResult.context}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No relevant memories found for this conversation context.
                    </div>
                  )}
                </div>
              ) : (
                !preparing && (
                  <div className="border-t border-dashed">
                    <div className="px-4 py-2 text-xs text-muted-foreground font-medium">
                      How it works
                    </div>
                    <div className="px-4 py-3 space-y-3 opacity-60">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center rounded-md bg-violet-500/10 p-1.5 mt-0.5 shrink-0">
                          <ScanSearch className="size-3.5 text-violet-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">1. Analyze conversation intent</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            LLM reads the conversation and generates targeted search queries
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center rounded-md bg-violet-500/10 p-1.5 mt-0.5 shrink-0">
                          <Database className="size-3.5 text-violet-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">2. Multi-query recall</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Retrieves memories in parallel using multiple search angles
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center rounded-md bg-violet-500/10 p-1.5 mt-0.5 shrink-0">
                          <BrainCircuit className="size-3.5 text-violet-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">3. Synthesize context</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            LLM filters relevant memories and writes a task-specific briefing
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
