"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useProject } from "../layout";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Brain,
  Code,
  Key,
  Loader2,
  Save,
  Settings,
  Trash2,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────

interface ProjectConfig {
  id: string;
  name: string;
  description: string | null;
  databaseUrl: string;
  embeddingProvider: string;
  embeddingApiKey: string;
  llmProvider: string;
  llmApiKey: string;
  llmModel: string;
}

const sections = [
  { id: "general", label: "General", icon: Settings },
  { id: "providers", label: "LLM Providers", icon: Key },
  { id: "prompts", label: "Prompts", icon: Code },
  { id: "consolidation", label: "Consolidation", icon: Zap },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
] as const;

type SectionId = (typeof sections)[number]["id"];

// ─── Prompt previews (hardcoded in the memory package) ─────────

const PROMPTS = {
  consolidation: `You are a memory consolidation system for an AI assistant.

Given the following list of older memories, create a single concise summary that captures all the important information. Preserve key facts, preferences, and details.`,
  scoring: `Hybrid scoring formula:
  score = 0.6 × similarity + 0.2 × recency + 0.2 × importance`,
  dedup: `Deduplication threshold: 0.95 cosine similarity
If a new memory exceeds this threshold against an existing memory in the same namespace + entity, it is considered a duplicate and skipped.`,
};

// ─── Component ────────────────────────────────────────────────────

