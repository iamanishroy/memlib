import type { MemoryDeps } from "../config";
import {
  retrieveMemories,
  type RetrievedMemory,
  type RecallOptions,
} from "./retrieval";

// ─── Types ────────────────────────────────────────────────────────

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface PrepareOptions {
  /** Max memories to consider (default 20) */
  maxCandidates?: number;
  /** Max tokens in the output context (guides the LLM) */
  maxTokens?: number;
  /** Filter by category */
  category?: string;
}

export interface PrepareResult {
  /** Synthesized context paragraph, ready to inject into a system prompt */
  context: string;
  /** IDs of memories that were used in the synthesis */
  memoriesUsed: string[];
  /** Number of candidate memories considered */
  candidatesConsidered: number;
  /** Estimated token count of the context */
  tokenCount: number;
}

// ─── Intent Analysis Prompt ───────────────────────────────────────

const INTENT_PROMPT = `You are a memory retrieval planner. Given a conversation, analyze what the user needs and generate search queries to find relevant memories about them.

Output JSON only:
{
  "task": "<short description of what the user is trying to do>",
  "queries": ["<search query 1>", "<search query 2>", "<search query 3>"],
  "relevantCategories": ["<category1>", "<category2>"]
}

Rules:
- Generate 2-4 search queries that would find memories USEFUL for this conversation
- Queries should cover: user preferences, personal context, relevant history
- Categories: preference, personal, professional, plan, health, relationship, opinion, fact, other
- Think about what a human assistant would want to know before responding
- Return ONLY valid JSON, no markdown

Conversation:
`;

// ─── Synthesis Prompt ─────────────────────────────────────────────

const SYNTHESIS_PROMPT = `You are a context assembler. Given a conversation and a set of user memories, synthesize a concise briefing paragraph that contains ONLY information relevant to the current conversation.

Rules:
- Include only memories that are USEFUL for the current task/conversation
- Connect related facts naturally (e.g., "was vegetarian but recently started eating meat")
- Flag high-importance items (allergies, strong preferences) with emphasis
- Write in 3rd person ("The user...")
- Be concise — aim for 1-3 sentences
- If no memories are relevant, return an empty context
- Return ONLY valid JSON, no markdown

Output JSON:
{
  "context": "<synthesized briefing paragraph>",
  "usedIds": ["<id1>", "<id2>"]
}

Conversation:
`;

// ─── Intent Analysis ──────────────────────────────────────────────

interface IntentResult {
  task: string;
  queries: string[];
  relevantCategories: string[];
}

async function analyzeIntent(
  deps: Pick<MemoryDeps, "generateText">,
  messages: Message[],
): Promise<IntentResult> {
  // Format last 6 messages for context
  const recent = messages.slice(-6);
  const formatted = recent
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  try {
    const response = await deps.generateText(INTENT_PROMPT + formatted);
    const cleaned = response
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as IntentResult;

    return {
      task: parsed.task || "general",
      queries: Array.isArray(parsed.queries) ? parsed.queries.slice(0, 4) : [],
      relevantCategories: Array.isArray(parsed.relevantCategories)
        ? parsed.relevantCategories
        : [],
    };
  } catch (error) {
    console.warn("Intent analysis failed, using fallback:", error);
    // Fallback: use last user message as query
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return {
      task: "general",
      queries: lastUser ? [lastUser.content] : [],
      relevantCategories: [],
    };
  }
}

// ─── Multi-Query Recall ───────────────────────────────────────────

async function multiQueryRecall(
  deps: Pick<MemoryDeps, "pool" | "generateEmbedding">,
  namespace: string,
  entity: string,
  queries: string[],
  options: PrepareOptions,
): Promise<RetrievedMemory[]> {
  const perQuery = Math.ceil((options.maxCandidates ?? 20) / queries.length);

  const recallOptions: RecallOptions = {
    limit: perQuery,
    category: options.category,
  };

  // Run all queries in parallel
  const results = await Promise.all(
    queries.map((q) =>
      retrieveMemories(deps, namespace, entity, q, recallOptions),
    ),
  );

  // Merge and deduplicate by ID, keeping highest score
  const seen = new Map<string, RetrievedMemory>();
  for (const batch of results) {
    for (const mem of batch) {
      const existing = seen.get(mem.id);
      if (!existing || mem.score > existing.score) {
        seen.set(mem.id, mem);
      }
    }
  }

  // Sort by score descending and cap
  return [...seen.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, options.maxCandidates ?? 20);
}

// ─── Context Synthesis ────────────────────────────────────────────

interface SynthesisResult {
  context: string;
  usedIds: string[];
}

async function synthesizeContext(
  deps: Pick<MemoryDeps, "generateText">,
  messages: Message[],
  candidates: RetrievedMemory[],
): Promise<SynthesisResult> {
  if (candidates.length === 0) {
    return { context: "", usedIds: [] };
  }

  const recent = messages.slice(-6);
  const conversationText = recent
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const memoriesText = candidates
    .map(
      (m) =>
        `[${m.id}] (importance: ${m.importance.toFixed(2)}, category: ${m.category ?? "unknown"}) ${m.content}`,
    )
    .join("\n");

  const prompt =
    SYNTHESIS_PROMPT +
    conversationText +
    "\n\nAvailable memories:\n" +
    memoriesText;

  try {
    const response = await deps.generateText(prompt);
    const cleaned = response
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as SynthesisResult;

    return {
      context: parsed.context || "",
      usedIds: Array.isArray(parsed.usedIds) ? parsed.usedIds : [],
    };
  } catch (error) {
    console.warn("Synthesis failed, falling back to top memories:", error);
    // Fallback: return top 3 memories as bullet points
    const top = candidates.slice(0, 3);
    return {
      context: top.map((m) => m.content).join(". ") + ".",
      usedIds: top.map((m) => m.id),
    };
  }
}

// ─── Main Pipeline ────────────────────────────────────────────────

/**
 * Context-aware memory synthesis.
 *
 * Reads the conversation, generates targeted search queries,
 * retrieves candidate memories, and synthesizes a task-specific
 * briefing paragraph.
 *
 * 2 LLM calls: intent analysis + synthesis.
 */
export async function prepareContext(
  deps: Pick<MemoryDeps, "pool" | "generateEmbedding" | "generateText">,
  namespace: string,
  entity: string,
  messages: Message[],
  options: PrepareOptions = {},
): Promise<PrepareResult> {
  if (!messages || messages.length === 0) {
    return { context: "", memoriesUsed: [], candidatesConsidered: 0, tokenCount: 0 };
  }

  // Step 1: Analyze intent and generate search queries (1 LLM call)
  const intent = await analyzeIntent(deps, messages);

  if (intent.queries.length === 0) {
    return { context: "", memoriesUsed: [], candidatesConsidered: 0, tokenCount: 0 };
  }

  // Step 2: Multi-query recall (embedding calls only, no LLM)
  const candidates = await multiQueryRecall(
    deps,
    namespace,
    entity,
    intent.queries,
    options,
  );

  if (candidates.length === 0) {
    return { context: "", memoriesUsed: [], candidatesConsidered: 0, tokenCount: 0 };
  }

  // Step 3: Synthesize context (1 LLM call)
  const synthesis = await synthesizeContext(deps, messages, candidates);

  // Rough token estimate: ~4 chars per token
  const tokenCount = Math.ceil(synthesis.context.length / 4);

  return {
    context: synthesis.context,
    memoriesUsed: synthesis.usedIds,
    candidatesConsidered: candidates.length,
    tokenCount,
  };
}
