// ─── Benchmark Scenario Types ─────────────────────────────────────

export type ScenarioTag = "quality" | "dedup" | "conflict" | "recall" | "perf" | "synthesis";

export interface StoreStep {
  action: "store";
  content: string;
  entity?: string;
  infer?: boolean;
}

export interface RecallStep {
  action: "recall";
  query: string;
  entity?: string;
  category?: string;
}

export interface PrepareStep {
  action: "prepare";
  messages: { role: "user" | "assistant"; content: string }[];
  entity?: string;
}

export type Step = StoreStep | RecallStep | PrepareStep;

export interface Scenario {
  /** Short human-readable name */
  name: string;
  /** What this scenario tests */
  description: string;
  /** Tags for filtering */
  tags: ScenarioTag[];
  /** Steps to execute sequentially */
  steps: Step[];
  /** Validation function — receives all step results, returns pass/fail + reason */
  validate: (results: StepResult[], totalDurationMs?: number) => Validation;
}

// ─── Result Types ─────────────────────────────────────────────────

export interface StoreStepResult {
  action: "store";
  durationMs: number;
  llmCalls: number;
  memoriesCreated: number;
  skipped: number;
  conflicts: number;
  raw: unknown;
}

export interface RecallStepResult {
  action: "recall";
  durationMs: number;
  results: { content: string; score: number; category: string | null }[];
  raw: unknown;
}

export interface PrepareStepResult {
  action: "prepare";
  durationMs: number;
  context: string;
  memoriesUsed: number;
  candidatesConsidered: number;
  tokenCount: number;
  raw: unknown;
}

export type StepResult = StoreStepResult | RecallStepResult | PrepareStepResult;

export interface Validation {
  pass: boolean;
  reason: string;
}

export interface ScenarioResult {
  name: string;
  tags: ScenarioTag[];
  steps: StepResult[];
  validation: Validation;
  totalDurationMs: number;
  totalLlmCalls: number;
}
