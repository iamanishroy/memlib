#!/usr/bin/env node

import "dotenv/config";

import { createMemoryService } from "@memlib/memory";
import { loadScenarios } from "./loader";
import { runBenchmark } from "./runner";
import { printResults } from "./reporter";
import type { ScenarioTag } from "./types";

// ─── CLI ──────────────────────────────────────────────────────────

const HELP = `
  ⚡ memlib-bench — benchmark the memory system

  Usage:
    npx tsx packages/bench/src/cli.ts [options]

  Options:
    --tags <tags>   Comma-separated filter (quality,dedup,conflict,recall,perf)
    --list          List all scenarios without running
    --help          Show this help

  Environment:
    DATABASE_URL          Postgres connection string (required)
    EMBEDDING_PROVIDER    "gemini" or "openai" (default: gemini)
    EMBEDDING_API_KEY     API key for embedding provider (required)
    LLM_PROVIDER          "gemini", "openai", or "anthropic" (default: gemini)
    LLM_API_KEY           API key for LLM provider (required)
    LLM_MODEL             Model name (optional)

  Examples:
    # Run all benchmarks
    npx tsx packages/bench/src/cli.ts

    # Run only conflict scenarios
    npx tsx packages/bench/src/cli.ts --tags conflict

    # Run quality and recall tests
    npx tsx packages/bench/src/cli.ts --tags quality,recall
`;

async function main() {
  const args = process.argv.slice(2);

  const scenarios = loadScenarios();

  // ── Help ────────────────────────────────────────────────────
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  // ── List ────────────────────────────────────────────────────
  if (args.includes("--list")) {
    console.log(`\n  📋 Available scenarios (${scenarios.length}):\n`);
    for (const s of scenarios) {
      const tags = s.tags.map((t: string) => `[${t}]`).join(" ");
      console.log(`  • ${s.name}  ${tags}`);
      console.log(`    ${s.description}`);
    }
    console.log();
    process.exit(0);
  }

  // ── Parse tags filter ───────────────────────────────────────
  let tags: ScenarioTag[] | undefined;
  const tagsIdx = args.indexOf("--tags");
  if (tagsIdx !== -1 && args[tagsIdx + 1]) {
    tags = args[tagsIdx + 1]!.split(",") as ScenarioTag[];
  }

  // ── Validate env ────────────────────────────────────────────
  const databaseUrl = process.env.DATABASE_URL;
  const embeddingApiKey =
    process.env.EMBEDDING_API_KEY ?? process.env.GOOGLE_API_KEY;
  const llmApiKey =
    process.env.LLM_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is required");
    process.exit(1);
  }
  if (!embeddingApiKey) {
    console.error("❌ EMBEDDING_API_KEY (or GOOGLE_API_KEY) is required");
    process.exit(1);
  }
  if (!llmApiKey) {
    console.error("❌ LLM_API_KEY (or GOOGLE_API_KEY) is required");
    process.exit(1);
  }

  const embeddingProvider = (process.env.EMBEDDING_PROVIDER ?? "gemini") as
    | "gemini"
    | "openai";
  const llmProvider = (process.env.LLM_PROVIDER ?? "gemini") as
    | "gemini"
    | "openai"
    | "anthropic";

  // ── Create service ──────────────────────────────────────────
  const memory = createMemoryService({
    database: { connectionString: databaseUrl },
    embedding: { provider: embeddingProvider, apiKey: embeddingApiKey },
    llm: {
      provider: llmProvider,
      apiKey: llmApiKey,
      model: process.env.LLM_MODEL,
    },
  });

  try {
    // Ensure tables exist
    await memory.migrate();

    // ── Run ─────────────────────────────────────────────────
    const filtered = tags
      ? scenarios.filter((s) => s.tags.some((t) => tags!.includes(t)))
      : scenarios;

    console.log(
      `\n  Running ${filtered.length} scenario${filtered.length !== 1 ? "s" : ""}${tags ? ` (${tags.join(", ")})` : ""}…\n`,
    );

    const results = await runBenchmark(memory, scenarios, { tags });

    // ── Report ──────────────────────────────────────────────
    printResults(results);

    // Exit with error code if any failed
    const failed = results.filter((r) => !r.validation.pass).length;
    process.exit(failed > 0 ? 1 : 0);
  } finally {
    await memory.close();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
