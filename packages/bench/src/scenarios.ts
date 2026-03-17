import type { Scenario } from "./types";

// ─── Helper ───────────────────────────────────────────────────────

function store(content: string, opts?: { entity?: string; infer?: boolean }) {
  return { action: "store" as const, content, ...opts };
}

function recall(
  query: string,
  opts?: { entity?: string; category?: string },
) {
  return { action: "recall" as const, query, ...opts };
}

// ─── Scenarios ────────────────────────────────────────────────────

export const scenarios: Scenario[] = [
  // ── Quality: Fact Extraction ──────────────────────────────────

  {
    name: "Single fact extraction",
    description: "Extracts a single atomic fact from a simple statement",
    tags: ["quality"],
    steps: [store("I love TypeScript")],
    validate: (results) => {
      const r = results[0]!;
      if (r.action !== "store") return { pass: false, reason: "Expected store" };
      return r.memoriesCreated >= 1
        ? { pass: true, reason: `Extracted ${r.memoriesCreated} fact(s)` }
        : { pass: false, reason: "No facts extracted" };
    },
  },

  {
    name: "Multi-fact extraction",
    description: "Extracts multiple facts from a compound sentence",
    tags: ["quality"],
    steps: [
      store(
        "I'm a senior engineer at Google, I use Go and Python daily, and I prefer dark mode in all my editors.",
      ),
    ],
    validate: (results) => {
      const r = results[0]!;
      if (r.action !== "store") return { pass: false, reason: "Expected store" };
      return r.memoriesCreated >= 2
        ? { pass: true, reason: `Extracted ${r.memoriesCreated} facts from compound sentence` }
        : {
            pass: false,
            reason: `Only ${r.memoriesCreated} fact(s) — expected ≥2 from compound sentence`,
          };
    },
  },

  // ── Dedup: Exact Duplicate ────────────────────────────────────

  {
    name: "Exact duplicate skip",
    description: "Storing the same content twice should skip the second time",
    tags: ["dedup"],
    steps: [store("I prefer dark mode"), store("I prefer dark mode")],
    validate: (results) => {
      const first = results[0]!;
      const second = results[1]!;
      if (first.action !== "store" || second.action !== "store")
        return { pass: false, reason: "Expected store" };
      return second.skipped >= 1
        ? { pass: true, reason: `Second store skipped ${second.skipped} duplicate(s)` }
        : { pass: false, reason: `Second store created ${second.memoriesCreated} instead of skipping` };
    },
  },

  {
    name: "Semantic duplicate skip",
    description: "Near-identical rephrasing should be detected as duplicate",
    tags: ["dedup"],
    steps: [
      store("I live in New York City"),
      store("I reside in NYC"),
    ],
    validate: (results) => {
      const second = results[1]!;
      if (second.action !== "store") return { pass: false, reason: "Expected store" };
      return second.skipped >= 1 || second.conflicts >= 1
        ? {
            pass: true,
            reason: `Detected duplicate/conflict (skipped=${second.skipped}, conflicts=${second.conflicts})`,
          }
        : { pass: false, reason: `Missed semantic duplicate — inserted ${second.memoriesCreated} new` };
    },
  },

  // ── Conflicts: Contradiction ──────────────────────────────────

  {
    name: "Contradiction detection",
    description: "Contradicting statements should trigger conflict resolution",
    tags: ["conflict"],
    steps: [store("I love mango"), store("I don't love mango")],
    validate: (results) => {
      const second = results[1]!;
      if (second.action !== "store") return { pass: false, reason: "Expected store" };
      return second.conflicts >= 1
        ? { pass: true, reason: `Detected ${second.conflicts} contradiction(s)` }
        : { pass: false, reason: `Missed contradiction — skipped=${second.skipped}, new=${second.memoriesCreated}` };
    },
  },

  {
    name: "Preference update",
    description: "Changing a preference should update the existing memory",
    tags: ["conflict"],
    steps: [
      store("My favorite editor is VS Code"),
      store("I switched to Cursor, it's my favorite editor now"),
    ],
    validate: (results) => {
      const second = results[1]!;
      if (second.action !== "store") return { pass: false, reason: "Expected store" };
      return second.conflicts >= 1
        ? { pass: true, reason: `Detected preference update (conflicts=${second.conflicts})` }
        : { pass: false, reason: `Missed preference update — stored as new memory` };
    },
  },

  {
    name: "Location change",
    description: "Moving to a new city should update or contradict the old location",
    tags: ["conflict"],
    steps: [
      store("I live in San Francisco"),
      store("I recently moved to Berlin"),
    ],
    validate: (results) => {
      const second = results[1]!;
      if (second.action !== "store") return { pass: false, reason: "Expected store" };
      return second.conflicts >= 1
        ? { pass: true, reason: `Detected location change` }
        : { pass: false, reason: `Missed location change — stored as new memory` };
    },
  },

  // ── Recall: Precision ─────────────────────────────────────────

  {
    name: "Recall precision",
    description: "Recalling should return the most relevant memories",
    tags: ["recall"],
    steps: [
      store("I prefer TypeScript for all my projects", { infer: false }),
      store("I have a golden retriever named Max", { infer: false }),
      store("I work at a startup in Berlin", { infer: false }),
      recall("What programming language does the user like?"),
    ],
    validate: (results) => {
      const r = results[3]!;
      if (r.action !== "recall") return { pass: false, reason: "Expected recall" };
      if (r.results.length === 0) return { pass: false, reason: "No recall results" };
      const top = r.results[0]!;
      const isRelevant =
        top.content.toLowerCase().includes("typescript") ||
        top.content.toLowerCase().includes("programming");
      return isRelevant
        ? { pass: true, reason: `Top result: "${top.content}" (score=${top.score.toFixed(3)})` }
        : { pass: false, reason: `Top result irrelevant: "${top.content}"` };
    },
  },

  {
    name: "Recall with category filter",
    description: "Category filter should narrow results",
    tags: ["recall"],
    steps: [
      store("I love sushi and Japanese food"),
      store("I work as a backend engineer at Google"),
      recall("What does the user do?", { category: "professional" }),
    ],
    validate: (results) => {
      const r = results[2]!;
      if (r.action !== "recall") return { pass: false, reason: "Expected recall" };
      if (r.results.length === 0) return { pass: true, reason: "No results (may be too strict)" };
      const allProfessional = r.results.every(
        (m) => !m.category || m.category === "professional",
      );
      return allProfessional
        ? { pass: true, reason: `All ${r.results.length} results are professional` }
        : { pass: false, reason: "Got non-professional results despite category filter" };
    },
  },

  // ── Performance ──────────────────────────────────────────────

  {
    name: "Store latency (smart)",
    description: "Smart store should complete within 8 seconds",
    tags: ["perf"],
    steps: [store("The user enjoys reading sci-fi novels and plays chess on weekends")],
    validate: (results) => {
      const r = results[0]!;
      if (r.action !== "store") return { pass: false, reason: "Expected store" };
      return r.durationMs < 8000
        ? { pass: true, reason: `Completed in ${r.durationMs}ms` }
        : { pass: false, reason: `Took ${r.durationMs}ms — exceeds 8s target` };
    },
  },

  {
    name: "Recall latency",
    description: "Recall should complete within 2 seconds",
    tags: ["perf"],
    steps: [
      store("I like hiking in the mountains", { infer: false }),
      recall("outdoor activities"),
    ],
    validate: (results) => {
      const r = results[1]!;
      if (r.action !== "recall") return { pass: false, reason: "Expected recall" };
      return r.durationMs < 2000
        ? { pass: true, reason: `Completed in ${r.durationMs}ms` }
        : { pass: false, reason: `Took ${r.durationMs}ms — exceeds 2s target` };
    },
  },

  {
    name: "Raw store latency (no inference)",
    description: "Raw store (infer=false) should complete within 2 seconds",
    tags: ["perf"],
    steps: [store("User prefers Python 3.12", { infer: false })],
    validate: (results) => {
      const r = results[0]!;
      if (r.action !== "store") return { pass: false, reason: "Expected store" };
      return r.durationMs < 2000
        ? { pass: true, reason: `Completed in ${r.durationMs}ms (no LLM)` }
        : { pass: false, reason: `Took ${r.durationMs}ms — too slow for raw store` };
    },
  },
];