export default function ConfigurationsPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const { projectId } = useProject();

  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("general");

  // danger zone state
  const [confirmPurge, setConfirmPurge] = useState("");
  const [purging, setPurging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isPending && !session) router.push("/auth");
  }, [isPending, session, router]);

  // ── Fetch project ─────────────────────────────────────────────
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error();
      const data: ProjectConfig = await res.json();
      setConfig(data);
    } catch {
      toast.error("Failed to load project settings");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (session) fetchConfig();
  }, [session, fetchConfig]);

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async (fields: Partial<ProjectConfig>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error();
      const updated: ProjectConfig = await res.json();
      setConfig(updated);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // ── Purge memories ────────────────────────────────────────────
  const handlePurge = async () => {
    setPurging(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/memories`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purge" }),
      });
      if (!res.ok) throw new Error();
      toast.success("All memories deleted");
      setConfirmPurge("");
    } catch {
      toast.error("Failed to delete memories");
    } finally {
      setPurging(false);
    }
  };

  // ── Delete project ────────────────────────────────────────────
  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Project deleted");
      router.push("/dash");
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  if (isPending || !session) return null;

  // ── Field updater ─────────────────────────────────────────────
  const update = (field: keyof ProjectConfig, value: string) => {
    if (config) setConfig({ ...config, [field]: value });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 h-full overflow-hidden">
      {/* ── Page Header (consistent with other pages) ──────── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center rounded-lg bg-gradient-to-br from-gray-500/20 to-zinc-600/20 p-2">
          <Settings className="size-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Configurations</h1>
          <p className="text-muted-foreground text-xs">
            Project settings and configuration
          </p>
        </div>
      </div>

      {/* ── Mobile section selector ───────────────────────────── */}
      <div className="md:hidden">
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm w-full"
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value as SectionId)}
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Sidebar + Content ─────────────────────────────────── */}
      <div className="flex flex-1 gap-6 min-h-0">
        {/* Sidebar nav */}
        <nav className="w-[200px] shrink-0 space-y-1 hidden md:block">
          {sections.map((s) => {
            const Icon = s.icon;
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  s.id === "danger" && "text-destructive hover:text-destructive",
                )}
              >
                <Icon className="size-4" />
                {s.label}
              </button>
            );
          })}
        </nav>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto min-w-0 md:border-l md:pl-6">
          {loading || !config ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* ─── General ───────────────────────────────────── */}
              {activeSection === "general" && (
                <>
                  <SectionHeader
                    title="General"
                    description="Basic project information"
                  />
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Project Name</Label>
                        <Input
                          id="name"
                          value={config.name}
                          onChange={(e) => update("name", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="desc">Description</Label>
                        <Input
                          id="desc"
                          placeholder="Optional project description"
                          value={config.description ?? ""}
                          onChange={(e) => update("description", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Database URL</Label>
                        <Input
                          value={config.databaseUrl}
                          disabled
                          className="font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          Database URL cannot be changed after creation.
                        </p>
                      </div>
                      <Button
                        className="gap-2"
                        onClick={() =>
                          handleSave({
                            name: config.name,
                            description: config.description,
                          })
                        }
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        Save Changes
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ─── LLM Providers ─────────────────────────────── */}
              {activeSection === "providers" && (
                <>
                  <SectionHeader
                    title="LLM Providers"
                    description="Configure AI providers for embeddings and text generation"
                  />
                  <Card>
                    <CardContent className="p-6 space-y-5">
                      <h3 className="text-sm font-semibold">Embedding</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Provider</Label>
                          <Select
                            value={config.embeddingProvider}
                            onValueChange={(v) =>
                              update("embeddingProvider", v as string)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gemini">Gemini</SelectItem>
                              <SelectItem value="openai">OpenAI</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="emb-key">API Key</Label>
                          <Input
                            id="emb-key"
                            type="password"
                            value={config.embeddingApiKey}
                            onChange={(e) =>
                              update("embeddingApiKey", e.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="h-px bg-border" />

                      <h3 className="text-sm font-semibold">Text Generation</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Provider</Label>
                          <Select
                            value={config.llmProvider}
                            onValueChange={(v) =>
                              update("llmProvider", v as string)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gemini">Gemini</SelectItem>
                              <SelectItem value="openai">OpenAI</SelectItem>
                              <SelectItem value="anthropic">Anthropic</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="llm-key">API Key</Label>
                          <Input
                            id="llm-key"
                            type="password"
                            value={config.llmApiKey}
                            onChange={(e) =>
                              update("llmApiKey", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model">Model</Label>
                        <Input
                          id="model"
                          placeholder="e.g. gpt-4o, gemini-2.0-flash"
                          value={config.llmModel}
                          onChange={(e) => update("llmModel", e.target.value)}
                        />
                      </div>

                      <Button
                        className="gap-2"
                        onClick={() =>
                          handleSave({
                            embeddingProvider: config.embeddingProvider,
                            embeddingApiKey: config.embeddingApiKey,
                            llmProvider: config.llmProvider,
                            llmApiKey: config.llmApiKey,
                            llmModel: config.llmModel,
                          })
                        }
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        Save Providers
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ─── Prompts ───────────────────────────────────── */}
              {activeSection === "prompts" && (
                <>
                  <SectionHeader
                    title="Prompts"
                    description="System prompts and scoring parameters used by the memory engine"
                  />
                  {Object.entries(PROMPTS).map(([key, value]) => (
                    <Card key={key}>
                      <CardContent className="p-6">
                        <h3 className="text-sm font-semibold capitalize mb-3">
                          {key}
                        </h3>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-md p-3 font-mono leading-relaxed">
                          {value}
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    These prompts are currently defined in the{" "}
                    <code className="text-foreground">@memz/memory</code> package.
                    Per-project prompt customization is coming soon.
                  </p>
                </>
              )}

              {/* ─── Consolidation ─────────────────────────────── */}
              {activeSection === "consolidation" && (
                <>
                  <SectionHeader
                    title="Consolidation"
                    description="How and when memories are summarized and archived"
                  />
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold">How it works</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          The consolidation process finds non-archived memories
                          older than a threshold, groups them by (namespace,
                          entity), generates an LLM summary for each group, stores
                          the summary as a new memory, and archives the originals.
                        </p>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Age Threshold</Label>
                          <Input value="7 days" disabled />
                          <p className="text-xs text-muted-foreground">
                            Memories older than this are candidates.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Batch Size</Label>
                          <Input value="50" disabled />
                          <p className="text-xs text-muted-foreground">
                            Max memories per consolidation run.
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Per-project consolidation settings are coming soon.
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ─── Danger Zone ───────────────────────────────── */}
              {activeSection === "danger" && (
                <>
                  <SectionHeader
                    title="Danger Zone"
                    description="Irreversible actions — proceed with caution"
                  />

                  <Card className="border-destructive/30">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start gap-3">
                        <Brain className="size-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-semibold">
                            Delete All Memories
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Permanently delete every memory in this project.
                            This cannot be undone.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Type{" "}
                          <code className="text-foreground">
                            delete all memories
                          </code>{" "}
                          to confirm
                        </Label>
                        <Input
                          placeholder="delete all memories"
                          value={confirmPurge}
                          onChange={(e) => setConfirmPurge(e.target.value)}
                        />
                      </div>
                      <Button
                        variant="destructive"
                        className="gap-2"
                        disabled={
                          confirmPurge !== "delete all memories" || purging
                        }
                        onClick={handlePurge}
                      >
                        {purging ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Delete All Memories
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-destructive/30">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-semibold">
                            Delete Project
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Permanently delete this project, all API keys, and
                            configuration. Memories in the external database are
                            not deleted.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Type{" "}
                          <code className="text-foreground">{config.name}</code>{" "}
                          to confirm
                        </Label>
                        <Input
                          placeholder={config.name}
                          value={confirmDelete}
                          onChange={(e) => setConfirmDelete(e.target.value)}
                        />
                      </div>
                      <Button
                        variant="destructive"
                        className="gap-2"
                        disabled={confirmDelete !== config.name || deleting}
                        onClick={handleDeleteProject}
                      >
                        {deleting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Delete Project
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section header helper ────────────────────────────────────────

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
