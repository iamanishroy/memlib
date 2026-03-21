import type { MemoryService } from "@memlib/memory";
import type {
  Scenario,
  ScenarioResult,
  StepResult,
  StoreStepResult,
  RecallStepResult,
  PrepareStepResult,
  ScenarioTag,
} from "./types";

/**
 * Run a single benchmark scenario against a live MemoryService.
 * Each scenario gets a unique namespace so they don't interfere.
 */
export async function runScenario(
  memory: MemoryService,
  scenario: Scenario,
  runId: string,
  scenarioIdx: number,
): Promise<ScenarioResult> {
  const namespace = "bench-test";
  const entity = `${runId}-${scenarioIdx}`;
  const stepResults: StepResult[] = [];
  let totalLlmCalls = 0;
  const t0 = Date.now();

  for (const step of scenario.steps) {
    if (step.action === "store") {
      const start = Date.now();

      // Count LLM calls: smart store = 1 (extraction) + possible 1 (conflicts)
      const infer = step.infer !== false;

      if (infer) {
        const result = await memory.smartStore(
          namespace,
          step.entity ?? entity,
          step.content,
        );
        const durationMs = Date.now() - start;
        const llmCalls = 1 + (result.conflicts > 0 ? 1 : 0);
        totalLlmCalls += llmCalls;

        stepResults.push({
          action: "store",
          durationMs,
          llmCalls,
          memoriesCreated: result.memories.length,
          skipped: result.skipped,
          conflicts: result.conflicts,
          raw: result,
        } satisfies StoreStepResult);
      } else {
        const result = await memory.store(
          namespace,
          step.entity ?? entity,
          step.content,
        );
        const durationMs = Date.now() - start;

        stepResults.push({
          action: "store",
          durationMs,
          llmCalls: 0,
          memoriesCreated: result.deduplicated ? 0 : 1,
          skipped: result.deduplicated ? 1 : 0,
          conflicts: 0,
          raw: result,
        } satisfies StoreStepResult);
      }
    } else if (step.action === "recall") {
      const start = Date.now();
      const results = await memory.recall(
        namespace,
        step.entity ?? entity,
        step.query,
        {
          limit: 5,
          category: step.category,
        },
      );
      const durationMs = Date.now() - start;

      stepResults.push({
        action: "recall",
        durationMs,
        results: results.map((r) => ({
          content: r.content,
          score: r.score,
          category: r.category ?? null,
        })),
        raw: results,
      } satisfies RecallStepResult);
    } else if (step.action === "prepare") {
      const start = Date.now();
      const result = await memory.prepare(
        namespace,
        step.entity ?? entity,
        step.messages,
      );
      const durationMs = Date.now() - start;
      totalLlmCalls += 2; // intent + synthesis

      stepResults.push({
        action: "prepare",
        durationMs,
        context: result.context,
        memoriesUsed: result.memoriesUsed.length,
        candidatesConsidered: result.candidatesConsidered,
        tokenCount: result.tokenCount,
        raw: result,
      } satisfies PrepareStepResult);
    }
  }

  const totalDurationMs = Date.now() - t0;
  const validation = scenario.validate(stepResults, totalDurationMs);

  return {
    name: scenario.name,
    tags: scenario.tags,
    steps: stepResults,
    validation,
    totalDurationMs,
    totalLlmCalls,
  };
}

/**
 * Run all scenarios (optionally filtered by tags).
 */
export async function runBenchmark(
  memory: MemoryService,
  scenarios: Scenario[],
  options?: { tags?: ScenarioTag[] },
): Promise<ScenarioResult[]> {
  let filtered = scenarios;
  if (options?.tags && options.tags.length > 0) {
    filtered = scenarios.filter((s) =>
      s.tags.some((t) => options.tags!.includes(t)),
    );
  }

  const runId = Date.now().toString(36);
  const results: ScenarioResult[] = [];

  for (let i = 0; i < filtered.length; i++) {
    results.push(await runScenario(memory, filtered[i]!, runId, i));
  }

  return results;
}
