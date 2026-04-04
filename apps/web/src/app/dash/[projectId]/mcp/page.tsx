"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useProject } from "../layout";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Plug,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  permission: number;
  createdAt: string;
  revokedAt: string | null;
}

type ClientPreset = "cursor" | "claude" | "windsurf" | "generic";

const CLIENT_PRESETS: {
  id: ClientPreset;
  name: string;
  description: string;
  configPath: string;
}[] = [
  {
    id: "cursor",
    name: "Cursor",
    description: "AI code editor",
    configPath: ".cursor/mcp.json",
  },
  {
    id: "claude",
    name: "Claude Desktop",
    description: "Anthropic's desktop app",
    configPath: "claude_desktop_config.json",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    description: "Codeium's editor",
    configPath: ".windsurf/mcp.json",
  },
  {
    id: "generic",
    name: "Generic",
    description: "Any MCP client",
    configPath: "mcp_config.json",
  },
];

const TOOLS = [
  {
    name: "store_memory",
    title: "Store Memory",
    permission: "Write",
    permLevel: 2,
    description:
      "Smart store — extracts facts via LLM, deduplicates, resolves conflicts automatically.",
    llmCalls: "1-2",
  },
  {
    name: "recall_memories",
    title: "Recall Memories",
    permission: "Read",
    permLevel: 1,
    description:
      "Semantic search with hybrid scoring (similarity × 0.6 + recency × 0.2 + importance × 0.2).",
    llmCalls: "0",
  },
  {
    name: "list_memories",
    title: "List Memories",
    permission: "Read",
    permLevel: 1,
    description: "List stored memories by namespace/entity.",
    llmCalls: "0",
  },
  {
    name: "prepare_context",
    title: "Prepare Context",
    permission: "Read",
    permLevel: 1,
    description:
      "Synthesize relevant memories into a concise context paragraph for the current conversation.",
    llmCalls: "2",
  },
  {
    name: "diff_memories",
    title: "Diff Memories",
    permission: "Read",
    permLevel: 1,
    description:
      "Memory changelog — returns what changed since a given timestamp. Zero LLM calls.",
    llmCalls: "0",
  },
];

// ─── Constants ────────────────────────────────────────────────────

const TOOL_NAMES = [
  "store_memory",
  "recall_memories",
  "list_memories",
  "prepare_context",
  "diff_memories",
] as const;

// ─── Helpers ──────────────────────────────────────────────────────

