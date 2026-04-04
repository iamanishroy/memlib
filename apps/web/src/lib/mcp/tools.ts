import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MemoryService } from "@memlib/memory";

// ─── Types ────────────────────────────────────────────────────────

export type Scope = {
  namespace: string | null;
  entity: string | null;
  locked: boolean;
};

type WithService = <T>(
  fn: (service: MemoryService) => Promise<T>,
) => Promise<T>;

type SchemaShape = Record<string, z.ZodType>;

// ─── Scope Helpers ────────────────────────────────────────────────

const SCOPE_FIELDS = {
  namespace: z.string().describe("Memory scope (e.g. 'project-x', 'my-app')"),
  entity: z.string().describe("Entity within namespace (e.g. 'user-alice')"),
} as const;

const SCOPE_FIELDS_ENTITY_OPTIONAL = {
  namespace: z.string().describe("Memory scope"),
  entity: z.string().optional().describe("Entity within namespace"),
} as const;

/**
 * Prepend namespace/entity fields to a schema when in unlocked mode.
 */
function withScope(
  scope: Scope,
  base: SchemaShape,
  entityOptional = false,
): SchemaShape {
  if (scope.locked) return base;
  const fields = entityOptional ? SCOPE_FIELDS_ENTITY_OPTIONAL : SCOPE_FIELDS;
  return { ...fields, ...base };
}

/** Resolve namespace/entity from scope or params. */
function resolveNs(scope: Scope, params: Record<string, unknown>): string {
  return scope.locked ? scope.namespace! : (params.namespace as string);
}

function resolveEntity(scope: Scope, params: Record<string, unknown>): string {
  return scope.locked ? scope.entity! : (params.entity as string);
}

function resolveEntityOptional(
  scope: Scope,
  params: Record<string, unknown>,
): string | undefined {
  return scope.locked ? scope.entity! : (params.entity as string | undefined);
}

function scopeSuffix(scope: Scope): string {
  if (!scope.locked) return "";
  return ` Scoped to: ${scope.namespace} / ${scope.entity}.`;
}

/** Helper to build a text-only MCP result. */
function textResult(...texts: string[]) {
  return {
    content: texts.map((text) => ({ type: "text" as const, text })),
  };
}

// ─── Tool Registration ───────────────────────────────────────────

export function registerTools(
  server: McpServer,
  scope: Scope,
  withService: WithService,
): void {
  registerStoreTool(server, scope, withService);
  registerRecallTool(server, scope, withService);
  registerListTool(server, scope, withService);
  registerPrepareTool(server, scope, withService);
  registerDiffTool(server, scope, withService);
}

// ─── store_memory ─────────────────────────────────────────────────

