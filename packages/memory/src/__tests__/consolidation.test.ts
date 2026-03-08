import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/index", () => ({
  pool: { query: vi.fn() },
}));

vi.mock("../services/embedding", () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

vi.mock("../services/gemini", () => ({
  generateText: vi.fn().mockResolvedValue("Consolidated summary of memories."),
}));

import { pool } from "../db/index";
import { generateText } from "../services/gemini";
import { consolidateMemories } from "../services/consolidation";

describe("Consolidation Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty when no stale memories exist", async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    const result = await consolidateMemories(7, 50);

    expect(result).toEqual([]);
  });

  it("should consolidate and archive stale memories", async () => {
    // Return stale memories
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [
        {
          id: "1",
          namespace: "user:alice",
          content: "Old memory 1",
          created_at: new Date("2024-01-01"),
          importance: 0.5,
        },
        {
          id: "2",
          namespace: "user:alice",
          content: "Old memory 2",
          created_at: new Date("2024-01-02"),
          importance: 0.8,
        },
      ],
    } as any);

    // INSERT consolidated memory
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);
    // UPDATE archived
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);

    const result = await consolidateMemories(7, 50);

    expect(result).toHaveLength(1);
    expect(result[0]!.namespace).toBe("user:alice");
    expect(result[0]!.originalCount).toBe(2);
    expect(result[0]!.summary).toBeDefined();
    expect(result[0]!.archivedIds).toEqual(["1", "2"]);
    expect(generateText).toHaveBeenCalled();
  });

  it("should skip single-memory groups", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [
        {
          id: "1",
          namespace: "user:bob",
          content: "Only memory",
          created_at: new Date("2024-01-01"),
          importance: 0.5,
        },
      ],
    } as any);

    const result = await consolidateMemories(7, 50);

    expect(result).toEqual([]);
  });
});
