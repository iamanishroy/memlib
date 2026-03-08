import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MemoryDeps } from "../config";
import { consolidateMemories } from "../services/consolidation";

const mockPool = { query: vi.fn() };
const mockGenerateEmbedding = vi
  .fn()
  .mockResolvedValue(new Array(1536).fill(0.1));
const mockGenerateText = vi
  .fn()
  .mockResolvedValue("Consolidated summary of memories.");

const deps = {
  pool: mockPool,
  generateEmbedding: mockGenerateEmbedding,
  generateText: mockGenerateText,
} as unknown as Pick<MemoryDeps, "pool" | "generateEmbedding" | "generateText">;

describe("Consolidation Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty when no stale memories exist", async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    const result = await consolidateMemories(deps, 7, 50);

    expect(result).toEqual([]);
  });

  it("should consolidate and archive stale memories", async () => {
    mockPool.query.mockResolvedValueOnce({
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
    });

    mockPool.query.mockResolvedValueOnce({ rows: [] }); // INSERT
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // UPDATE

    const result = await consolidateMemories(deps, 7, 50);

    expect(result).toHaveLength(1);
    expect(result[0]!.namespace).toBe("user:alice");
    expect(result[0]!.originalCount).toBe(2);
    expect(result[0]!.summary).toBeDefined();
    expect(result[0]!.archivedIds).toEqual(["1", "2"]);
    expect(mockGenerateText).toHaveBeenCalled();
  });

  it("should skip single-memory groups", async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: "1",
          namespace: "user:bob",
          content: "Only memory",
          created_at: new Date("2024-01-01"),
          importance: 0.5,
        },
      ],
    });

    const result = await consolidateMemories(deps, 7, 50);

    expect(result).toEqual([]);
  });
});