function registerStoreTool(
  server: McpServer,
  scope: Scope,
  withService: WithService,
): void {
  server.registerTool(
    "store_memory",
    {
      title: "Store Memory",
      description:
        "Store a memory. The system automatically extracts atomic facts, deduplicates against existing memories, and resolves conflicts." +
        scopeSuffix(scope),
      inputSchema: withScope(scope, {
        content: z
          .string()
          .describe("The information to remember — can be conversational"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Tags for categorization"),
        source: z
          .string()
          .optional()
          .describe("Origin, e.g. 'conversation', 'code-review'"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async (params: Record<string, unknown>) => {
      const ns = resolveNs(scope, params);
      const ent = resolveEntity(scope, params);

      return withService(async (memory) => {
        const result = await memory.smartStore(
          ns,
          ent,
          params.content as string,
          {
            tags: params.tags as string[] | undefined,
            source: params.source as string | undefined,
          },
        );

        const summary = [
          `Stored ${result.memories.length} memories`,
          result.skipped > 0 ? `${result.skipped} duplicates skipped` : null,
          result.conflicts > 0
            ? `${result.conflicts} conflicts resolved`
            : null,
        ]
          .filter(Boolean)
          .join(", ");

        return textResult(summary, JSON.stringify(result, null, 2));
      });
    },
  );
}

// ─── recall_memories ──────────────────────────────────────────────

function registerRecallTool(
  server: McpServer,
  scope: Scope,
  withService: WithService,
): void {
  server.registerTool(
    "recall_memories",
    {
      title: "Recall Memories",
      description:
        "Search memories by meaning using semantic similarity. Returns memories ranked by hybrid score (similarity × 0.6 + recency × 0.2 + importance × 0.2)." +
        scopeSuffix(scope),
      inputSchema: withScope(scope, {
        query: z
          .string()
          .describe(
            "Natural language query — what are you trying to remember?",
          ),
        limit: z.number().optional().describe("Maximum results to return"),
        category: z
          .string()
          .optional()
          .describe(
            "Filter: preference, personal, professional, plan, health, opinion, fact",
          ),
        min_importance: z
          .number()
          .optional()
          .describe("Minimum importance score 0.0-1.0"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Filter by matching tags"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (params: Record<string, unknown>) => {
      const ns = resolveNs(scope, params);
      const ent = resolveEntity(scope, params);

      return withService(async (memory) => {
        const results = await memory.recall(ns, ent, params.query as string, {
          limit: params.limit as number | undefined,
          category: params.category as string | undefined,
          tags: params.tags as string[] | undefined,
          minImportance: params.min_importance as number | undefined,
        });

        if (results.length === 0) {
          return textResult("No matching memories found.");
        }

        const formatted = results
          .map(
            (r, i) =>
              `${i + 1}. [${((r.score as number) * 100).toFixed(0)}% match] ${r.content}${r.category ? ` (${r.category})` : ""}`,
          )
          .join("\n");

        return textResult(
          `Found ${results.length} memories:\n\n${formatted}`,
          JSON.stringify(results, null, 2),
        );
      });
    },
  );
}

// ─── list_memories ────────────────────────────────────────────────

function registerListTool(
  server: McpServer,
  scope: Scope,
  withService: WithService,
): void {
  server.registerTool(
    "list_memories",
    {
      title: "List Memories",
      description: "List stored memories." + scopeSuffix(scope),
      inputSchema: withScope(
        scope,
        {
          limit: z
            .number()
            .optional()
            .describe("Maximum number of memories to return"),
        },
        true, // entity is optional for list
      ),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (params: Record<string, unknown>) => {
      const ns = resolveNs(scope, params);
      const ent = resolveEntityOptional(scope, params);

      return withService(async (memory) => {
        const results = await memory.list(
          ns,
          ent,
          params.limit as number | undefined,
        );
        return textResult(
          `${results.length} memories found.`,
          JSON.stringify(results, null, 2),
        );
      });
    },
  );
}

// ─── prepare_context ──────────────────────────────────────────────

function registerPrepareTool(
  server: McpServer,
  scope: Scope,
  withService: WithService,
): void {
  server.registerTool(
    "prepare_context",
    {
      title: "Prepare Context",
      description:
        "Synthesize relevant memories into a concise context paragraph for the current conversation. Analyzes intent, runs multi-query semantic search, and generates a task-specific briefing. Uses 2 LLM calls." +
        scopeSuffix(scope),
      inputSchema: withScope(scope, {
        messages: z
          .array(
            z.object({
              role: z.enum(["user", "assistant", "system"]),
              content: z.string(),
            }),
          )
          .describe("Conversation messages to analyze for context"),
        max_candidates: z
          .number()
          .optional()
          .describe("Maximum memories to consider (default: 20)"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (params: Record<string, unknown>) => {
      const ns = resolveNs(scope, params);
      const ent = resolveEntity(scope, params);

      return withService(async (memory) => {
        const result = await memory.prepare(
          ns,
          ent,
          params.messages as Array<{
            role: "user" | "assistant" | "system";
            content: string;
          }>,
          { maxCandidates: params.max_candidates as number | undefined },
        );

        if (!result.context) {
          return textResult(
            "No relevant memories found for this conversation.",
          );
        }

        return textResult(
          result.context,
          `(${result.memoriesUsed.length} memories used, ${result.candidatesConsidered} candidates considered, ~${result.tokenCount} tokens)`,
        );
      });
    },
  );
}

// ─── diff_memories ────────────────────────────────────────────────

function registerDiffTool(
  server: McpServer,
  scope: Scope,
  withService: WithService,
): void {
  server.registerTool(
    "diff_memories",
    {
      title: "Diff Memories",
      description:
        "Memory changelog — returns what changed since a given timestamp. Shows new memories, updates, replacements (contradictions), and deletions. Zero LLM calls, pure audit trail query." +
        scopeSuffix(scope),
      inputSchema: withScope(scope, {
        since: z
          .string()
          .describe(
            "ISO timestamp — return changes after this time (e.g. '2024-03-20T10:00:00Z')",
          ),
        limit: z
          .number()
          .optional()
          .describe("Maximum events to return (default: 200)"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (params: Record<string, unknown>) => {
      const ns = resolveNs(scope, params);
      const ent = resolveEntity(scope, params);

      return withService(async (memory) => {
        const result = await memory.diff(ns, ent, {
          since: params.since as string,
          limit: params.limit as number | undefined,
        });

        const parts: string[] = [];

        if (result.created.length > 0) {
          parts.push(
            `**New (${result.created.length}):**\n` +
              result.created.map((c) => `  • ${c.content}`).join("\n"),
          );
        }
        if (result.updated.length > 0) {
          parts.push(
            `**Updated (${result.updated.length}):**\n` +
              result.updated
                .map((u) => `  • "${u.previousContent}" → "${u.content}"`)
                .join("\n"),
          );
        }
        if (result.replaced.length > 0) {
          parts.push(
            `**Replaced (${result.replaced.length}):**\n` +
              result.replaced
                .map(
                  (r) =>
                    `  • "${r.oldContent}" → "${r.newContent}" (${r.reason})`,
                )
                .join("\n"),
          );
        }
        if (result.deleted.length > 0) {
          parts.push(
            `**Deleted (${result.deleted.length}):**\n` +
              result.deleted.map((d) => `  • ${d.content}`).join("\n"),
          );
        }

        const changelog =
          parts.length > 0
            ? parts.join("\n\n")
            : "No changes since the specified timestamp.";

        return textResult(`${result.summary}\n\n${changelog}`);
      });
    },
  );
}