async function fetchApiKeys(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/api-keys`);
  if (!res.ok) throw new Error("Failed to fetch API keys");
  return (await res.json()) as ApiKeyRow[];
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://mem.example.com";
}

function generateConfig(
  client: ClientPreset,
  apiKey: string,
  namespace: string,
  entity: string,
  baseUrl: string,
  excludedTools: string[],
): string {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };
  if (namespace) headers["X-MemLib-Namespace"] = namespace;
  if (entity) headers["X-MemLib-Entity"] = entity;

  let url = `${baseUrl}/api/mcp`;
  if (excludedTools.length > 0) {
    url += `?excludeTools=${excludedTools.join(",")}`;
  }

  const serverEntry = { url, headers };

  // Generic: flat config. All others: wrapped in mcpServers.
  const config =
    client === "generic"
      ? serverEntry
      : { mcpServers: { memlib: serverEntry } };

  return JSON.stringify(config, null, 2);
}

// ─── Component ────────────────────────────────────────────────────

export default function McpPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();
  const { projectId } = useProject();

  // State
  const [apiKey, setApiKey] = useState<string>("");
  const [namespace, setNamespace] = useState("");
  const [entity, setEntity] = useState("");
  const [client, setClient] = useState<ClientPreset>("cursor");
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(
    null,
  );
  const [excludedTools, setExcludedTools] = useState<string[]>([]);

  useEffect(() => {
    if (!sessionPending && !session) router.push("/auth");
  }, [sessionPending, session, router]);

  // Fetch API keys
  const { data: keys = [], isLoading: loadingKeys } = useQuery({
    queryKey: ["api-keys", projectId],
    queryFn: () => fetchApiKeys(projectId),
    enabled: !!session,
    staleTime: Infinity,
  });

  const activeKeys = keys.filter((k) => !k.revokedAt);

  const baseUrl = getBaseUrl();

  const configJson = useMemo(() => {
    if (!apiKey.trim()) return "";
    return generateConfig(
      client,
      apiKey.trim(),
      namespace,
      entity,
      baseUrl,
      excludedTools,
    );
  }, [client, apiKey, namespace, entity, baseUrl, excludedTools]);

  const selectedPreset = CLIENT_PRESETS.find((p) => p.id === client)!;

  // Copy config
  const handleCopy = () => {
    navigator.clipboard.writeText(configJson);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast.error("Enter your full API key first");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${apiKey.trim()}`,
      };
      if (namespace) headers["X-MemLib-Namespace"] = namespace;
      if (entity) headers["X-MemLib-Entity"] = entity;

      const res = await fetch("/api/mcp", {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "memlib-dashboard", version: "1.0.0" },
          },
          id: 1,
        }),
      });

      const data = await res.json();
      if (data.result?.serverInfo?.name === "memlib") {
        setTestResult("success");
        toast.success(
          `Connected! Server: ${data.result.serverInfo.name} v${data.result.serverInfo.version}`,
        );
      } else {
        setTestResult("error");
        toast.error("Unexpected response from MCP server");
      }
    } catch {
      setTestResult("error");
      toast.error("Failed to connect to MCP server");
    } finally {
      setTesting(false);
    }
  };

  if (sessionPending || !session) return null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-600/20 p-2">
            <Plug className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">MCP Integration</h1>
            <p className="text-muted-foreground text-xs">
              Connect AI assistants to your memory via Model Context Protocol
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
        >
          <Zap className="size-3 mr-1" />
          Streamable HTTP
        </Badge>
      </div>

      {/* Endpoint info */}
      <div className="flex items-center gap-3 rounded-lg border border-dashed p-3 bg-muted/30">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">MCP Endpoint</p>
          <code className="text-sm font-mono font-medium">
            {baseUrl}/api/mcp
          </code>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            navigator.clipboard.writeText(`${baseUrl}/api/mcp`);
            toast.success("Endpoint copied");
          }}
        >
          <Copy className="size-3.5" />
          Copy
        </Button>
      </div>

      {/* Main Config Builder */}
      <Card className="border-dashed">
        <CardContent className="p-0">
          {/* Section Header */}
          <div className="p-4 border-b border-dashed">
            <h2 className="text-sm font-semibold">Configure your MCP client</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select your API key, set memory scope, and generate a config for
              your client.
            </p>
          </div>

          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">API Key</Label>
              <Input
                type="password"
                placeholder="sk_..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
              />
              {loadingKeys ? (
                <p className="text-[11px] text-muted-foreground">
                  Loading keys...
                </p>
              ) : activeKeys.length > 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  Your keys:{" "}
                  {activeKeys.map((k, i) => (
                    <span key={k.id}>
                      {i > 0 && ", "}
                      <span className="font-medium text-foreground">
                        {k.name}
                      </span>{" "}
                      <code className="text-[10px]">{k.keyPrefix}</code>
                    </span>
                  ))}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No active API keys.{" "}
                  <a
                    href={`/dash/${projectId}/api-keys`}
                    className="text-primary underline underline-offset-4"
                  >
                    Create one first
                  </a>
                  .
                </p>
              )}
            </div>

            {/* Namespace / Entity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mcp-ns" className="text-xs">
                  Namespace{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="mcp-ns"
                  placeholder="e.g. my-project"
                  value={namespace}
                  onChange={(e) => setNamespace(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mcp-entity" className="text-xs">
                  Entity{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="mcp-entity"
                  placeholder="e.g. user-alice"
                  value={entity}
                  onChange={(e) => setEntity(e.target.value)}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">
              When set, the AI won&apos;t need to specify namespace/entity for
              each tool call (locked mode). Leave empty for dynamic routing.
            </p>

            {/* Tool Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Tools{" "}
                <span className="text-muted-foreground font-normal">
                  ({TOOL_NAMES.length - excludedTools.length} of{" "}
                  {TOOL_NAMES.length} enabled)
                </span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {TOOL_NAMES.map((tool) => {
                  const excluded = excludedTools.includes(tool);
                  return (
                    <button
                      key={tool}
                      type="button"
                      onClick={() =>
                        setExcludedTools((prev) =>
                          excluded
                            ? prev.filter((t) => t !== tool)
                            : [...prev, tool],
                        )
                      }
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-mono transition-all cursor-pointer",
                        excluded
                          ? "border-border/50 bg-muted/30 text-muted-foreground line-through opacity-50"
                          : "border-emerald-500/30 bg-emerald-500/5 text-foreground",
                      )}
                    >
                      {tool}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Click to toggle. Excluded tools won&apos;t be visible to the AI.
              </p>
            </div>

            {/* Client selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Client</Label>
              <div className="grid grid-cols-4 gap-2">
                {CLIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setClient(preset.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all cursor-pointer",
                      client === preset.id
                        ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_12px_-3px] shadow-emerald-500/20"
                        : "border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-border",
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        client !== preset.id && "text-muted-foreground",
                      )}
                    >
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generated config */}
            {apiKey.trim() && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">
                    <code>{selectedPreset.configPath}</code>
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={handleTestConnection}
                      disabled={testing}
                    >
                      {testing ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : testResult === "success" ? (
                        <ShieldCheck className="size-3 text-green-500" />
                      ) : (
                        <Zap className="size-3" />
                      )}
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="size-3 text-green-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
                <pre className="rounded-lg border bg-muted/50 p-3 text-xs font-mono overflow-x-auto max-h-[300px] leading-relaxed">
                  {configJson}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Tools */}
      <Card className="border-dashed">
        <CardContent className="p-0">
          <div className="p-4 border-b border-dashed">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-500" />
              <h2 className="text-sm font-semibold">Available Tools</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              These tools are automatically available to any connected MCP
              client.
            </p>
          </div>

          <div className="divide-y">
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <ChevronRight className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-semibold font-mono">
                        {tool.name}
                      </code>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-4 border-0",
                          tool.permLevel === 2
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "bg-blue-500/10 text-blue-700 dark:text-blue-400",
                        )}
                      >
                        {tool.permission}
                      </Badge>
                      {tool.llmCalls !== "0" && (
                        <span className="text-[10px] text-muted-foreground">
                          {tool.llmCalls} LLM call{tool.llmCalls !== "1" && "s"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">How Scoping Works</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-700 dark:text-green-400 border-0 text-[10px]"
                >
                  Locked
                </Badge>
                <span className="text-xs font-medium">
                  Namespace + Entity set
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tools omit namespace/entity from their schemas. The AI can call{" "}
                <code className="text-[10px]">
                  recall_memories(query: &quot;...&quot;)
                </code>{" "}
                without routing decisions.
              </p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-0 text-[10px]"
                >
                  Unlocked
                </Badge>
                <span className="text-xs font-medium">No headers set</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tools include namespace/entity as required parameters. The AI
                must specify them for each call.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* External links */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <a
          href="https://modelcontextprotocol.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ExternalLink className="size-3" />
          MCP Specification
        </a>
        <a
          href="/docs"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ExternalLink className="size-3" />
          MemLib Docs
        </a>
      </div>
    </div>
  );
}
