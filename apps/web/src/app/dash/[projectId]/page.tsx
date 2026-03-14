"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useProject } from "./layout";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsBar } from "@/components/stats-bar";
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

interface Stats {
  total_memories: number;
  namespace_count: number;
  entity_count: number;
  avg_importance: number;
  namespaces: { namespace: string; count: number }[];
  entities: { entity: string; count: number }[];
}

// ─── Component ────────────────────────────────────────────────────

export default function HomePage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();
  const { projectId } = useProject();

  // ── Data ──────────────────────────────────────────────────────
  const [namespaces, setNamespaces] = useState<NamespaceItem[]>([]);
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [results, setResults] = useState<RecallResult[]>([]);

  // ── Inputs ─────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [selectedNs, setSelectedNs] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");

  // ── State ──────────────────────────────────────────────────────
  const [loadingNs, setLoadingNs] = useState(true);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!sessionPending && !session) router.push("/auth");
  }, [sessionPending, session, router]);

  // ── Fetch namespaces ────────────────────────────────────────────
  const fetchNamespaces = useCallback(async () => {
    setLoadingNs(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/memories?action=namespaces`,
      );
      if (!res.ok) throw new Error();
      const data: NamespaceItem[] = await res.json();
      setNamespaces(data);
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

  // ── Fetch stats ─────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/memories?action=stats`,
      );
      if (!res.ok) throw new Error();
      const data: Stats = await res.json();
      setStats(data);
    } catch {
      /* ignore — stats are optional */
    } finally {
      setLoadingStats(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (session) {
      fetchNamespaces();
      fetchStats();
    }
  }, [session, fetchNamespaces, fetchStats]);

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

  if (sessionPending || !session) return null;

  const totalDistributed =
    stats?.namespaces.reduce((s, n) => s + n.count, 0) ?? 1;

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
            Recall memories and view analytics
          </p>
        </div>
      </div>

      {/* ── Stats Bar ──────────────────────────────────────────────── */}
      <StatsBar
        totalMemories={stats?.total_memories ?? 0}
        namespaceCount={stats?.namespace_count ?? 0}
        entityCount={stats?.entity_count ?? 0}
        loading={loadingStats}
      />

      {/* ── Recall Search ─────────────────────────────────────────── */}
      <Card className="border-dashed">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-dashed">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold">Recall</span>
            <span className="text-xs text-muted-foreground">
              — Semantic search across your memories
            </span>
          </div>
          <div className="p-4 space-y-3">
            {/* Namespace / Entity selectors */}
            <div className="flex gap-2 flex-wrap">
              <Select
                value={selectedNs}
                onValueChange={(val) => handleNsChange(val as string)}
              >
                <SelectTrigger className="min-w-[180px]">
                  <SelectValue
                    placeholder={loadingNs ? "Loading..." : "Select namespace"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {namespaces.map((ns) => (
                    <SelectItem key={ns.namespace} value={ns.namespace}>
                      <Database className="size-3.5 text-muted-foreground" />
                      {ns.namespace}
                      <span className="text-muted-foreground">({ns.count})</span>
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
                      <span className="text-muted-foreground">({ent.count})</span>
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

          {/* ── Results ──────────────────────────────────────────── */}
          {results.length > 0 ? (
            <div className="border-t border-dashed">
              <div className="px-4 py-2 text-xs text-muted-foreground font-medium">
                {results.length} result{results.length !== 1 ? "s" : ""} found
              </div>
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {results.map((r) => (
                  <div key={r.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                    <p className="text-sm leading-relaxed">{r.content}</p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Sparkles className="size-3" />
                        {(r.score * 100).toFixed(0)}% match
                      </span>
                      <span>Similarity: {(r.similarity * 100).toFixed(0)}%</span>
                      <span>Importance: {(r.importance * 100).toFixed(0)}%</span>
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
          ) : !searching && (
            <div className="border-t border-dashed">
              <div className="px-4 py-2 text-xs text-muted-foreground font-medium">
                Example results
              </div>
              <div className="divide-y opacity-50">
                {[
                  {
                    content: "User prefers dark mode and uses TypeScript for all projects",
                    score: 94,
                    similarity: 92,
                    importance: 80,
                    tags: ["preference", "dev"],
                  },
                  {
                    content: "Scheduled a meeting for next Friday to discuss the API redesign",
                    score: 87,
                    similarity: 85,
                    importance: 70,
                    tags: ["meeting", "api"],
                  },
                  {
                    content: "Favorite framework is Next.js with App Router, prefers server components",
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
          )}
        </CardContent>
      </Card>



      {/* ── Breakdown ─────────────────────────────────────────────── */}
      {stats && (stats.namespaces.length > 0 || stats.entities.length > 0) && (
        <div className="grid md:grid-cols-2 gap-3">
          {/* Namespace distribution */}
          {stats.namespaces.length > 0 && (
            <Card className="shadow-none">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Database className="size-3.5 text-blue-500" />
                  Memories by Namespace
                </h3>

                {/* Stacked bar */}
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted mb-4">
                  {stats.namespaces.map((ns, i) => {
                    const pct = (ns.count / totalDistributed) * 100;
                    const colors = [
                      "bg-blue-500",
                      "bg-violet-500",
                      "bg-emerald-500",
                      "bg-amber-500",
                      "bg-rose-500",
                      "bg-cyan-500",
                      "bg-orange-500",
                      "bg-pink-500",
                      "bg-teal-500",
                      "bg-indigo-500",
                    ];
                    return (
                      <div
                        key={ns.namespace}
                        className={cn("h-full", colors[i % colors.length])}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="space-y-1.5">
                  {stats.namespaces.map((ns, i) => {
                    const colors = [
                      "bg-blue-500",
                      "bg-violet-500",
                      "bg-emerald-500",
                      "bg-amber-500",
                      "bg-rose-500",
                      "bg-cyan-500",
                      "bg-orange-500",
                      "bg-pink-500",
                      "bg-teal-500",
                      "bg-indigo-500",
                    ];
                    return (
                      <div
                        key={ns.namespace}
                        className="flex items-center text-xs"
                      >
                        <span
                          className={cn(
                            "size-2.5 rounded-sm shrink-0 mr-2",
                            colors[i % colors.length],
                          )}
                        />
                        <span className="flex-1 truncate text-muted-foreground">
                          {ns.namespace}
                        </span>
                        <span className="tabular-nums font-medium ml-2">
                          {ns.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entity distribution */}
          {stats.entities.length > 0 && (
            <Card className="shadow-none">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <User className="size-3.5 text-emerald-500" />
                  Memories by Entity
                </h3>

                <div className="space-y-2">
                  {stats.entities.map((ent) => {
                    const max = stats.entities[0]?.count ?? 1;
                    const pct = (ent.count / max) * 100;
                    return (
                      <div key={ent.entity}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground truncate">
                            {ent.entity}
                          </span>
                          <span className="tabular-nums font-medium ml-2">
                            {ent.count}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
