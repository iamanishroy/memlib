import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import type { Scenario, ScenarioTag, StepResult, Step, Validation } from "./types";

// ─── JSON Schema Types ────────────────────────────────────────────

interface JsonStep {
  store?: string;
  recall?: string;
  prepare?: { role: "user" | "assistant"; content: string }[];
  entity?: string;
  infer?: boolean;
  category?: string;
}

interface JsonAssert {
  /** Which step to assert on (0-indexed). Omit for scenario-level asserts. */
  step?: number;

  // ── Store assertions ────────────────────────────────────────
  minCreated?: number;
  maxCreated?: number;
  minSkipped?: number;
  maxSkipped?: number;
  minConflicts?: number;
  maxConflicts?: number;
  /** Shorthand: min of (skipped + conflicts) */
  minSkippedOrConflicts?: number;

  // ── Recall assertions ───────────────────────────────────────
  minResults?: number;
  maxResults?: number;
  /** Check if top result content contains this string (case-insensitive) */
  topContains?: string;
  /** Check if top result content contains ANY of these strings (case-insensitive) */
  topContainsAny?: string[];
  /** All results must have this category */
  allCategory?: string;

  // ── Performance assertions ──────────────────────────────────
  maxDurationMs?: number;

  // ── Prepare assertions ──────────────────────────────────────
  /** Check if synthesized context contains this string (case-insensitive) */
  contextContains?: string;
  /** Check if synthesized context does NOT contain this string (case-insensitive) */
  contextNotContains?: string;
  /** Minimum memories used in synthesis */
  minMemoriesUsed?: number;

  // ── Scenario-level assertions ───────────────────────────────
  totalDurationMs?: number;
}

interface JsonScenario {
  name: string;
  description: string;
  steps: JsonStep[];
  assert: JsonAssert[];
}

// ─── Convert JSON step → typed Step ───────────────────────────────

function toStep(json: JsonStep): Step {
  if (json.store !== undefined) {
    return {
      action: "store",
      content: json.store,
      entity: json.entity,
      infer: json.infer,
    };
  }
  if (json.recall !== undefined) {
    return {
      action: "recall",
      query: json.recall,
      entity: json.entity,
      category: json.category,
    };
  }
  if (json.prepare !== undefined) {
    return {
      action: "prepare",
      messages: json.prepare,
      entity: json.entity,
    };
  }
  throw new Error(`Invalid step: ${JSON.stringify(json)}`);
}

// ─── Build validation function from assertions ────────────────────

