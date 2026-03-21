import type { ScenarioResult, ScenarioTag } from "./types";

// ─── ANSI colors ──────────────────────────────────────────────────

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  bgGreen: "\x1b[42m\x1b[30m",
  bgRed: "\x1b[41m\x1b[37m",
} as const;

function tagColor(tag: ScenarioTag): string {
  const map: Record<ScenarioTag, string> = {
    quality: c.cyan,
    dedup: c.yellow,
    conflict: c.magenta,
    recall: c.green,
    perf: c.gray,
    synthesis: c.cyan,
  };
  return map[tag] ?? c.dim;
}

// ─── Reporter ─────────────────────────────────────────────────────

export function printResults(results: ScenarioResult[]): void {
  const passed = results.filter((r) => r.validation.pass).length;
  const failed = results.length - passed;
  const totalDuration = results.reduce((s, r) => s + r.totalDurationMs, 0);
  const totalLlm = results.reduce((s, r) => s + r.totalLlmCalls, 0);

  console.log();
  console.log(
    `${c.bold}  ⚡ memlib benchmark${c.reset}  ${c.dim}─────────────────────────────────────${c.reset}`,
  );
  console.log();

  // ── Individual results ──────────────────────────────────────

  for (const result of results) {
    const icon = result.validation.pass
      ? `${c.green}✓${c.reset}`
      : `${c.red}✗${c.reset}`;

    const tags = result.tags
      .map((t) => `${tagColor(t)}${t}${c.reset}`)
      .join(` ${c.dim}·${c.reset} `);

    const duration = `${c.dim}${result.totalDurationMs}ms${c.reset}`;
    const llm =
      result.totalLlmCalls > 0
        ? `  ${c.dim}${result.totalLlmCalls} llm${c.reset}`
        : "";

    console.log(
      `  ${icon} ${c.bold}${result.name}${c.reset}  ${c.dim}[${c.reset}${tags}${c.dim}]${c.reset}  ${duration}${llm}`,
    );

    // Show reason on pass (dim) or fail (red)
    const reasonColor = result.validation.pass ? c.dim : c.red;
    console.log(
      `    ${reasonColor}${result.validation.reason}${c.reset}`,
    );
    console.log();
  }

  // ── Summary ─────────────────────────────────────────────────

  console.log(
    `${c.dim}  ─────────────────────────────────────────────────${c.reset}`,
  );
  console.log();

  // Score by category
  const byTag = new Map<ScenarioTag, { passed: number; total: number }>();
  for (const r of results) {
    for (const tag of r.tags) {
      const entry = byTag.get(tag) ?? { passed: 0, total: 0 };
      entry.total++;
      if (r.validation.pass) entry.passed++;
      byTag.set(tag, entry);
    }
  }

  console.log(`  ${c.bold}Scores${c.reset}`);
  for (const [tag, { passed: p, total: t }] of byTag) {
    const pct = Math.round((p / t) * 100);
    const bar = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));
    const color = pct === 100 ? c.green : pct >= 70 ? c.yellow : c.red;
    console.log(
      `    ${tagColor(tag)}${tag.padEnd(10)}${c.reset} ${color}${bar}${c.reset} ${color}${pct}%${c.reset} ${c.dim}(${p}/${t})${c.reset}`,
    );
  }

  console.log();

  // Totals
  const passColor = failed === 0 ? c.green : c.yellow;
  console.log(
    `  ${c.bold}Total${c.reset}     ${passColor}${passed} passed${c.reset}${failed > 0 ? `  ${c.red}${failed} failed${c.reset}` : ""}  ${c.dim}of ${results.length}${c.reset}`,
  );
  console.log(
    `  ${c.bold}Duration${c.reset}  ${c.dim}${(totalDuration / 1000).toFixed(1)}s${c.reset}`,
  );
  console.log(
    `  ${c.bold}LLM calls${c.reset} ${c.dim}${totalLlm} total${c.reset}`,
  );
  console.log();

  // Final badge
  if (failed === 0) {
    console.log(`  ${c.bgGreen} PASS ${c.reset} All ${results.length} scenarios passed`);
  } else {
    console.log(
      `  ${c.bgRed} FAIL ${c.reset} ${failed} of ${results.length} scenarios failed`,
    );
  }
  console.log();
}
