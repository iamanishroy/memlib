import type { MemLib } from "memlib";

const entity = "test-diffs-3";

export async function testDiffs(memlib: MemLib) {
  const t = new Date();
  const m1 = await memlib.store({
    entity,
    content: "I like vanilla ice cream",
  });

  console.log("m1", m1);

  const m2 = await memlib.store({
    entity,
    content:
      "I don't like vanilla ice cream anymore but now I like chocolate ice cream",
  });

  console.log("m2", m2);

  const diff1 = await memlib.diff({
    entity,
    since: t.toISOString(),
  });

  console.log(diff1);
}