function buildValidator(asserts: JsonAssert[]): (results: StepResult[], totalDurationMs?: number) => Validation {
  return (results: StepResult[], totalDurationMs?: number): Validation => {
    const failures: string[] = [];

    for (const a of asserts) {
      // ── Scenario-level assertions ───────────────────────────
      if (a.totalDurationMs !== undefined) {
        if (totalDurationMs !== undefined && totalDurationMs > a.totalDurationMs) {
          failures.push(`Total duration ${totalDurationMs}ms exceeds ${a.totalDurationMs}ms`);
        }
        continue;
      }

      if (a.step === undefined) continue;
      const r = results[a.step];
      if (!r) {
        failures.push(`Step ${a.step} not found`);
        continue;
      }

      // ── Store assertions ────────────────────────────────────
      if (r.action === "store") {
        if (a.minCreated !== undefined && r.memoriesCreated < a.minCreated) {
          failures.push(`Step ${a.step}: created ${r.memoriesCreated}, expected ≥${a.minCreated}`);
        }
        if (a.maxCreated !== undefined && r.memoriesCreated > a.maxCreated) {
          failures.push(`Step ${a.step}: created ${r.memoriesCreated}, expected ≤${a.maxCreated}`);
        }
        if (a.minSkipped !== undefined && r.skipped < a.minSkipped) {
          failures.push(`Step ${a.step}: skipped ${r.skipped}, expected ≥${a.minSkipped}`);
        }
        if (a.maxSkipped !== undefined && r.skipped > a.maxSkipped) {
          failures.push(`Step ${a.step}: skipped ${r.skipped}, expected ≤${a.maxSkipped}`);
        }
        if (a.minConflicts !== undefined && r.conflicts < a.minConflicts) {
          failures.push(`Step ${a.step}: conflicts ${r.conflicts}, expected ≥${a.minConflicts}`);
        }
        if (a.maxConflicts !== undefined && r.conflicts > a.maxConflicts) {
          failures.push(`Step ${a.step}: conflicts ${r.conflicts}, expected ≤${a.maxConflicts}`);
        }
        if (a.minSkippedOrConflicts !== undefined && (r.skipped + r.conflicts) < a.minSkippedOrConflicts) {
          failures.push(`Step ${a.step}: skipped+conflicts=${r.skipped + r.conflicts}, expected ≥${a.minSkippedOrConflicts}`);
        }
      }

      // ── Recall assertions ───────────────────────────────────
      if (r.action === "recall") {
        if (a.minResults !== undefined && r.results.length < a.minResults) {
          failures.push(`Step ${a.step}: ${r.results.length} results, expected ≥${a.minResults}`);
        }
        if (a.maxResults !== undefined && r.results.length > a.maxResults) {
          failures.push(`Step ${a.step}: ${r.results.length} results, expected ≤${a.maxResults}`);
        }
        if (a.topContains !== undefined) {
          const top = r.results[0];
          if (!top) {
            failures.push(`Step ${a.step}: no results, expected top to contain "${a.topContains}"`);
          } else if (!top.content.toLowerCase().includes(a.topContains.toLowerCase())) {
            failures.push(`Step ${a.step}: top result "${top.content}" doesn't contain "${a.topContains}"`);
          }
        }
        if (a.topContainsAny !== undefined) {
          const top = r.results[0];
          if (!top) {
            failures.push(`Step ${a.step}: no results, expected top to contain one of [${a.topContainsAny.join(", ")}]`);
          } else {
            const lc = top.content.toLowerCase();
            const match = a.topContainsAny.some((s) => lc.includes(s.toLowerCase()));
            if (!match) {
              failures.push(`Step ${a.step}: top result "${top.content}" doesn't contain any of [${a.topContainsAny.join(", ")}]`);
            }
          }
        }
        if (a.allCategory !== undefined && r.results.length > 0) {
          const bad = r.results.filter((m) => m.category && m.category !== a.allCategory);
          if (bad.length > 0) {
            failures.push(`Step ${a.step}: ${bad.length} results have wrong category`);
          }
        }
      }

      // ── Prepare assertions ──────────────────────────────────
      if (r.action === "prepare") {
        if (a.contextContains !== undefined) {
          if (!r.context.toLowerCase().includes(a.contextContains.toLowerCase())) {
            failures.push(`Step ${a.step}: context doesn't contain "${a.contextContains}" — got: "${r.context.slice(0, 100)}..."`);
          }
        }
        if (a.contextNotContains !== undefined) {
          if (r.context.toLowerCase().includes(a.contextNotContains.toLowerCase())) {
            failures.push(`Step ${a.step}: context should NOT contain "${a.contextNotContains}"`);
          }
        }
        if (a.minMemoriesUsed !== undefined && r.memoriesUsed < a.minMemoriesUsed) {
          failures.push(`Step ${a.step}: used ${r.memoriesUsed} memories, expected ≥${a.minMemoriesUsed}`);
        }
      }

      // ── Duration assertions (any step type) ─────────────────
      if (a.maxDurationMs !== undefined && r.durationMs > a.maxDurationMs) {
        failures.push(`Step ${a.step}: ${r.durationMs}ms exceeds ${a.maxDurationMs}ms`);
      }
    }

    if (failures.length === 0) {
      // Build a success reason from the results
      const summaries: string[] = [];
      for (const r of results) {
        if (r.action === "store") {
          if (r.memoriesCreated > 0) summaries.push(`${r.memoriesCreated} created`);
          if (r.skipped > 0) summaries.push(`${r.skipped} skipped`);
          if (r.conflicts > 0) summaries.push(`${r.conflicts} conflicts`);
        }
        if (r.action === "recall") {
          summaries.push(`${r.results.length} recalled`);
        }
      }
      return { pass: true, reason: summaries.join(", ") || "OK" };
    }

    return { pass: false, reason: failures.join("; ") };
  };
}

// ─── Load all scenario JSON files ─────────────────────────────────

export function loadScenarios(): Scenario[] {
  const __dirname = fileURLToPath(new URL(".", import.meta.url).toString());
  const dir = join(__dirname, "scenarios");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();

  const scenarios: Scenario[] = [];

  for (const file of files) {
    const tag = basename(file, ".json") as ScenarioTag;
    const raw: JsonScenario[] = JSON.parse(readFileSync(join(dir, file), "utf-8"));

    for (const s of raw) {
      const validator = buildValidator(s.assert);
      scenarios.push({
        name: s.name,
        description: s.description,
        tags: [tag],
        steps: s.steps.map(toStep),
        validate: (results, totalDurationMs) => validator(results, totalDurationMs),
      });
    }
  }

  return scenarios;
}
