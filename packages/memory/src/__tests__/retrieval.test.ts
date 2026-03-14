import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MemoryDeps } from "../config";
import { retrieveMemories } from "../services/retrieval";

const mockPool = { query: vi.fn() };
const mockGenerateEmbedding = vi
  .fn()
  .mockResolvedValue(new Array(1536).fill(0.1));

const deps = {
  pool: mockPool,
  generateEmbedding: mockGenerateEmbedding,
} as unknown as Pick<MemoryDeps, "pool" | "generateEmbedding">;

describe("Retrieval Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return scored results", async () => {
    mockPool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            content: "Memory 1",
            tags: ["pref"],
            metadata: null,
            importance: 0.8,
            similarity: 0.9,
            recency: 0.5,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }); // last_accessed update

    const result = await retrieveMemories(
      deps,
      "agent-1",
      "user-alice",
      "test query",
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.score).toBeGreaterThan(0);
    expect(result[0]!.tags).toEqual(["pref"]);
  });

  it("should pass tag filter to SQL", async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await retrieveMemories(deps, "agent-1", "user-alice", "test", {
      tags: ["preference"],
      limit: 5,
    });

    const callArgs = mockPool.query.mock.calls[0]!;
    const sql = callArgs[0] as string;
    expect(sql).toContain("tags && $");
  });

  it("should pass minImportance filter to SQL", async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await retrieveMemories(deps, "agent-1", "user-alice", "test", {
      minImportance: 0.7,
      limit: 5,
    });

    const callArgs = mockPool.query.mock.calls[0]!;
    const sql = callArgs[0] as string;
    expect(sql).toContain("importance >= $");
  });

  it("should update last_accessed for retrieved memories", async () => {
    mockPool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "mem-1",
            content: "Test",
            tags: null,
            metadata: null,
            importance: "0.5",
            similarity: "0.8",
            recency: "0.5",
          },
        ],
      })
      .mockResolvedValue({ rows: [] });

    const results = await retrieveMemories(
      deps,
      "agent-1",
      "user-alice",
      "test query",
    );

    expect(results).toHaveLength(1);
    const updateCall = mockPool.query.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === "string" &&
        call[0].toLowerCase().includes("update memories set last_accessed"),
    );
    expect(updateCall).toBeDefined();
  });

  it("should accept numeric limit for backwards compat", async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await retrieveMemories(deps, "agent-1", "user-alice", "test", 5);

    const callArgs = mockPool.query.mock.calls[0]!;
    const params = callArgs[1] as any[];
    expect(params[params.length - 1]).toBe(5);
  });
});
